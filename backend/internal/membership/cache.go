// Package membership holds the bank-role vocabulary and a RoleCache of
// (bank, user) → role used by the authorization interceptor to avoid a database
// round-trip on every request. The cache is warmed at startup and kept current
// by dual-writes from the bank service whenever a membership changes.
//
// Two implementations exist, selected at startup (see cmd/server/main.go):
// Redis is primary — being a shared store, it also keeps every backend instance
// consistent without extra invalidation — and an in-memory map is the fallback
// when Redis is unavailable.
package membership

import (
	"sync"

	"github.com/yumikokawaii/akashic/internal/model"
)

// Bank roles, ordered by privilege (see Level).
const (
	RoleViewer = "viewer"
	RoleEditor = "editor"
	RoleOwner  = "owner"
)

// Level maps a role to its privilege rank. An unknown or empty role (e.g. a
// non-member) ranks 0, below every real role.
func Level(role string) int {
	switch role {
	case RoleOwner:
		return 3
	case RoleEditor:
		return 2
	case RoleViewer:
		return 1
	default:
		return 0
	}
}

// RoleCache caches (bankID, userID) → role. A miss (ok == false) tells the
// caller to read through to the database. Implementations must be safe for
// concurrent use.
type RoleCache interface {
	Get(bankID, userID int) (role string, ok bool)
	Set(bankID, userID int, role string)
	Delete(bankID, userID int)
	Warm(members []model.BankMember)
}

type key struct{ bankID, userID int }

// memRoleCache is the in-memory fallback implementation.
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
