package rpchandler

import (
	"context"

	"connectrpc.com/connect"
	pb "github.com/yumikokawaii/akashic/gen/akashic/v1"
	"github.com/yumikokawaii/akashic/gen/akashic/v1/akashicv1connect"
	"github.com/yumikokawaii/akashic/internal/repository"
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
	result, err := h.svc.ListByBankPaged(int(req.Msg.BankId), repository.TestListQuery{
		Page:     page,
		PageSize: pageSize,
		Sort:     testSortFromProto(req.Msg.Sort),
		Taken:    takenFilterFromProto(req.Msg.TakenFilter),
		UserID:   userIDFromContext(ctx),
	})
	if err != nil {
		return nil, toConnectError(err)
	}
	pbTests := make([]*pb.Test, len(result.Data))
	for i := range result.Data {
		pt := testToProto(&result.Data[i])
		if b, ok := result.Best[result.Data[i].ID]; ok {
			pt.BestResult = bestResultToProto(b)
		}
		pt.AttemptCount = int32(result.Completed[result.Data[i].ID])
		pbTests[i] = pt
	}
	return connect.NewResponse(&pb.ListTestsResponse{
		Tests: pbTests,
		PageInfo: &pb.PageInfo{
			Page:       int32(result.Page),
			PageSize:   int32(result.PageSize),
			Total:      int32(result.Total),
			TotalPages: int32((result.Total + int64(result.PageSize) - 1) / int64(result.PageSize)),
		},
		Summary: &pb.TestsSummary{
			Total:      int32(result.Summary.Total),
			TakenCount: int32(result.Summary.TakenCount),
			BestPct:    int32(result.Summary.BestPct),
		},
	}), nil
}

func testSortFromProto(s pb.TestSort) repository.TestSort {
	switch s {
	case pb.TestSort_TEST_SORT_OLDEST:
		return repository.SortOldest
	case pb.TestSort_TEST_SORT_NAME:
		return repository.SortName
	case pb.TestSort_TEST_SORT_SIZE:
		return repository.SortSize
	default:
		return repository.SortNewest
	}
}

func takenFilterFromProto(f pb.TakenFilter) repository.TakenFilter {
	switch f {
	case pb.TakenFilter_TAKEN_FILTER_TAKEN:
		return repository.TakenOnly
	case pb.TakenFilter_TAKEN_FILTER_UNTAKEN:
		return repository.UntakenOnly
	default:
		return repository.TakenAll
	}
}

func bestResultToProto(b repository.BestResult) *pb.BestResult {
	pct := 0
	if b.Total > 0 {
		pct = int(float64(b.Score)/float64(b.Total)*100 + 0.5)
	}
	return &pb.BestResult{Score: int32(b.Score), Total: int32(b.Total), Pct: int32(pct)}
}

func (h *TestServiceHandler) GenerateTest(
	ctx context.Context,
	req *connect.Request[pb.GenerateTestRequest],
) (*connect.Response[pb.GenerateTestResponse], error) {
	cfg := testConfigFromProto(req.Msg.Config)
	test, err := h.svc.Generate(ctx, int(req.Msg.BankId), service.GenerateTestInput{
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
	if err := h.svc.Delete(int(req.Msg.BankId), int(req.Msg.Id), userIDFromContext(ctx), roleFromContext(ctx)); err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.DeleteTestResponse{}), nil
}

func (h *TestServiceHandler) RestoreTest(
	ctx context.Context,
	req *connect.Request[pb.RestoreTestRequest],
) (*connect.Response[pb.RestoreTestResponse], error) {
	test, err := h.svc.Restore(int(req.Msg.BankId), int(req.Msg.Id), userIDFromContext(ctx), roleFromContext(ctx))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.RestoreTestResponse{Test: testToProto(test)}), nil
}
