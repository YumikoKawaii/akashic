package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	historyTTL = 90 * 24 * time.Hour
	poolTTL    = 24 * time.Hour
)

type GenerateConfig struct {
	UserCooldownAttempts int
}

type PoolUnit struct {
	GroupID     int      `json:"g,omitempty"`
	QuestionIDs []int    `json:"q"`
	Difficulty  string   `json:"d"`
	Types       []string `json:"ty"`
	Tags        []string `json:"t,omitempty"`
}

func (u PoolUnit) Size() int { return len(u.QuestionIDs) }

type GenerateCache interface {
	PoolVersion(bankID int) int64
	GetPool(bankID int) ([]PoolUnit, bool)
	SetPool(bankID int, version int64, pool []PoolUnit)
	InvalidatePool(bankID int)
	BeginGeneration(userID, bankID int) (seq int, excluded map[int]struct{})
	RecordGeneration(userID, bankID, seq int, questionIDs []int)
}

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

func (c *redisCache) poolKey(bankID int) string { return fmt.Sprintf("pool:v2:%d", bankID) }

func (c *redisCache) seqKey(userID, bankID int) string {
	return fmt.Sprintf("history-seq:%d:%d", userID, bankID)
}

func (c *redisCache) historyKey(userID, bankID, seq int) string {
	return fmt.Sprintf("history:%d:%d:%d", userID, bankID, seq)
}

func (c *redisCache) versionKey(bankID int) string { return fmt.Sprintf("pool-ver:%d", bankID) }

type storedPool struct {
	Version int64      `json:"v"`
	Units   []PoolUnit `json:"u"`
}

func (c *redisCache) PoolVersion(bankID int) int64 {
	v, err := c.rdb.Get(context.Background(), c.versionKey(bankID)).Int64()
	if err != nil {
		return 0
	}
	return v
}

func (c *redisCache) GetPool(bankID int) ([]PoolUnit, bool) {
	vals, err := c.rdb.MGet(context.Background(), c.poolKey(bankID), c.versionKey(bankID)).Result()
	if err != nil || len(vals) != 2 {
		return nil, false
	}
	raw, ok := vals[0].(string)
	if !ok {
		return nil, false
	}
	var current int64
	if s, ok := vals[1].(string); ok {
		if _, err := fmt.Sscan(s, &current); err != nil {
			return nil, false
		}
	}
	var sp storedPool
	if err := json.Unmarshal([]byte(raw), &sp); err != nil || sp.Version != current {
		return nil, false
	}
	return sp.Units, true
}

func (c *redisCache) SetPool(bankID int, version int64, pool []PoolUnit) {
	if c.PoolVersion(bankID) != version {
		return
	}
	data, err := json.Marshal(storedPool{Version: version, Units: pool})
	if err != nil {
		return
	}
	c.rdb.Set(context.Background(), c.poolKey(bankID), data, poolTTL) //nolint:errcheck
}

func (c *redisCache) InvalidatePool(bankID int) {
	ctx := context.Background()
	c.rdb.Incr(ctx, c.versionKey(bankID)) //nolint:errcheck
	c.rdb.Del(ctx, c.poolKey(bankID))      //nolint:errcheck
}

func (c *redisCache) BeginGeneration(userID, bankID int) (int, map[int]struct{}) {
	excluded := make(map[int]struct{})
	if userID == 0 {
		return 0, excluded
	}
	ctx := context.Background()
	seq64, err := c.rdb.Incr(ctx, c.seqKey(userID, bankID)).Result()
	if err != nil {
		return 0, excluded
	}
	c.rdb.Expire(ctx, c.seqKey(userID, bankID), historyTTL) //nolint:errcheck
	seq := int(seq64)

	keys := make([]string, 0, c.config.UserCooldownAttempts)
	for i := seq - c.config.UserCooldownAttempts; i < seq; i++ {
		if i >= 1 {
			keys = append(keys, c.historyKey(userID, bankID, i))
		}
	}
	if len(keys) == 0 {
		return seq, excluded
	}
	vals, err := c.rdb.MGet(ctx, keys...).Result()
	if err != nil {
		return seq, excluded
	}
	for _, v := range vals {
		s, ok := v.(string)
		if !ok {
			continue
		}
		var ids []int
		if err := json.Unmarshal([]byte(s), &ids); err != nil {
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

type memCache struct {
	config GenerateConfig

	poolMu sync.RWMutex
	pools    map[int][]PoolUnit
	versions map[int]int64

	histMu  sync.Mutex
	seqs    map[[2]int]int
	history map[[3]int][]int
}

func NewMemCache(cfg GenerateConfig) GenerateCache {
	if cfg.UserCooldownAttempts <= 0 {
		cfg.UserCooldownAttempts = 3
	}
	return &memCache{
		config:  cfg,
		pools:    make(map[int][]PoolUnit),
		versions: make(map[int]int64),
		seqs:    make(map[[2]int]int),
		history: make(map[[3]int][]int),
	}
}

func (c *memCache) GetPool(bankID int) ([]PoolUnit, bool) {
	c.poolMu.RLock()
	defer c.poolMu.RUnlock()
	pool, ok := c.pools[bankID]
	if !ok {
		return nil, false
	}
	out := make([]PoolUnit, len(pool))
	copy(out, pool)
	return out, true
}

func (c *memCache) PoolVersion(bankID int) int64 {
	c.poolMu.RLock()
	defer c.poolMu.RUnlock()
	return c.versions[bankID]
}

func (c *memCache) SetPool(bankID int, version int64, pool []PoolUnit) {
	stored := make([]PoolUnit, len(pool))
	copy(stored, pool)
	c.poolMu.Lock()
	defer c.poolMu.Unlock()
	if c.versions[bankID] != version {
		return
	}
	c.pools[bankID] = stored
}

func (c *memCache) InvalidatePool(bankID int) {
	c.poolMu.Lock()
	c.versions[bankID]++
	delete(c.pools, bankID)
	c.poolMu.Unlock()
}

func (c *memCache) BeginGeneration(userID, bankID int) (int, map[int]struct{}) {
	excluded := make(map[int]struct{})
	if userID == 0 {
		return 0, excluded
	}
	c.histMu.Lock()
	defer c.histMu.Unlock()

	k := [2]int{userID, bankID}
	c.seqs[k]++
	seq := c.seqs[k]
	cooldown := c.config.UserCooldownAttempts

	delete(c.history, [3]int{userID, bankID, seq - cooldown - 1})
	for i := seq - cooldown; i < seq; i++ {
		for _, id := range c.history[[3]int{userID, bankID, i}] {
			excluded[id] = struct{}{}
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
	c.history[[3]int{userID, bankID, seq}] = stored
	c.histMu.Unlock()
}
