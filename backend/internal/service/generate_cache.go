package service

import (
	"math/rand"
	"sync"
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

type attemptRecord struct {
	ids map[int]struct{}
}

// GenerateCache holds in-memory question pools and per-user attempt history.
// Designed for single-pod deployment; no external cache required.
// All methods are safe for concurrent use.
type GenerateCache struct {
	mu      sync.RWMutex
	config  GenerateConfig
	pools   map[int][]CachedQuestion        // bankID → question pool
	history map[int]map[int][]attemptRecord // userID → bankID → recent attempts
}

func NewGenerateCache(cfg GenerateConfig) *GenerateCache {
	if cfg.UserCooldownAttempts <= 0 {
		cfg.UserCooldownAttempts = 3
	}
	return &GenerateCache{
		config:  cfg,
		pools:   make(map[int][]CachedQuestion),
		history: make(map[int]map[int][]attemptRecord),
	}
}

// InvalidateBank clears the question pool for a bank.
// Must be called after any question is created, updated, or deleted.
func (c *GenerateCache) InvalidateBank(bankID int) {
	c.mu.Lock()
	delete(c.pools, bankID)
	c.mu.Unlock()
}

func (c *GenerateCache) setPool(bankID int, questions []CachedQuestion) {
	c.mu.Lock()
	c.pools[bankID] = questions
	c.mu.Unlock()
}

func (c *GenerateCache) getPool(bankID int) ([]CachedQuestion, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	qs, ok := c.pools[bankID]
	return qs, ok
}

// excludedForUser returns question IDs the user saw in their last
// UserCooldownAttempts attempts for a bank.
func (c *GenerateCache) excludedForUser(userID, bankID int) map[int]struct{} {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make(map[int]struct{})
	if bankMap, ok := c.history[userID]; ok {
		if records, ok := bankMap[bankID]; ok {
			n := c.config.UserCooldownAttempts
			start := len(records) - n
			if start < 0 {
				start = 0
			}
			for _, rec := range records[start:] {
				for id := range rec.ids {
					out[id] = struct{}{}
				}
			}
		}
	}
	return out
}

// RecordAttempt stores the question IDs used in a new attempt for a user.
func (c *GenerateCache) RecordAttempt(userID, bankID int, questionIDs []int) {
	if userID == 0 || len(questionIDs) == 0 {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.history[userID] == nil {
		c.history[userID] = make(map[int][]attemptRecord)
	}
	rec := attemptRecord{ids: make(map[int]struct{}, len(questionIDs))}
	for _, id := range questionIDs {
		rec.ids[id] = struct{}{}
	}
	records := append(c.history[userID][bankID], rec)
	// Keep a bounded window: cooldown*2 records, minimum 10
	maxKeep := c.config.UserCooldownAttempts * 2
	if maxKeep < 10 {
		maxKeep = 10
	}
	if len(records) > maxKeep {
		records = records[len(records)-maxKeep:]
	}
	c.history[userID][bankID] = records
}

// filterPool filters the cached pool by the config constraints and groups
// matching questions by difficulty. Only standalone questions (GroupID == nil)
// are included.
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
			continue // standalone only
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

// available returns questions from pool that are not in the alreadyPicked set.
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
// Falls back to excluded (stale) ones if fresh questions are insufficient.
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
