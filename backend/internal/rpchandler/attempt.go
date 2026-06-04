package rpchandler

import (
	"context"

	"connectrpc.com/connect"
	pb "github.com/yumikokawaii/akashic/gen/akashic/v1"
	"github.com/yumikokawaii/akashic/gen/akashic/v1/akashicv1connect"
	"github.com/yumikokawaii/akashic/internal/service"
)

type AttemptServiceHandler struct {
	svc *service.AttemptService
}

var _ akashicv1connect.AttemptServiceHandler = (*AttemptServiceHandler)(nil)

func NewAttemptServiceHandler(svc *service.AttemptService) *AttemptServiceHandler {
	return &AttemptServiceHandler{svc: svc}
}

func (h *AttemptServiceHandler) ListAttemptsByTest(
	ctx context.Context,
	req *connect.Request[pb.ListAttemptsByTestRequest],
) (*connect.Response[pb.ListAttemptsByTestResponse], error) {
	attempts, err := h.svc.ListByTest(int(req.Msg.BankId), int(req.Msg.TestId))
	if err != nil {
		return nil, toConnectError(err)
	}
	pbAttempts := make([]*pb.Attempt, len(attempts))
	for i := range attempts {
		pbAttempts[i] = attemptToProto(&attempts[i])
	}
	return connect.NewResponse(&pb.ListAttemptsByTestResponse{Attempts: pbAttempts}), nil
}

func (h *AttemptServiceHandler) StartAttempt(
	ctx context.Context,
	req *connect.Request[pb.StartAttemptRequest],
) (*connect.Response[pb.StartAttemptResponse], error) {
	attempt, err := h.svc.Start(int(req.Msg.BankId), int(req.Msg.TestId), userIDFromContext(ctx))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.StartAttemptResponse{Attempt: attemptToProto(attempt)}), nil
}

func (h *AttemptServiceHandler) GetAttempt(
	ctx context.Context,
	req *connect.Request[pb.GetAttemptRequest],
) (*connect.Response[pb.GetAttemptResponse], error) {
	attempt, err := h.svc.GetByID(int(req.Msg.BankId), int(req.Msg.Id))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.GetAttemptResponse{Attempt: attemptToProto(attempt)}), nil
}

func (h *AttemptServiceHandler) SaveAttemptProgress(
	ctx context.Context,
	req *connect.Request[pb.SaveAttemptProgressRequest],
) (*connect.Response[pb.SaveAttemptProgressResponse], error) {
	attempt, err := h.svc.SaveProgress(int(req.Msg.BankId), int(req.Msg.Id), userIDFromContext(ctx), req.Msg.Answers)
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.SaveAttemptProgressResponse{Attempt: attemptToProto(attempt)}), nil
}

func (h *AttemptServiceHandler) SubmitAttempt(
	ctx context.Context,
	req *connect.Request[pb.SubmitAttemptRequest],
) (*connect.Response[pb.SubmitAttemptResponse], error) {
	attempt, err := h.svc.Submit(int(req.Msg.BankId), int(req.Msg.Id), userIDFromContext(ctx), service.SubmitAttemptInput{
		Answers: req.Msg.Answers,
	})
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.SubmitAttemptResponse{Attempt: attemptToProto(attempt)}), nil
}
