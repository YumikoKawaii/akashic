package membership

import "sync"

// memVisibilityCache is the in-memory fallback: a set of public bank IDs.
type memVisibilityCache struct {
	mu     sync.RWMutex
	public map[int]struct{}
}

func NewMemVisibilityCache() VisibilityCache {
	return &memVisibilityCache{public: make(map[int]struct{})}
}

func (c *memVisibilityCache) IsPublic(bankID int) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	_, ok := c.public[bankID]
	return ok
}

func (c *memVisibilityCache) SetPublic(bankID int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.public[bankID] = struct{}{}
}

func (c *memVisibilityCache) SetPrivate(bankID int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.public, bankID)
}

func (c *memVisibilityCache) Warm(publicBankIDs []int) {
	next := make(map[int]struct{}, len(publicBankIDs))
	for _, id := range publicBankIDs {
		next[id] = struct{}{}
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.public = next
}
