package rpchandler

import (
	"context"
	"time"

	"connectrpc.com/connect"
	pb "github.com/yumikokawaii/akashic/gen/akashic/v1"
	"github.com/yumikokawaii/akashic/gen/akashic/v1/akashicv1connect"
	svc "github.com/yumikokawaii/akashic/internal/service"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type AuthServiceHandler struct {
	svc *svc.AuthService
}

var _ akashicv1connect.AuthServiceHandler = (*AuthServiceHandler)(nil)

func NewAuthServiceHandler(s *svc.AuthService) *AuthServiceHandler {
	return &AuthServiceHandler{svc: s}
}

func (h *AuthServiceHandler) GetGoogleAuthURL(
	ctx context.Context,
	req *connect.Request[pb.GetGoogleAuthURLRequest],
) (*connect.Response[pb.GetGoogleAuthURLResponse], error) {
	url, state := h.svc.GetAuthURL()
	return connect.NewResponse(&pb.GetGoogleAuthURLResponse{Url: url, State: state}), nil
}

func (h *AuthServiceHandler) ExchangeGoogleCode(
	ctx context.Context,
	req *connect.Request[pb.ExchangeGoogleCodeRequest],
) (*connect.Response[pb.ExchangeGoogleCodeResponse], error) {
	user, token, err := h.svc.ExchangeCode(req.Msg.Code, req.Msg.RedirectUri)
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.ExchangeGoogleCodeResponse{
		Token: token,
		User:  userToProto(user),
	}), nil
}

func (h *AuthServiceHandler) GetMe(
	ctx context.Context,
	req *connect.Request[pb.GetMeRequest],
) (*connect.Response[pb.GetMeResponse], error) {
	claims := claimsFromContext(ctx)
	if claims == nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, nil)
	}
	pbUser := &pb.User{
		Id:        int32(claims.UserID),
		Email:     claims.Email,
		Name:      claims.Name,
		AvatarUrl: claims.AvatarURL,
		CreatedAt: timestamppb.New(time.Time{}),
		UpdatedAt: timestamppb.New(time.Time{}),
	}
	return connect.NewResponse(&pb.GetMeResponse{User: pbUser}), nil
}

func (h *AuthServiceHandler) Logout(
	ctx context.Context,
	req *connect.Request[pb.LogoutRequest],
) (*connect.Response[pb.LogoutResponse], error) {
	return connect.NewResponse(&pb.LogoutResponse{}), nil
}
