package rpchandler

import (
	"context"

	"connectrpc.com/connect"
	pb "github.com/yumikokawaii/akashic/gen/akashic/v1"
	"github.com/yumikokawaii/akashic/gen/akashic/v1/akashicv1connect"
	"github.com/yumikokawaii/akashic/internal/service"
)

type CategoryServiceHandler struct {
	svc *service.CategoryService
}

var _ akashicv1connect.CategoryServiceHandler = (*CategoryServiceHandler)(nil)

func NewCategoryServiceHandler(svc *service.CategoryService) *CategoryServiceHandler {
	return &CategoryServiceHandler{svc: svc}
}

func (h *CategoryServiceHandler) ListCategories(
	ctx context.Context,
	req *connect.Request[pb.ListCategoriesRequest],
) (*connect.Response[pb.ListCategoriesResponse], error) {
	cats, err := h.svc.List(int(req.Msg.BankId))
	if err != nil {
		return nil, toConnectError(err)
	}
	pbCats := make([]*pb.Category, len(cats))
	for i := range cats {
		pbCats[i] = categoryToProto(&cats[i])
	}
	return connect.NewResponse(&pb.ListCategoriesResponse{Categories: pbCats}), nil
}

func (h *CategoryServiceHandler) CreateCategory(
	ctx context.Context,
	req *connect.Request[pb.CreateCategoryRequest],
) (*connect.Response[pb.CreateCategoryResponse], error) {
	cat, err := h.svc.Create(int(req.Msg.BankId), service.CreateCategoryInput{
		Name:        req.Msg.Name,
		Description: req.Msg.Description,
	})
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.CreateCategoryResponse{Category: categoryToProto(cat)}), nil
}

func (h *CategoryServiceHandler) UpdateCategory(
	ctx context.Context,
	req *connect.Request[pb.UpdateCategoryRequest],
) (*connect.Response[pb.UpdateCategoryResponse], error) {
	cat, err := h.svc.Update(int(req.Msg.BankId), int(req.Msg.Id), service.UpdateCategoryInput{
		Name:        req.Msg.Name,
		Description: req.Msg.Description,
	})
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.UpdateCategoryResponse{Category: categoryToProto(cat)}), nil
}

func (h *CategoryServiceHandler) DeleteCategory(
	ctx context.Context,
	req *connect.Request[pb.DeleteCategoryRequest],
) (*connect.Response[pb.DeleteCategoryResponse], error) {
	if err := h.svc.Delete(int(req.Msg.BankId), int(req.Msg.Id)); err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.DeleteCategoryResponse{}), nil
}

func (h *CategoryServiceHandler) RestoreCategory(
	ctx context.Context,
	req *connect.Request[pb.RestoreCategoryRequest],
) (*connect.Response[pb.RestoreCategoryResponse], error) {
	cat, err := h.svc.Restore(int(req.Msg.BankId), int(req.Msg.Id))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.RestoreCategoryResponse{Category: categoryToProto(cat)}), nil
}
