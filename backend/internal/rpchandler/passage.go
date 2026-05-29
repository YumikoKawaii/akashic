package rpchandler

import (
	"context"

	"connectrpc.com/connect"
	pb "github.com/yumikokawaii/akashic/gen/akashic/v1"
	"github.com/yumikokawaii/akashic/gen/akashic/v1/akashicv1connect"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/service"
)

type PassageServiceHandler struct {
	svc *service.PassageService
}

var _ akashicv1connect.PassageServiceHandler = (*PassageServiceHandler)(nil)

func NewPassageServiceHandler(svc *service.PassageService) *PassageServiceHandler {
	return &PassageServiceHandler{svc: svc}
}

func (h *PassageServiceHandler) ListPassages(
	ctx context.Context,
	req *connect.Request[pb.ListPassagesRequest],
) (*connect.Response[pb.ListPassagesResponse], error) {
	passages, err := h.svc.List(int(req.Msg.BankId), repository.PassageFilter{})
	if err != nil {
		return nil, toConnectError(err)
	}
	pbPassages := make([]*pb.Passage, len(passages))
	for i := range passages {
		pbPassages[i] = passageToProto(&passages[i])
	}
	return connect.NewResponse(&pb.ListPassagesResponse{Passages: pbPassages}), nil
}

func (h *PassageServiceHandler) CreatePassage(
	ctx context.Context,
	req *connect.Request[pb.CreatePassageRequest],
) (*connect.Response[pb.CreatePassageResponse], error) {
	passage, err := h.svc.Create(int(req.Msg.BankId), service.CreatePassageInput{
		CategoryID: int(req.Msg.CategoryId),
		Title:      req.Msg.Title,
		Paragraphs: paragraphsFromProto(req.Msg.Paragraphs),
		Difficulty: difficultyFromProto(req.Msg.Difficulty),
	})
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.CreatePassageResponse{Passage: passageToProto(passage)}), nil
}

func (h *PassageServiceHandler) GetPassage(
	ctx context.Context,
	req *connect.Request[pb.GetPassageRequest],
) (*connect.Response[pb.GetPassageResponse], error) {
	passage, err := h.svc.GetByID(int(req.Msg.BankId), int(req.Msg.Id))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.GetPassageResponse{Passage: passageToProto(passage)}), nil
}

func (h *PassageServiceHandler) UpdatePassage(
	ctx context.Context,
	req *connect.Request[pb.UpdatePassageRequest],
) (*connect.Response[pb.UpdatePassageResponse], error) {
	catID := int(req.Msg.CategoryId)
	passage, err := h.svc.Update(int(req.Msg.BankId), int(req.Msg.Id), service.UpdatePassageInput{
		CategoryID: &catID,
		Title:      req.Msg.Title,
		Paragraphs: paragraphsFromProto(req.Msg.Paragraphs),
		Difficulty: difficultyFromProto(req.Msg.Difficulty),
	})
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.UpdatePassageResponse{Passage: passageToProto(passage)}), nil
}

func (h *PassageServiceHandler) DeletePassage(
	ctx context.Context,
	req *connect.Request[pb.DeletePassageRequest],
) (*connect.Response[pb.DeletePassageResponse], error) {
	if err := h.svc.Delete(int(req.Msg.BankId), int(req.Msg.Id)); err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.DeletePassageResponse{}), nil
}

func (h *PassageServiceHandler) RestorePassage(
	ctx context.Context,
	req *connect.Request[pb.RestorePassageRequest],
) (*connect.Response[pb.RestorePassageResponse], error) {
	passage, err := h.svc.Restore(int(req.Msg.BankId), int(req.Msg.Id))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.RestorePassageResponse{Passage: passageToProto(passage)}), nil
}
