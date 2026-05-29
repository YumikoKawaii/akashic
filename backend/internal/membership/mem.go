package membership

import (
	"sync"

	"github.com/yumikokawaii/akashic/internal/model"
)

type key struct{ bankID, userID int }

// memRoleCache is the in-memory fallback implementation, used when Redis is
// unavailable at startup.
type memRoleCache struct {
	mu    sync.RWMutex
	roles map[key]string
}

func NewMemRoleCache() RoleCache {
	return &memRoleCache{roles: make(map[key]string)}
}

func (c *memRoleCache) Get(bankID, userID int) (string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	role, ok := c.roles[key{bankID, userID}]
	return role, ok
}

func (c *memRoleCache) Set(bankID, userID int, role string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.roles[key{bankID, userID}] = role
}

func (c *memRoleCache) Delete(bankID, userID int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.roles, key{bankID, userID})
}

func (c *memRoleCache) Warm(members []model.BankMember) {
	next := make(map[key]string, len(members))
	for _, m := range members {
		next[key{m.BankID, m.UserID}] = m.Role
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.roles = next
}
