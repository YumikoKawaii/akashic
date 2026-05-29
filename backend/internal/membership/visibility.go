package membership

// VisibilityCache tracks which banks are public, so the authorization
// interceptor can grant an implicit viewer to non-members on public banks
// without a database round-trip. Like RoleCache it has a Redis-primary /
// in-memory-fallback pair (visibility_redis.go / visibility_mem.go), selected at
// startup, warmed once, and kept current by dual-writes from the bank service.
type VisibilityCache interface {
	IsPublic(bankID int) bool
	SetPublic(bankID int)
	SetPrivate(bankID int)
	Warm(publicBankIDs []int)
}
