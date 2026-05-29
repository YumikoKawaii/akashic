package membership

import (
	"context"
	"log"
	"strconv"

	"github.com/redis/go-redis/v9"
)

// publicBanksKey is the Redis SET holding every public bank's ID. A shared set
// keeps all backend instances consistent without extra invalidation.
const publicBanksKey = "public_banks"

// redisVisibilityCache is the primary, cross-instance-consistent implementation.
type redisVisibilityCache struct {
	rdb *redis.Client
}

func NewRedisVisibilityCache(rdb *redis.Client) VisibilityCache {
	return &redisVisibilityCache{rdb: rdb}
}

func (c *redisVisibilityCache) IsPublic(bankID int) bool {
	ok, err := c.rdb.SIsMember(context.Background(), publicBanksKey, bankID).Result()
	if err != nil {
		// Fail closed: on a Redis error, treat the bank as private. Members are
		// unaffected (their access comes from RoleCache); only the implicit
		// public grant is withheld until Redis recovers.
		log.Printf("visibilitycache: redis sismember (bank=%d): %v", bankID, err)
		return false
	}
	return ok
}

func (c *redisVisibilityCache) SetPublic(bankID int) {
	c.rdb.SAdd(context.Background(), publicBanksKey, bankID) //nolint:errcheck
}

func (c *redisVisibilityCache) SetPrivate(bankID int) {
	c.rdb.SRem(context.Background(), publicBanksKey, bankID) //nolint:errcheck
}

func (c *redisVisibilityCache) Warm(publicBankIDs []int) {
	ctx := context.Background()
	pipe := c.rdb.TxPipeline()
	pipe.Del(ctx, publicBanksKey)
	if len(publicBankIDs) > 0 {
		members := make([]any, len(publicBankIDs))
		for i, id := range publicBankIDs {
			members[i] = strconv.Itoa(id)
		}
		pipe.SAdd(ctx, publicBanksKey, members...)
	}
	if _, err := pipe.Exec(ctx); err != nil {
		log.Printf("visibilitycache: redis warm: %v", err)
	}
}
