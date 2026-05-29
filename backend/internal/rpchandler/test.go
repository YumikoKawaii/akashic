package rpchandler

import (
	"context"

	"connectrpc.com/connect"
	pb "github.com/yumikokawaii/akashic/gen/akashic/v1"
	"github.com/yumikokawaii/akashic/gen/akashic/v1/akashicv1connect"
	"github.com/yumikokawaii/akashic/internal/service"
)

type TestServiceHandler struct {
	svc *service.TestService
}

var _ akashicv1connect.TestServiceHandler = (*TestServiceHandler)(nil)

func NewTestServiceHandler(svc *service.TestService) *TestServiceHandler {
	return &TestServiceHandler{svc: svc}
}

func (h *TestServiceHandler) ListTests(
	ctx context.Context,
	req *connect.Request[pb.ListTestsRequest],
) (*connect.Response[pb.ListTestsResponse], error) {
	page, pageSize := int(req.Msg.Page), int(req.Msg.PageSize)
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 50 {
		pageSize = 10
	}
	result, err := h.svc.ListByBankPaged(int(req.Msg.BankId), page, pageSize)
	if err != nil {
		return nil, toConnectError(err)
	}
	pbTests := make([]*pb.Test, len(result.Data))
	for i := range result.Data {
		pbTests[i] = testToProto(&result.Data[i])
	}
	return connect.NewResponse(&pb.ListTestsResponse{
		Tests: pbTests,
		PageInfo: &pb.PageInfo{
			Page:       int32(result.Page),
			PageSize:   int32(result.PageSize),
			Total:      int32(result.Total),
			TotalPages: int32((result.Total + int64(result.PageSize) - 1) / int64(result.PageSize)),
		},
	}), nil
}

func (h *TestServiceHandler) GenerateTest(
	ctx context.Context,
	req *connect.Request[pb.GenerateTestRequest],
) (*connect.Response[pb.GenerateTestResponse], error) {
	cfg := testConfigFromProto(req.Msg.Config)
	test, err := h.svc.Generate(int(req.Msg.BankId), service.GenerateTestInput{
		Name:        req.Msg.Name,
		Description: req.Msg.Description,
		Config:      &cfg,
		UserID:      userIDFromContext(ctx),
	})
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.GenerateTestResponse{Test: testToProto(test)}), nil
}

func (h *TestServiceHandler) GetTest(
	ctx context.Context,
	req *connect.Request[pb.GetTestRequest],
) (*connect.Response[pb.GetTestResponse], error) {
	test, err := h.svc.GetByID(int(req.Msg.BankId), int(req.Msg.Id))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.GetTestResponse{Test: testToProto(test)}), nil
}

func (h *TestServiceHandler) DeleteTest(
	ctx context.Context,
	req *connect.Request[pb.DeleteTestRequest],
) (*connect.Response[pb.DeleteTestResponse], error) {
	if err := h.svc.Delete(int(req.Msg.BankId), int(req.Msg.Id)); err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.DeleteTestResponse{}), nil
}

func (h *TestServiceHandler) RestoreTest(
	ctx context.Context,
	req *connect.Request[pb.RestoreTestRequest],
) (*connect.Response[pb.RestoreTestResponse], error) {
	test, err := h.svc.Restore(int(req.Msg.BankId), int(req.Msg.Id))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.RestoreTestResponse{Test: testToProto(test)}), nil
}

