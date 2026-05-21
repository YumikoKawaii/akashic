package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"github.com/redis/go-redis/v9"
)

const historyTTL = 90 * 24 * time.Hour

// GenerateConfig controls test generation deduplication behavior.
type GenerateConfig struct {
	// UserCooldownAttempts: a question won't appear for a user until this many
	// of their tests have passed since it was last seen. Default: 3.
	UserCooldownAttempts int
}

// CachedQuestion holds the minimal fields needed for pool filtering and selection.
type CachedQuestion struct {
	ID         int
	Difficulty string
	CategoryID *int
	Type       string
	Tags       []string
	GroupID    *int // nil = standalone
}

// GenerateCache manages the standalone question pool cache and per-user generation history.
type GenerateCache struct {
	rdb    *redis.Client
	config GenerateConfig
}

func NewGenerateCache(rdb *redis.Client, cfg GenerateConfig) *GenerateCache {
	if cfg.UserCooldownAttempts <= 0 {
		cfg.UserCooldownAttempts = 3
	}
	return &GenerateCache{rdb: rdb, config: cfg}
}

// ── Pool cache ─────────────────────────────────────────────────────────────────

func (c *GenerateCache) poolKey(bankID int) string {
	return fmt.Sprintf("pool:%d", bankID)
}

// WarmupPool stores the full standalone pool for a bank. Called on startup.
func (c *GenerateCache) WarmupPool(bankID int, pool []CachedQuestion) {
	data, err := json.Marshal(pool)
	if err != nil {
		return
	}
	c.rdb.Set(context.Background(), c.poolKey(bankID), data, 0) //nolint:errcheck
}

// GetPool returns the cached pool for a bank, and false on a cache miss.
func (c *GenerateCache) GetPool(bankID int) ([]CachedQuestion, bool) {
	data, err := c.rdb.Get(context.Background(), c.poolKey(bankID)).Bytes()
	if err != nil {
		return nil, false
	}
	var pool []CachedQuestion
	if err := json.Unmarshal(data, &pool); err != nil {
		return nil, false
	}
	return pool, true
}

// AddToPool appends a newly created standalone question to the bank's pool.
// Grouped questions are ignored — they are not part of the standalone pool.
func (c *GenerateCache) AddToPool(bankID int, q CachedQuestion) {
	if q.GroupID != nil {
		return
	}
	pool, ok := c.GetPool(bankID)
	if !ok {
		return
	}
	c.WarmupPool(bankID, append(pool, q))
}

// UpdateInPool replaces a question's entry in the pool after an update.
func (c *GenerateCache) UpdateInPool(bankID int, q CachedQuestion) {
	if q.GroupID != nil {
		return
	}
	pool, ok := c.GetPool(bankID)
	if !ok {
		return
	}
	for i, existing := range pool {
		if existing.ID == q.ID {
			pool[i] = q
			break
		}
	}
	c.WarmupPool(bankID, pool)
}

// RemoveFromPool removes a question from the pool on soft delete.
func (c *GenerateCache) RemoveFromPool(bankID, questionID int) {
	pool, ok := c.GetPool(bankID)
	if !ok {
		return
	}
	out := make([]CachedQuestion, 0, len(pool))
	for _, q := range pool {
		if q.ID != questionID {
			out = append(out, q)
		}
	}
	c.WarmupPool(bankID, out)
}

// ── User generation history ────────────────────────────────────────────────────

func (c *GenerateCache) seqKey(userID, bankID int) string {
	return fmt.Sprintf("history:%d:%d:seq", userID, bankID)
}

func (c *GenerateCache) historyKey(userID, bankID, seq int) string {
	return fmt.Sprintf("history:%d:%d:%d", userID, bankID, seq)
}

// BeginGeneration atomically increments the per-user seq counter, deletes the
// one key that just fell outside the cooldown window, and returns the new seq
// plus the excluded question IDs from the last cooldown tests.
func (c *GenerateCache) BeginGeneration(userID, bankID int) (int, map[int]struct{}) {
	if userID == 0 {
		return 0, map[int]struct{}{}
	}
	ctx := context.Background()

	n, err := c.rdb.Incr(ctx, c.seqKey(userID, bankID)).Result()
	if err != nil {
		return 0, map[int]struct{}{}
	}
	seq := int(n)
	c.rdb.Expire(ctx, c.seqKey(userID, bankID), historyTTL) //nolint:errcheck

	cooldown := c.config.UserCooldownAttempts

	// Delete the one key that just expired (seq - cooldown - 1).
	if expired := seq - cooldown - 1; expired >= 1 {
		c.rdb.Del(ctx, c.historyKey(userID, bankID, expired)) //nolint:errcheck
	}

	// Build excluded set from the last cooldown test keys (seq-cooldown to seq-1).
	keys := make([]string, 0, cooldown)
	for i := seq - cooldown; i < seq; i++ {
		if i >= 1 {
			keys = append(keys, c.historyKey(userID, bankID, i))
		}
	}
	if len(keys) == 0 {
		return seq, map[int]struct{}{}
	}

	vals, err := c.rdb.MGet(ctx, keys...).Result()
	if err != nil {
		return seq, map[int]struct{}{}
	}

	excluded := make(map[int]struct{})
	for _, v := range vals {
		if v == nil {
			continue
		}
		var ids []int
		if err := json.Unmarshal([]byte(v.(string)), &ids); err != nil {
			continue
		}
		for _, id := range ids {
			excluded[id] = struct{}{}
		}
	}
	return seq, excluded
}

// RecordGeneration stores the standalone question IDs used in a test for future exclusion.
func (c *GenerateCache) RecordGeneration(userID, bankID, seq int, questionIDs []int) {
	if userID == 0 || seq == 0 || len(questionIDs) == 0 {
		return
	}
	data, err := json.Marshal(questionIDs)
	if err != nil {
		return
	}
	c.rdb.Set(context.Background(), c.historyKey(userID, bankID, seq), data, historyTTL) //nolint:errcheck
}

// ── Pool selection helpers (pure functions) ────────────────────────────────────

// filterPool filters the pool by config constraints, returning standalone questions grouped by difficulty.
func filterPool(pool []CachedQuestion, categoryIDs []int, types []string, tags []string) map[string][]CachedQuestion {
	out := map[string][]CachedQuestion{"easy": nil, "medium": nil, "hard": nil}

	catSet := make(map[int]struct{}, len(categoryIDs))
	for _, id := range categoryIDs {
		catSet[id] = struct{}{}
	}
	typeSet := make(map[string]struct{}, len(types))
	for _, t := range types {
		typeSet[t] = struct{}{}
	}
	tagSet := make(map[string]struct{}, len(tags))
	for _, t := range tags {
		tagSet[t] = struct{}{}
	}

	for _, q := range pool {
		if q.GroupID != nil {
			continue
		}
		if len(catSet) > 0 {
			if q.CategoryID == nil {
				continue
			}
			if _, ok := catSet[*q.CategoryID]; !ok {
				continue
			}
		}
		if len(typeSet) > 0 {
			if _, ok := typeSet[q.Type]; !ok {
				continue
			}
		}
		if len(tagSet) > 0 {
			matched := false
			for _, t := range q.Tags {
				if _, ok := tagSet[t]; ok {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}
		out[q.Difficulty] = append(out[q.Difficulty], q)
	}
	return out
}

// available returns questions from pool not in the alreadyPicked set.
func available(pool []CachedQuestion, alreadyPicked map[int]struct{}) []CachedQuestion {
	out := make([]CachedQuestion, 0, len(pool))
	for _, q := range pool {
		if _, ok := alreadyPicked[q.ID]; !ok {
			out = append(out, q)
		}
	}
	return out
}

// pickRandom selects up to n items, preferring questions not in excluded.
func pickRandom(pool []CachedQuestion, excluded map[int]struct{}, n int) []CachedQuestion {
	if n <= 0 || len(pool) == 0 {
		return nil
	}
	fresh := make([]CachedQuestion, 0, len(pool))
	stale := make([]CachedQuestion, 0)
	for _, q := range pool {
		if _, ex := excluded[q.ID]; ex {
			stale = append(stale, q)
		} else {
			fresh = append(fresh, q)
		}
	}
	rand.Shuffle(len(fresh), func(i, j int) { fresh[i], fresh[j] = fresh[j], fresh[i] })
	if len(fresh) >= n {
		return fresh[:n]
	}
	rand.Shuffle(len(stale), func(i, j int) { stale[i], stale[j] = stale[j], stale[i] })
	result := append(fresh, stale...)
	if len(result) > n {
		return result[:n]
	}
	return result
}
