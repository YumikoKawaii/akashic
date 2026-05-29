package rpchandler

import (
	"context"
	"strings"

	"connectrpc.com/connect"
	"github.com/yumikokawaii/akashic/gen/akashic/v1/akashicv1connect"
	svc "github.com/yumikokawaii/akashic/internal/service"
)

// AuthInterceptor validates JWT Bearer tokens for all procedures except ExchangeGoogleCode.
func AuthInterceptor(authSvc *svc.AuthService) connect.UnaryInterceptorFunc {
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

			claims, err := authSvc.ParseJWT(tokenStr)
			if err != nil {
				return nil, connect.NewError(connect.CodeUnauthenticated, nil)
			}

			return next(withClaims(ctx, claims), req)
		})
	})
}
