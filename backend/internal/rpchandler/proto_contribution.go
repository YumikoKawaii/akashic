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
	}
	return ""
}

func reviewDecisionToProto(d string) pb.ReviewDecision {
	switch d {
	case model.ReviewApprove:
		return pb.ReviewDecision_REVIEW_DECISION_APPROVE
	case model.ReviewReject:
		return pb.ReviewDecision_REVIEW_DECISION_REJECT
	case model.ReviewRequestChanges:
		return pb.ReviewDecision_REVIEW_DECISION_REQUEST_CHANGES
	}
	return pb.ReviewDecision_REVIEW_DECISION_UNSPECIFIED
}

func reviewDecisionFromProto(d pb.ReviewDecision) string {
	switch d {
	case pb.ReviewDecision_REVIEW_DECISION_APPROVE:
		return model.ReviewApprove
	case pb.ReviewDecision_REVIEW_DECISION_REJECT:
		return model.ReviewReject
	case pb.ReviewDecision_REVIEW_DECISION_REQUEST_CHANGES:
		return model.ReviewRequestChanges
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

func contributionReviewToProto(r *model.ContributionReview) *pb.ContributionReview {
	return &pb.ContributionReview{
		Id:         int32(r.ID),
		ReviewerId: int32(r.ReviewerID),
		Decision:   reviewDecisionToProto(r.Decision),
		Note:       r.Note,
		CreatedAt:  timestamppb.New(r.CreatedAt),
		Reviewer:   userToProto(r.Reviewer),
	}
}

func contributionToProto(c *model.Contribution) *pb.Contribution {
	var mergedQuestionID *int32
	if c.MergedQuestionID != nil {
		v := int32(*c.MergedQuestionID)
		mergedQuestionID = &v
	}
	reviews := make([]*pb.ContributionReview, len(c.Reviews))
	for i := range c.Reviews {
		reviews[i] = contributionReviewToProto(&c.Reviews[i])
	}
	return &pb.Contribution{
		Id:               int32(c.ID),
		BankId:           int32(c.BankID),
		ContributorId:    int32(c.ContributorID),
		Proposed:         proposedQuestionToProto(c.Payload),
		Status:           contributionStatusToProto(c.Status),
		MergedQuestionId: mergedQuestionID,
		Reviews:          reviews,
		CreatedAt:        timestamppb.New(c.CreatedAt),
		UpdatedAt:        timestamppb.New(c.UpdatedAt),
		Contributor:      userToProto(c.Contributor),
	}
}
