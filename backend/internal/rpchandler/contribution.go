package rpchandler

import (
	"context"

	"connectrpc.com/connect"
	pb "github.com/yumikokawaii/akashic/gen/akashic/v1"
	"github.com/yumikokawaii/akashic/gen/akashic/v1/akashicv1connect"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/service"
)

type ContributionServiceHandler struct {
	svc *service.ContributionService
}

var _ akashicv1connect.ContributionServiceHandler = (*ContributionServiceHandler)(nil)

func NewContributionServiceHandler(svc *service.ContributionService) *ContributionServiceHandler {
	return &ContributionServiceHandler{svc: svc}
}

func (h *ContributionServiceHandler) SubmitContribution(
	ctx context.Context,
	req *connect.Request[pb.SubmitContributionRequest],
) (*connect.Response[pb.SubmitContributionResponse], error) {
	c, err := h.svc.Submit(int(req.Msg.BankId), userIDFromContext(ctx), proposedQuestionFromProto(req.Msg.Proposed))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.SubmitContributionResponse{Contribution: contributionToProto(c)}), nil
}

func (h *ContributionServiceHandler) UpdateContribution(
	ctx context.Context,
	req *connect.Request[pb.UpdateContributionRequest],
) (*connect.Response[pb.UpdateContributionResponse], error) {
	c, err := h.svc.Update(ctx, int(req.Msg.BankId), userIDFromContext(ctx), int(req.Msg.Id), proposedQuestionFromProto(req.Msg.Proposed))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.UpdateContributionResponse{Contribution: contributionToProto(c)}), nil
}

func (h *ContributionServiceHandler) ListMyContributions(
	ctx context.Context,
	req *connect.Request[pb.ListMyContributionsRequest],
) (*connect.Response[pb.ListMyContributionsResponse], error) {
	cs, err := h.svc.ListMine(int(req.Msg.BankId), userIDFromContext(ctx))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.ListMyContributionsResponse{Contributions: contributionsToProto(cs)}), nil
}

func (h *ContributionServiceHandler) WithdrawContribution(
	ctx context.Context,
	req *connect.Request[pb.WithdrawContributionRequest],
) (*connect.Response[pb.WithdrawContributionResponse], error) {
	if err := h.svc.Withdraw(int(req.Msg.BankId), userIDFromContext(ctx), int(req.Msg.Id)); err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.WithdrawContributionResponse{}), nil
}

func (h *ContributionServiceHandler) MergeContribution(
	ctx context.Context,
	req *connect.Request[pb.MergeContributionRequest],
) (*connect.Response[pb.MergeContributionResponse], error) {
	c, err := h.svc.Merge(ctx, int(req.Msg.BankId), userIDFromContext(ctx), int(req.Msg.Id))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.MergeContributionResponse{Contribution: contributionToProto(c)}), nil
}

func (h *ContributionServiceHandler) ListContributions(
	ctx context.Context,
	req *connect.Request[pb.ListContributionsRequest],
) (*connect.Response[pb.ListContributionsResponse], error) {
	cs, err := h.svc.List(int(req.Msg.BankId), contributionStatusFromProto(req.Msg.Status))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.ListContributionsResponse{Contributions: contributionsToProto(cs)}), nil
}

func (h *ContributionServiceHandler) ReviewContribution(
	ctx context.Context,
	req *connect.Request[pb.ReviewContributionRequest],
) (*connect.Response[pb.ReviewContributionResponse], error) {
	decision := eventTypeFromProto(req.Msg.Decision)
	if decision == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, nil)
	}
	c, err := h.svc.Review(ctx, int(req.Msg.BankId), userIDFromContext(ctx), int(req.Msg.Id), decision)
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.ReviewContributionResponse{Contribution: contributionToProto(c)}), nil
}

func (h *ContributionServiceHandler) AddContributionComment(
	ctx context.Context,
	req *connect.Request[pb.AddContributionCommentRequest],
) (*connect.Response[pb.AddContributionCommentResponse], error) {
	c, err := h.svc.AddComment(int(req.Msg.BankId), userIDFromContext(ctx), int(req.Msg.Id), req.Msg.Body)
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.AddContributionCommentResponse{Contribution: contributionToProto(c)}), nil
}

func contributionsToProto(cs []model.Contribution) []*pb.Contribution {
	out := make([]*pb.Contribution, len(cs))
	for i := range cs {
		out[i] = contributionToProto(&cs[i])
	}
	return out
}
