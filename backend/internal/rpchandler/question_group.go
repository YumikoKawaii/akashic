package rpchandler

import (
	"context"

	"connectrpc.com/connect"
	pb "github.com/yumikokawaii/akashic/gen/akashic/v1"
	"github.com/yumikokawaii/akashic/gen/akashic/v1/akashicv1connect"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/service"
)

type QuestionGroupServiceHandler struct {
	svc *service.QuestionGroupService
}

var _ akashicv1connect.QuestionGroupServiceHandler = (*QuestionGroupServiceHandler)(nil)

func NewQuestionGroupServiceHandler(svc *service.QuestionGroupService) *QuestionGroupServiceHandler {
	return &QuestionGroupServiceHandler{svc: svc}
}

func (h *QuestionGroupServiceHandler) ListQuestionGroups(
	ctx context.Context,
	req *connect.Request[pb.ListQuestionGroupsRequest],
) (*connect.Response[pb.ListQuestionGroupsResponse], error) {
	groups, err := h.svc.List(int(req.Msg.BankId), repository.GroupFilter{})
	if err != nil {
		return nil, toConnectError(err)
	}
	pbGroups := make([]*pb.QuestionGroup, len(groups))
	for i := range groups {
		pbGroups[i] = questionGroupToProto(&groups[i])
	}
	return connect.NewResponse(&pb.ListQuestionGroupsResponse{Groups: pbGroups}), nil
}

func (h *QuestionGroupServiceHandler) CreateQuestionGroup(
	ctx context.Context,
	req *connect.Request[pb.CreateQuestionGroupRequest],
) (*connect.Response[pb.CreateQuestionGroupResponse], error) {
	var passageID *int
	if req.Msg.PassageId != nil {
		v := int(*req.Msg.PassageId)
		passageID = &v
	}
	ctx2 := groupContextFromProto(req.Msg.Context)
	group, err := h.svc.Create(ctx, int(req.Msg.BankId), service.CreateGroupInput{
		CategoryID: int(req.Msg.CategoryId),
		PassageID:  passageID,
		Type:       questionTypeFromProto(req.Msg.Type),
		Difficulty: difficultyFromProto(req.Msg.Difficulty),
		Context:    ctx2,
		Questions:  []service.GroupQuestionInput{}, // questions added separately
	})
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.CreateQuestionGroupResponse{Group: questionGroupToProto(group)}), nil
}

func (h *QuestionGroupServiceHandler) GetQuestionGroup(
	ctx context.Context,
	req *connect.Request[pb.GetQuestionGroupRequest],
) (*connect.Response[pb.GetQuestionGroupResponse], error) {
	group, err := h.svc.GetByID(int(req.Msg.BankId), int(req.Msg.Id))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.GetQuestionGroupResponse{Group: questionGroupToProto(group)}), nil
}

func (h *QuestionGroupServiceHandler) UpdateQuestionGroup(
	ctx context.Context,
	req *connect.Request[pb.UpdateQuestionGroupRequest],
) (*connect.Response[pb.UpdateQuestionGroupResponse], error) {
	pbCtx := groupContextFromProto(req.Msg.Context)
	group, err := h.svc.Update(int(req.Msg.BankId), int(req.Msg.Id), service.UpdateGroupInput{
		Difficulty: difficultyFromProto(req.Msg.Difficulty),
		Context:    &pbCtx,
	})
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.UpdateQuestionGroupResponse{Group: questionGroupToProto(group)}), nil
}

func (h *QuestionGroupServiceHandler) DeleteQuestionGroup(
	ctx context.Context,
	req *connect.Request[pb.DeleteQuestionGroupRequest],
) (*connect.Response[pb.DeleteQuestionGroupResponse], error) {
	if err := h.svc.Delete(int(req.Msg.BankId), int(req.Msg.Id)); err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.DeleteQuestionGroupResponse{}), nil
}

func (h *QuestionGroupServiceHandler) RestoreQuestionGroup(
	ctx context.Context,
	req *connect.Request[pb.RestoreQuestionGroupRequest],
) (*connect.Response[pb.RestoreQuestionGroupResponse], error) {
	group, err := h.svc.Restore(int(req.Msg.BankId), int(req.Msg.Id))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.RestoreQuestionGroupResponse{Group: questionGroupToProto(group)}), nil
}
