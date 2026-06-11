package rpchandler

import (
	"bytes"
	"context"

	"connectrpc.com/connect"
	pb "github.com/yumikokawaii/akashic/gen/akashic/v1"
	"github.com/yumikokawaii/akashic/gen/akashic/v1/akashicv1connect"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/service"
)

type QuestionServiceHandler struct {
	svc       *service.QuestionService
	ingestSvc *service.IngestService
}

var _ akashicv1connect.QuestionServiceHandler = (*QuestionServiceHandler)(nil)

func NewQuestionServiceHandler(svc *service.QuestionService, ingestSvc *service.IngestService) *QuestionServiceHandler {
	return &QuestionServiceHandler{svc: svc, ingestSvc: ingestSvc}
}

func (h *QuestionServiceHandler) ListQuestions(
	ctx context.Context,
	req *connect.Request[pb.ListQuestionsRequest],
) (*connect.Response[pb.ListQuestionsResponse], error) {
	f := repository.QuestionFilter{}
	if req.Msg.Filter != nil {
		for _, id := range req.Msg.Filter.CategoryIds {
			f.CategoryIDs = append(f.CategoryIDs, int(id))
		}
		f.Difficulty = difficultyFromProto(req.Msg.Filter.Difficulty)
		f.Type = questionTypeFromProto(req.Msg.Filter.Type)
		f.Tags = req.Msg.Filter.Tags
		f.StandaloneOnly = req.Msg.Filter.StandaloneOnly
		if req.Msg.Filter.PassageId != nil {
			pid := int(*req.Msg.Filter.PassageId)
			f.PassageID = &pid
		}
	}
	page, pageSize := int(req.Msg.Page), int(req.Msg.PageSize)
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	result, err := h.svc.ListPaged(int(req.Msg.BankId), f, page, pageSize)
	if err != nil {
		return nil, toConnectError(err)
	}
	pbQs := make([]*pb.Question, len(result.Data))
	for i := range result.Data {
		pbQs[i] = questionToProto(&result.Data[i])
	}
	return connect.NewResponse(&pb.ListQuestionsResponse{
		Questions: pbQs,
		PageInfo: &pb.PageInfo{
			Page:       int32(result.Page),
			PageSize:   int32(result.PageSize),
			Total:      int32(result.Total),
			TotalPages: int32((result.Total + int64(result.PageSize) - 1) / int64(result.PageSize)),
		},
	}), nil
}

func (h *QuestionServiceHandler) CreateQuestion(
	ctx context.Context,
	req *connect.Request[pb.CreateQuestionRequest],
) (*connect.Response[pb.CreateQuestionResponse], error) {
	input := service.CreateQuestionInput{
		CategoryID: int(req.Msg.CategoryId),
		Type:       questionTypeFromProto(req.Msg.Type),
		Difficulty: difficultyFromProto(req.Msg.Difficulty),
		Tags:       req.Msg.Tags,
	}
	switch c := req.Msg.Content.(type) {
	case *pb.CreateQuestionRequest_Item:
		input.Content = c.Item.Content
		input.Answer = c.Item.Answer
	case *pb.CreateQuestionRequest_Choice:
		input.Content = c.Choice.Content
		input.Answers = c.Choice.Answers
		opts := make([]model.MCQOption, len(c.Choice.Options))
		for i, o := range c.Choice.Options {
			opts[i] = model.MCQOption{Key: o.Key, Text: o.Text}
		}
		input.Options = opts
	}

	question, err := h.svc.Create(ctx, int(req.Msg.BankId), input)
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.CreateQuestionResponse{Question: questionToProto(question)}), nil
}

func (h *QuestionServiceHandler) GetQuestion(
	ctx context.Context,
	req *connect.Request[pb.GetQuestionRequest],
) (*connect.Response[pb.GetQuestionResponse], error) {
	question, err := h.svc.GetByID(int(req.Msg.BankId), int(req.Msg.Id))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.GetQuestionResponse{Question: questionToProto(question)}), nil
}

func (h *QuestionServiceHandler) UpdateQuestion(
	ctx context.Context,
	req *connect.Request[pb.UpdateQuestionRequest],
) (*connect.Response[pb.UpdateQuestionResponse], error) {
	catID := int(req.Msg.CategoryId)
	input := service.UpdateQuestionInput{
		CategoryID: &catID,
		Difficulty: difficultyFromProto(req.Msg.Difficulty),
		Tags:       req.Msg.Tags,
	}
	switch c := req.Msg.Content.(type) {
	case *pb.UpdateQuestionRequest_Item:
		input.Content = c.Item.Content
		input.Answer = c.Item.Answer
	case *pb.UpdateQuestionRequest_Choice:
		input.Content = c.Choice.Content
		input.Answers = c.Choice.Answers
		opts := make([]model.MCQOption, len(c.Choice.Options))
		for i, o := range c.Choice.Options {
			opts[i] = model.MCQOption{Key: o.Key, Text: o.Text}
		}
		input.Options = opts
	}

	question, err := h.svc.Update(int(req.Msg.BankId), int(req.Msg.Id), input)
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.UpdateQuestionResponse{Question: questionToProto(question)}), nil
}

func (h *QuestionServiceHandler) DeleteQuestion(
	ctx context.Context,
	req *connect.Request[pb.DeleteQuestionRequest],
) (*connect.Response[pb.DeleteQuestionResponse], error) {
	if err := h.svc.Delete(int(req.Msg.BankId), int(req.Msg.Id)); err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.DeleteQuestionResponse{}), nil
}

func (h *QuestionServiceHandler) RestoreQuestion(
	ctx context.Context,
	req *connect.Request[pb.RestoreQuestionRequest],
) (*connect.Response[pb.RestoreQuestionResponse], error) {
	question, err := h.svc.Restore(int(req.Msg.BankId), int(req.Msg.Id))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.RestoreQuestionResponse{Question: questionToProto(question)}), nil
}

func (h *QuestionServiceHandler) IngestQuestions(
	ctx context.Context,
	req *connect.Request[pb.IngestQuestionsRequest],
) (*connect.Response[pb.IngestQuestionsResponse], error) {
	ext := ingestFormatToExt(req.Msg.Format)
	if ext == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, nil)
	}
	result, err := h.ingestSvc.Ingest(ctx, int(req.Msg.BankId), bytes.NewReader(req.Msg.FileData), ext)
	if err != nil {
		return nil, toConnectError(err)
	}
	pbErrs := make([]*pb.IngestError, len(result.Errors))
	for i, e := range result.Errors {
		pbErrs[i] = &pb.IngestError{Row: int32(e.Row), Label: e.Label, Message: e.Message}
	}
	return connect.NewResponse(&pb.IngestQuestionsResponse{
		Created: int32(result.Created),
		Failed:  int32(result.Failed),
		Errors:  pbErrs,
	}), nil
}

func (h *QuestionServiceHandler) ListTags(
	ctx context.Context,
	req *connect.Request[pb.ListTagsRequest],
) (*connect.Response[pb.ListTagsResponse], error) {
	tags, err := h.svc.ListTags(int(req.Msg.BankId))
	if err != nil {
		return nil, toConnectError(err)
	}
	return connect.NewResponse(&pb.ListTagsResponse{Tags: tags}), nil
}

func ingestFormatToExt(f pb.IngestFormat) string {
	switch f {
	case pb.IngestFormat_INGEST_FORMAT_JSON:
		return ".json"
	case pb.IngestFormat_INGEST_FORMAT_CSV:
		return ".csv"
	case pb.IngestFormat_INGEST_FORMAT_YAML:
		return ".yaml"
	}
	return ""
}
