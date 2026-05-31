package rpchandler

import (
	"google.golang.org/protobuf/types/known/timestamppb"

	pb "github.com/yumikokawaii/akashic/gen/akashic/v1"
	"github.com/yumikokawaii/akashic/internal/model"
)

// ── Enums ──────────────────────────────────────────────────────────────────────

func contributionStatusToProto(s string) pb.ContributionStatus {
	switch s {
	case model.ContributionPending:
		return pb.ContributionStatus_CONTRIBUTION_STATUS_PENDING
	case model.ContributionChangesRequested:
		return pb.ContributionStatus_CONTRIBUTION_STATUS_CHANGES_REQUESTED
	case model.ContributionApproved:
		return pb.ContributionStatus_CONTRIBUTION_STATUS_APPROVED
	case model.ContributionRejected:
		return pb.ContributionStatus_CONTRIBUTION_STATUS_REJECTED
	case model.ContributionMerged:
		return pb.ContributionStatus_CONTRIBUTION_STATUS_MERGED
	case model.ContributionWithdrawn:
		return pb.ContributionStatus_CONTRIBUTION_STATUS_WITHDRAWN
	case model.ContributionClosed:
		return pb.ContributionStatus_CONTRIBUTION_STATUS_CLOSED
	}
	return pb.ContributionStatus_CONTRIBUTION_STATUS_UNSPECIFIED
}

func contributionStatusFromProto(s pb.ContributionStatus) string {
	switch s {
	case pb.ContributionStatus_CONTRIBUTION_STATUS_PENDING:
		return model.ContributionPending
	case pb.ContributionStatus_CONTRIBUTION_STATUS_CHANGES_REQUESTED:
		return model.ContributionChangesRequested
	case pb.ContributionStatus_CONTRIBUTION_STATUS_APPROVED:
		return model.ContributionApproved
	case pb.ContributionStatus_CONTRIBUTION_STATUS_REJECTED:
		return model.ContributionRejected
	case pb.ContributionStatus_CONTRIBUTION_STATUS_MERGED:
		return model.ContributionMerged
	case pb.ContributionStatus_CONTRIBUTION_STATUS_WITHDRAWN:
		return model.ContributionWithdrawn
	case pb.ContributionStatus_CONTRIBUTION_STATUS_CLOSED:
		return model.ContributionClosed
	}
	return ""
}

func eventTypeToProto(e string) pb.ContributionEventType {
	switch e {
	case model.EventApprove:
		return pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_APPROVE
	case model.EventReject:
		return pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_REJECT
	case model.EventRequestChanges:
		return pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_REQUEST_CHANGES
	case model.EventRevise:
		return pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_REVISE
	case model.EventMerge:
		return pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_MERGE
	case model.EventResubmit:
		return pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_RESUBMIT
	case model.EventWithdraw:
		return pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_WITHDRAW
	case model.EventReopen:
		return pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_REOPEN
	case model.EventClose:
		return pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_CLOSE
	}
	return pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_UNSPECIFIED
}

func eventTypeFromProto(e pb.ContributionEventType) string {
	switch e {
	case pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_APPROVE:
		return model.EventApprove
	case pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_REJECT:
		return model.EventReject
	case pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_REQUEST_CHANGES:
		return model.EventRequestChanges
	case pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_REVISE:
		return model.EventRevise
	case pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_MERGE:
		return model.EventMerge
	case pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_RESUBMIT:
		return model.EventResubmit
	case pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_WITHDRAW:
		return model.EventWithdraw
	case pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_REOPEN:
		return model.EventReopen
	case pb.ContributionEventType_CONTRIBUTION_EVENT_TYPE_CLOSE:
		return model.EventClose
	}
	return ""
}

// ── Payload (proposed question) ──────────────────────────────────────────────────

func proposedQuestionFromProto(p *pb.ProposedQuestion) model.ContributionPayload {
	payload := model.ContributionPayload{
		CategoryID: int(p.GetCategoryId()),
		Type:       questionTypeFromProto(p.GetType()),
		Difficulty: difficultyFromProto(p.GetDifficulty()),
		Tags:       p.GetTags(),
	}
	switch c := p.GetContent().(type) {
	case *pb.ProposedQuestion_Item:
		payload.Content = c.Item.GetContent()
		payload.Answer = c.Item.GetAnswer()
	case *pb.ProposedQuestion_Choice:
		payload.Content = c.Choice.GetContent()
		payload.Answers = c.Choice.GetAnswers()
		opts := make([]model.MCQOption, len(c.Choice.GetOptions()))
		for i, o := range c.Choice.GetOptions() {
			opts[i] = model.MCQOption{Key: o.GetKey(), Text: o.GetText()}
		}
		payload.Options = opts
	}
	return payload
}

func proposedQuestionToProto(p model.ContributionPayload) *pb.ProposedQuestion {
	pq := &pb.ProposedQuestion{
		CategoryId: int32(p.CategoryID),
		Type:       questionTypeToProto(p.Type),
		Difficulty: difficultyToProto(p.Difficulty),
		Tags:       p.Tags,
	}
	if p.Type == "mcq" {
		opts := make([]*pb.MCQOption, len(p.Options))
		for i, o := range p.Options {
			opts[i] = &pb.MCQOption{Key: o.Key, Text: o.Text}
		}
		pq.Content = &pb.ProposedQuestion_Choice{
			Choice: &pb.MultipleChoice{Content: p.Content, Options: opts, Answers: p.Answers},
		}
	} else {
		pq.Content = &pb.ProposedQuestion_Item{
			Item: &pb.QuestionItem{Content: p.Content, Answer: p.Answer},
		}
	}
	return pq
}

// ── Entities ──────────────────────────────────────────────────────────────────

func contributionEventToProto(e *model.ContributionEvent) *pb.ContributionEvent {
	return &pb.ContributionEvent{
		Id:        int32(e.ID),
		ActorId:   int32(e.ActorID),
		Event:     eventTypeToProto(e.Event),
		CreatedAt: timestamppb.New(e.CreatedAt),
		Actor:     userToProto(e.Actor),
	}
}

func contributionCommentToProto(c *model.ContributionComment) *pb.ContributionComment {
	return &pb.ContributionComment{
		Id:        int32(c.ID),
		AuthorId:  int32(c.AuthorID),
		Body:      c.Body,
		CreatedAt: timestamppb.New(c.CreatedAt),
		Author:    userToProto(c.Author),
	}
}

func contributionToProto(c *model.Contribution) *pb.Contribution {
	var questionID *int32
	if c.QuestionID != nil {
		v := int32(*c.QuestionID)
		questionID = &v
	}
	events := make([]*pb.ContributionEvent, len(c.Events))
	for i := range c.Events {
		events[i] = contributionEventToProto(&c.Events[i])
	}
	comments := make([]*pb.ContributionComment, len(c.Comments))
	for i := range c.Comments {
		comments[i] = contributionCommentToProto(&c.Comments[i])
	}
	return &pb.Contribution{
		Id:            int32(c.ID),
		BankId:        int32(c.BankID),
		ContributorId: int32(c.ContributorID),
		Proposed:      proposedQuestionToProto(c.Payload),
		Status:        contributionStatusToProto(c.Status),
		QuestionId:    questionID,
		Events:        events,
		Comments:      comments,
		CreatedAt:     timestamppb.New(c.CreatedAt),
		UpdatedAt:     timestamppb.New(c.UpdatedAt),
		Contributor:   userToProto(c.Contributor),
	}
}
