package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"github.com/redis/go-redis/v9"
)

// GenerateConfig controls test generation deduplication behavior.
type GenerateConfig struct {
	// UserCooldownAttempts: a question won't appear for a user until this many
	// of their attempts have passed since it was last seen. Default: 3.
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

// GenerateCache stores per-user attempt history in Redis for cooldown deduplication.
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

func (c *GenerateCache) historyKey(userID, bankID int) string {
	return fmt.Sprintf("generate:history:%d:%d", userID, bankID)
}

// excludedForUser returns question IDs the user saw in their last
// UserCooldownAttempts attempts for a bank.
func (c *GenerateCache) excludedForUser(userID, bankID int) map[int]struct{} {
	ctx := context.Background()
	n := int64(c.config.UserCooldownAttempts)

	entries, err := c.rdb.LRange(ctx, c.historyKey(userID, bankID), -n, -1).Result()
	if err != nil {
		return map[int]struct{}{}
	}

	out := make(map[int]struct{})
	for _, entry := range entries {
		var ids []int
		if err := json.Unmarshal([]byte(entry), &ids); err != nil {
			continue
		}
		for _, id := range ids {
			out[id] = struct{}{}
		}
	}
	return out
}

// RecordAttempt stores the question IDs used in a new attempt for a user.
func (c *GenerateCache) RecordAttempt(userID, bankID int, questionIDs []int) {
	if userID == 0 || len(questionIDs) == 0 {
		return
	}

	data, err := json.Marshal(questionIDs)
	if err != nil {
		return
	}

	maxKeep := int64(c.config.UserCooldownAttempts * 2)
	if maxKeep < 10 {
		maxKeep = 10
	}

	ctx := context.Background()
	key := c.historyKey(userID, bankID)

	pipe := c.rdb.Pipeline()
	pipe.RPush(ctx, key, data)
	pipe.LTrim(ctx, key, -maxKeep, -1)
	pipe.Expire(ctx, key, 30*24*time.Hour)
	pipe.Exec(ctx) //nolint:errcheck
}

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
