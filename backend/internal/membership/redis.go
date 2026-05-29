package membership

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/yumikokawaii/akashic/internal/model"
)

// roleTTL backstops staleness. A shared Redis plus dual-writes propagate
// membership changes across instances immediately; the TTL only matters for the
// rare case of a membership changing while the whole system is down, after
// which a miss simply reads through to the database and repopulates.
const roleTTL = 24 * time.Hour

// redisRoleCache is the primary, cross-instance-consistent implementation.
type redisRoleCache struct {
	rdb *redis.Client
}

func NewRedisRoleCache(rdb *redis.Client) RoleCache {
	return &redisRoleCache{rdb: rdb}
}

func (c *redisRoleCache) roleKey(bankID, userID int) string {
	return fmt.Sprintf("bankrole:%d:%d", bankID, userID)
}

func (c *redisRoleCache) Get(bankID, userID int) (string, bool) {
	role, err := c.rdb.Get(context.Background(), c.roleKey(bankID, userID)).Result()
	if errors.Is(err, redis.Nil) {
		return "", false
	}
	if err != nil {
		// Treat any Redis error as a miss: the caller reads through to the DB,
		// so authorization stays correct (just slower) when Redis is degraded.
		log.Printf("rolecache: redis get (bank=%d user=%d): %v", bankID, userID, err)
		return "", false
	}
	return role, true
}

func (c *redisRoleCache) Set(bankID, userID int, role string) {
	c.rdb.Set(context.Background(), c.roleKey(bankID, userID), role, roleTTL) //nolint:errcheck
}

func (c *redisRoleCache) Delete(bankID, userID int) {
	c.rdb.Del(context.Background(), c.roleKey(bankID, userID)) //nolint:errcheck
}

func (c *redisRoleCache) Warm(members []model.BankMember) {
	ctx := context.Background()
	pipe := c.rdb.Pipeline()
	for _, m := range members {
		pipe.Set(ctx, c.roleKey(m.BankID, m.UserID), m.Role, roleTTL)
	}
	if _, err := pipe.Exec(ctx); err != nil {
		log.Printf("rolecache: redis warm: %v", err)
	}
}
