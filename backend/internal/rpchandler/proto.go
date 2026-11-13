package rpchandler

import (
	"google.golang.org/protobuf/types/known/timestamppb"

	pb "github.com/yumikokawaii/akashic/gen/akashic/v1"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
)

// ── Enums ──────────────────────────────────────────────────────────────────────

func difficultyToProto(s string) pb.Difficulty {
	switch s {
	case "easy":
		return pb.Difficulty_DIFFICULTY_EASY
	case "medium":
		return pb.Difficulty_DIFFICULTY_MEDIUM
	case "hard":
		return pb.Difficulty_DIFFICULTY_HARD
	}
	return pb.Difficulty_DIFFICULTY_UNSPECIFIED
}

func difficultyFromProto(d pb.Difficulty) string {
	switch d {
	case pb.Difficulty_DIFFICULTY_EASY:
		return "easy"
	case pb.Difficulty_DIFFICULTY_MEDIUM:
		return "medium"
	case pb.Difficulty_DIFFICULTY_HARD:
		return "hard"
	}
	return ""
}

func questionTypeToProto(s string) pb.QuestionType {
	switch s {
	case "mcq":
		return pb.QuestionType_QUESTION_TYPE_MCQ
	case "tf_ng":
		return pb.QuestionType_QUESTION_TYPE_TF_NG
	case "yn_ng":
		return pb.QuestionType_QUESTION_TYPE_YN_NG
	case "short_answer":
		return pb.QuestionType_QUESTION_TYPE_SHORT_ANSWER
	case "sentence_completion":
		return pb.QuestionType_QUESTION_TYPE_SENTENCE_COMPLETION
	case "form_completion":
		return pb.QuestionType_QUESTION_TYPE_FORM_COMPLETION
	case "matching_headings":
		return pb.QuestionType_QUESTION_TYPE_MATCHING_HEADINGS
	case "matching_information":
		return pb.QuestionType_QUESTION_TYPE_MATCHING_INFORMATION
	case "matching_features":
		return pb.QuestionType_QUESTION_TYPE_MATCHING_FEATURES
	}
	return pb.QuestionType_QUESTION_TYPE_UNSPECIFIED
}

func questionTypeFromProto(t pb.QuestionType) string {
	switch t {
	case pb.QuestionType_QUESTION_TYPE_MCQ:
		return "mcq"
	case pb.QuestionType_QUESTION_TYPE_TF_NG:
		return "tf_ng"
	case pb.QuestionType_QUESTION_TYPE_YN_NG:
		return "yn_ng"
	case pb.QuestionType_QUESTION_TYPE_SHORT_ANSWER:
		return "short_answer"
	case pb.QuestionType_QUESTION_TYPE_SENTENCE_COMPLETION:
		return "sentence_completion"
	case pb.QuestionType_QUESTION_TYPE_FORM_COMPLETION:
		return "form_completion"
	case pb.QuestionType_QUESTION_TYPE_MATCHING_HEADINGS:
		return "matching_headings"
	case pb.QuestionType_QUESTION_TYPE_MATCHING_INFORMATION:
		return "matching_information"
	case pb.QuestionType_QUESTION_TYPE_MATCHING_FEATURES:
		return "matching_features"
	}
	return ""
}

func bankRoleToProto(r string) pb.BankRole {
	switch r {
	case "owner":
		return pb.BankRole_BANK_ROLE_OWNER
	case "editor":
		return pb.BankRole_BANK_ROLE_EDITOR
	case "viewer":
		return pb.BankRole_BANK_ROLE_VIEWER
	}
	return pb.BankRole_BANK_ROLE_UNSPECIFIED
}

func bankRoleFromProto(r pb.BankRole) string {
	switch r {
	case pb.BankRole_BANK_ROLE_OWNER:
		return "owner"
	case pb.BankRole_BANK_ROLE_EDITOR:
		return "editor"
	case pb.BankRole_BANK_ROLE_VIEWER:
		return "viewer"
	}
	return ""
}

func bankVisibilityToProto(v string) pb.BankVisibility {
	switch v {
	case model.VisibilityPublic:
		return pb.BankVisibility_BANK_VISIBILITY_PUBLIC
	case model.VisibilityPrivate:
		return pb.BankVisibility_BANK_VISIBILITY_PRIVATE
	}
	return pb.BankVisibility_BANK_VISIBILITY_UNSPECIFIED
}

func bankVisibilityFromProto(v pb.BankVisibility) string {
	switch v {
	case pb.BankVisibility_BANK_VISIBILITY_PUBLIC:
		return model.VisibilityPublic
	case pb.BankVisibility_BANK_VISIBILITY_PRIVATE:
		return model.VisibilityPrivate
	}
	return ""
}

// ── TestConfig ─────────────────────────────────────────────────────────────────

func testConfigToProto(c model.TestConfig) *pb.TestConfig {
	types := make([]pb.QuestionType, 0, len(c.Types))
	for _, t := range c.Types {
		types = append(types, questionTypeToProto(t))
	}
	return &pb.TestConfig{
		EasyCount:   int32(c.EasyCount),
		MediumCount: int32(c.MediumCount),
		HardCount:   int32(c.HardCount),
		Types:       types,
		Tags:        c.Tags,
	}
}

func testConfigFromProto(c *pb.TestConfig) model.TestConfig {
	if c == nil {
		return model.TestConfig{}
	}
	types := make([]string, 0, len(c.Types))
	for _, t := range c.Types {
		if s := questionTypeFromProto(t); s != "" {
			types = append(types, s)
		}
	}
	return model.TestConfig{
		EasyCount:   int(c.EasyCount),
		MediumCount: int(c.MediumCount),
		HardCount:   int(c.HardCount),
		Types:       types,
		Tags:        c.Tags,
	}
}

// ── User ───────────────────────────────────────────────────────────────────────

func userToProto(u *model.User) *pb.User {
	if u == nil {
		return nil
	}
	return &pb.User{
		Id:        int32(u.ID),
		Email:     u.Email,
		Name:      u.Name,
		AvatarUrl: u.AvatarURL,
		CreatedAt: timestamppb.New(u.CreatedAt),
		UpdatedAt: timestamppb.New(u.UpdatedAt),
	}
}

// ── Bank ───────────────────────────────────────────────────────────────────────

func bankToProto(b *model.Bank) *pb.Bank {
	var ownerID *int32
	if b.OwnerID != nil {
		v := int32(*b.OwnerID)
		ownerID = &v
	}
	return &pb.Bank{
		Id:            int32(b.ID),
		Name:          b.Name,
		Description:   b.Description,
		OwnerId:       ownerID,
		DefaultConfig: testConfigToProto(b.DefaultConfig),
		CreatedAt:     timestamppb.New(b.CreatedAt),
		UpdatedAt:     timestamppb.New(b.UpdatedAt),
		Visibility:    bankVisibilityToProto(b.Visibility),
	}
}

func publicBankCardToProto(c *repository.PublicBankCard) *pb.PublicBankCard {
	pc := &pb.PublicBankCard{
		Id:            int32(c.ID),
		Name:          c.Name,
		Description:   c.Description,
		QuestionCount: int32(c.QuestionCount),
	}
	if c.OwnerID != nil {
		pc.Owner = &pb.User{
			Id:        int32(*c.OwnerID),
			Name:      c.OwnerName,
			Email:     c.OwnerEmail,
			AvatarUrl: c.OwnerAvatar,
		}
	}
	return pc
}

func bankWithRoleToProto(bwr model.BankWithRole) *pb.BankWithRole {
	return &pb.BankWithRole{
		Bank:   bankToProto(&bwr.Bank),
		MyRole: bwr.MyRole,
	}
}

func bankMemberToProto(m *model.BankMember) *pb.BankMember {
	pbm := &pb.BankMember{
		Id:        int32(m.ID),
		BankId:    int32(m.BankID),
		UserId:    int32(m.UserID),
		Role:      bankRoleToProto(m.Role),
		CreatedAt: timestamppb.New(m.CreatedAt),
		UpdatedAt: timestamppb.New(m.UpdatedAt),
	}
	if m.User != nil {
		pbm.User = userToProto(m.User)
	}
	return pbm
}

// ── Question ───────────────────────────────────────────────────────────────────

func questionToProto(q *model.Question) *pb.Question {
	pbq := &pb.Question{
		Id:         int32(q.ID),
		BankId:     int32(q.BankID),
		Type:       questionTypeToProto(q.Type),
		Difficulty: difficultyToProto(q.Difficulty),
		Tags:       []string(q.Tags),
		CreatedAt:  timestamppb.New(q.CreatedAt),
		UpdatedAt:  timestamppb.New(q.UpdatedAt),
	}
	if q.Type == "mcq" {
		opts := make([]*pb.MCQOption, len(q.Content.Options))
		for i, o := range q.Content.Options {
			opts[i] = &pb.MCQOption{Key: o.Key, Text: o.Text}
		}
		pbq.Content = &pb.Question_Choice{
			Choice: &pb.MultipleChoice{
				Content: q.Content.Text,
				Options: opts,
				Answers: q.Content.Answers,
			},
		}
	} else {
		pbq.Content = &pb.Question_Item{
			Item: &pb.QuestionItem{Content: q.Content.Text, Answer: q.Content.Answer},
		}
	}
	return pbq
}

// ── Test ───────────────────────────────────────────────────────────────────────

func testToProto(t *model.Test) *pb.Test {
	qs := make([]*pb.TestQuestion, len(t.Questions))
	for i := range t.Questions {
		q := &t.Questions[i]
		qs[i] = &pb.TestQuestion{
			TestId:     int32(t.ID),
			QuestionId: int32(q.ID),
			Position:   int32(i + 1),
			Question:   questionToProto(q),
		}
	}
	pt := &pb.Test{
		Id:          int32(t.ID),
		BankId:      int32(t.BankID),
		Name:        t.Name,
		Description: t.Description,
		Config:      testConfigToProto(t.Config),
		Questions:   qs,
		CreatedAt:   timestamppb.New(t.CreatedAt),
		UpdatedAt:   timestamppb.New(t.UpdatedAt),
		Creator:     userToProto(t.Creator),
	}
	if t.CreatedBy != nil {
		v := int32(*t.CreatedBy)
		pt.CreatedBy = &v
	}
	return pt
}

// ── Attempt ────────────────────────────────────────────────────────────────────

func attemptToProto(a *model.TestAttempt) *pb.Attempt {
	pa := &pb.Attempt{
		Id:        int32(a.ID),
		TestId:    int32(a.TestID),
		Answers:   a.Answers,
		StartedAt: timestamppb.New(a.StartedAt),
		CreatedAt: timestamppb.New(a.CreatedAt),
		UpdatedAt: timestamppb.New(a.UpdatedAt),
	}
	if a.Score != nil {
		v := int32(*a.Score)
		pa.Score = &v
	}
	if a.Total != nil {
		v := int32(*a.Total)
		pa.Total = &v
	}
	// Leave CompletedAt unset for in-progress attempts; proto3 omits absent
	// message fields from JSON so the client sees it as undefined rather than
	// a zero (year-1) timestamp.
	if a.CompletedAt != nil {
		pa.CompletedAt = timestamppb.New(*a.CompletedAt)
	}
	if a.Test != nil {
		pa.Test = testToProto(a.Test)
	}
	if a.UserID != nil {
		v := int32(*a.UserID)
		pa.UserId = &v
	}
	pa.Taker = userToProto(a.Taker)
	return pa
}
