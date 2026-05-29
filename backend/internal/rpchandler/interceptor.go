package rpchandler

import (
	"context"
	"strings"

	"connectrpc.com/connect"
	"github.com/yumikokawaii/akashic/gen/akashic/v1/akashicv1connect"
	svc "github.com/yumikokawaii/akashic/internal/service"
)

// Authenticator validates JWT Bearer tokens and injects the caller's claims into
// the request context. Verification is pure HMAC (no DB or network call), so it
// adds negligible latency per request.
type Authenticator struct {
	authSvc *svc.AuthService
}

func NewAuthenticator(authSvc *svc.AuthService) *Authenticator {
	return &Authenticator{authSvc: authSvc}
}

// AuthnInterceptor authenticates every procedure except the two unauthenticated
// Google-auth ones.
func (a *Authenticator) AuthnInterceptor() connect.UnaryInterceptorFunc {
	return connect.UnaryInterceptorFunc(func(next connect.UnaryFunc) connect.UnaryFunc {
		return connect.UnaryFunc(func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			switch req.Spec().Procedure {
			case akashicv1connect.AuthServiceGetGoogleAuthURLProcedure,
				akashicv1connect.AuthServiceExchangeGoogleCodeProcedure:
				return next(ctx, req)
			}

			authHeader := req.Header().Get("Authorization")
			tokenStr, found := strings.CutPrefix(authHeader, "Bearer ")
			if !found || tokenStr == "" {
				return nil, connect.NewError(connect.CodeUnauthenticated, nil)
			}

			claims, err := a.authSvc.ParseJWT(tokenStr)
			if err != nil {
				return nil, connect.NewError(connect.CodeUnauthenticated, nil)
			}

			return next(withClaims(ctx, claims), req)
		})
	})
}
