package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

const historyTTL = 90 * 24 * time.Hour

// GenerateConfig controls test generation deduplication behavior.
type GenerateConfig struct {
	UserCooldownAttempts int // default: 3
}

// CachedQuestion holds the minimal fields needed for pool filtering and selection.
type CachedQuestion struct {
	ID         int
	Difficulty string
	CategoryID *int
	Type       string
	Tags       []string
}

// GenerateCache is the interface for pool caching and per-user generation history.
type GenerateCache interface {
	// Pool
	WarmupPool(bankID int, pool []CachedQuestion)
	GetPool(bankID int) ([]CachedQuestion, bool)
	AddToPool(bankID int, q CachedQuestion)
	UpdateInPool(bankID int, q CachedQuestion)
	RemoveFromPool(bankID, questionID int)
	// History
	BeginGeneration(userID, bankID int) (seq int, excluded map[int]struct{})
	RecordGeneration(userID, bankID, seq int, questionIDs []int)
}

// ── Redis implementation ───────────────────────────────────────────────────────

type redisCache struct {
	rdb    *redis.Client
	config GenerateConfig
}

func NewRedisCache(rdb *redis.Client, cfg GenerateConfig) GenerateCache {
	if cfg.UserCooldownAttempts <= 0 {
		cfg.UserCooldownAttempts = 3
	}
	return &redisCache{rdb: rdb, config: cfg}
}

func (c *redisCache) poolKey(bankID int) string {
	return fmt.Sprintf("pool:%d", bankID)
}

func (c *redisCache) seqKey(userID, bankID int) string {
	return fmt.Sprintf("history:%d:%d:seq", userID, bankID)
}

func (c *redisCache) historyKey(userID, bankID, seq int) string {
	return fmt.Sprintf("history:%d:%d:%d", userID, bankID, seq)
}

func (c *redisCache) WarmupPool(bankID int, pool []CachedQuestion) {
	data, err := json.Marshal(pool)
	if err != nil {
		return
	}
	c.rdb.Set(context.Background(), c.poolKey(bankID), data, 0) //nolint:errcheck
}

func (c *redisCache) GetPool(bankID int) ([]CachedQuestion, bool) {
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

func (c *redisCache) AddToPool(bankID int, q CachedQuestion) {
	pool, ok := c.GetPool(bankID)
	if !ok {
		return
	}
	c.WarmupPool(bankID, append(pool, q))
}

func (c *redisCache) UpdateInPool(bankID int, q CachedQuestion) {
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

func (c *redisCache) RemoveFromPool(bankID, questionID int) {
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

func (c *redisCache) BeginGeneration(userID, bankID int) (int, map[int]struct{}) {
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
	if expired := seq - cooldown - 1; expired >= 1 {
		c.rdb.Del(ctx, c.historyKey(userID, bankID, expired)) //nolint:errcheck
	}

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

func (c *redisCache) RecordGeneration(userID, bankID, seq int, questionIDs []int) {
	if userID == 0 || seq == 0 || len(questionIDs) == 0 {
		return
	}
	data, err := json.Marshal(questionIDs)
	if err != nil {
		return
	}
	c.rdb.Set(context.Background(), c.historyKey(userID, bankID, seq), data, historyTTL) //nolint:errcheck
}

// ── In-memory fallback implementation ─────────────────────────────────────────

type memCache struct {
	config GenerateConfig

	poolMu sync.RWMutex
	pools  map[int][]CachedQuestion

	histMu  sync.Mutex
	seqs    map[string]int    // "userID:bankID" → current seq
	history map[string][]int  // "userID:bankID:seq" → question IDs
}

func NewMemCache(cfg GenerateConfig) GenerateCache {
	if cfg.UserCooldownAttempts <= 0 {
		cfg.UserCooldownAttempts = 3
	}
	return &memCache{
		config:  cfg,
		pools:   make(map[int][]CachedQuestion),
		seqs:    make(map[string]int),
		history: make(map[string][]int),
	}
}

func (c *memCache) WarmupPool(bankID int, pool []CachedQuestion) {
	stored := make([]CachedQuestion, len(pool))
	copy(stored, pool)
	c.poolMu.Lock()
	c.pools[bankID] = stored
	c.poolMu.Unlock()
}

func (c *memCache) GetPool(bankID int) ([]CachedQuestion, bool) {
	c.poolMu.RLock()
	pool, ok := c.pools[bankID]
	c.poolMu.RUnlock()
	if !ok {
		return nil, false
	}
	result := make([]CachedQuestion, len(pool))
	copy(result, pool)
	return result, true
}

func (c *memCache) AddToPool(bankID int, q CachedQuestion) {
	c.poolMu.Lock()
	c.pools[bankID] = append(c.pools[bankID], q)
	c.poolMu.Unlock()
}

func (c *memCache) UpdateInPool(bankID int, q CachedQuestion) {
	c.poolMu.Lock()
	for i, existing := range c.pools[bankID] {
		if existing.ID == q.ID {
			c.pools[bankID][i] = q
			break
		}
	}
	c.poolMu.Unlock()
}

func (c *memCache) RemoveFromPool(bankID, questionID int) {
	c.poolMu.Lock()
	pool := c.pools[bankID]
	out := make([]CachedQuestion, 0, len(pool))
	for _, q := range pool {
		if q.ID != questionID {
			out = append(out, q)
		}
	}
	c.pools[bankID] = out
	c.poolMu.Unlock()
}

func (c *memCache) BeginGeneration(userID, bankID int) (int, map[int]struct{}) {
	if userID == 0 {
		return 0, map[int]struct{}{}
	}

	c.histMu.Lock()
	defer c.histMu.Unlock()

	sk := fmt.Sprintf("%d:%d", userID, bankID)
	c.seqs[sk]++
	seq := c.seqs[sk]

	cooldown := c.config.UserCooldownAttempts
	if expired := seq - cooldown - 1; expired >= 1 {
		delete(c.history, fmt.Sprintf("%d:%d:%d", userID, bankID, expired))
	}

	excluded := make(map[int]struct{})
	for i := seq - cooldown; i < seq; i++ {
		if i >= 1 {
			for _, id := range c.history[fmt.Sprintf("%d:%d:%d", userID, bankID, i)] {
				excluded[id] = struct{}{}
			}
		}
	}
	return seq, excluded
}

func (c *memCache) RecordGeneration(userID, bankID, seq int, questionIDs []int) {
	if userID == 0 || seq == 0 || len(questionIDs) == 0 {
		return
	}
	stored := make([]int, len(questionIDs))
	copy(stored, questionIDs)
	c.histMu.Lock()
	c.history[fmt.Sprintf("%d:%d:%d", userID, bankID, seq)] = stored
	c.histMu.Unlock()
}

// ── Pool selection helpers (pure functions) ────────────────────────────────────

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

func available(pool []CachedQuestion, alreadyPicked map[int]struct{}) []CachedQuestion {
	out := make([]CachedQuestion, 0, len(pool))
	for _, q := range pool {
		if _, ok := alreadyPicked[q.ID]; !ok {
			out = append(out, q)
		}
	}
	return out
}

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
