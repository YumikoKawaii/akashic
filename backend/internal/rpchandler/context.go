package rpchandler

import (
	"context"

	svc "github.com/yumikokawaii/akashic/internal/service"
)

type ctxKey string

const ctxClaimsKey ctxKey = "claims"
const ctxRoleKey ctxKey = "bankRole"

// withRole stores the caller's membership role on the request's target bank, as
// resolved by the authorization interceptor ("" for a non-member). Handlers read
// it via roleFromContext for fine-grained checks the single per-procedure floor
// can't express (e.g. "creator OR editor").
func withRole(ctx context.Context, role string) context.Context {
	return context.WithValue(ctx, ctxRoleKey, role)
}

func roleFromContext(ctx context.Context) string {
	v, _ := ctx.Value(ctxRoleKey).(string)
	return v
}

func claimsFromContext(ctx context.Context) *svc.JWTClaims {
	v, _ := ctx.Value(ctxClaimsKey).(*svc.JWTClaims)
	return v
}

func withClaims(ctx context.Context, claims *svc.JWTClaims) context.Context {
	return context.WithValue(ctx, ctxClaimsKey, claims)
}

func userIDFromContext(ctx context.Context) int {
	if c := claimsFromContext(ctx); c != nil {
		return c.UserID
	}
	return 0
}
