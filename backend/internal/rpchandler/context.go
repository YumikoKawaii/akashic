package rpchandler

import (
	"context"

	svc "github.com/yumikokawaii/akashic/internal/service"
)

type ctxKey string

const ctxClaimsKey ctxKey = "claims"

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
