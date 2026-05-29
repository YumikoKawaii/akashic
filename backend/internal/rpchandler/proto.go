package rpchandler

import (
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	pb "github.com/yumikokawaii/akashic/gen/akashic/v1"
	"github.com/yumikokawaii/akashic/internal/model"
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

// ── TestConfig ─────────────────────────────────────────────────────────────────

func testConfigToProto(c model.TestConfig) *pb.TestConfig {
	types := make([]pb.QuestionType, 0, len(c.Types))
	for _, t := range c.Types {
		types = append(types, questionTypeToProto(t))
	}
	catIDs := make([]int32, len(c.CategoryIDs))
	for i, id := range c.CategoryIDs {
		catIDs[i] = int32(id)
	}
	passIDs := make([]int32, len(c.PassageIDs))
	for i, id := range c.PassageIDs {
		passIDs[i] = int32(id)
	}
	return &pb.TestConfig{
		EasyCount:      int32(c.EasyCount),
		MediumCount:    int32(c.MediumCount),
		HardCount:      int32(c.HardCount),
		CategoryIds:    catIDs,
		PassageIds:     passIDs,
		Types:          types,
		Tags:           c.Tags,
		StandaloneOnly: c.StandaloneOnly,
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
	catIDs := make([]int, len(c.CategoryIds))
	for i, id := range c.CategoryIds {
		catIDs[i] = int(id)
	}
	passIDs := make([]int, len(c.PassageIds))
	for i, id := range c.PassageIds {
		passIDs[i] = int(id)
	}
	return model.TestConfig{
		EasyCount:      int(c.EasyCount),
		MediumCount:    int(c.MediumCount),
		HardCount:      int(c.HardCount),
		CategoryIDs:    catIDs,
		PassageIDs:     passIDs,
		Types:          types,
		Tags:           c.Tags,
		StandaloneOnly: c.StandaloneOnly,
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
	}
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

// ── Category ───────────────────────────────────────────────────────────────────

func categoryToProto(c *model.Category) *pb.Category {
	return &pb.Category{
		Id:          int32(c.ID),
		BankId:      int32(c.BankID),
		Name:        c.Name,
		Description: c.Description,
		CreatedAt:   timestamppb.New(c.CreatedAt),
		UpdatedAt:   timestamppb.New(c.UpdatedAt),
	}
}

// ── Passage ────────────────────────────────────────────────────────────────────

func passageToProto(p *model.Passage) *pb.Passage {
	paragraphs := make([]*pb.PassageParagraph, len(p.Paragraphs))
	for i, pp := range p.Paragraphs {
		paragraphs[i] = &pb.PassageParagraph{Label: pp.Label, Text: pp.Text}
	}
	return &pb.Passage{
		Id:         int32(p.ID),
		BankId:     int32(p.BankID),
		CategoryId: int32(p.CategoryID),
		Title:      p.Title,
		Paragraphs: paragraphs,
		Difficulty: difficultyToProto(p.Difficulty),
		CreatedAt:  timestamppb.New(p.CreatedAt),
		UpdatedAt:  timestamppb.New(p.UpdatedAt),
	}
}

func paragraphsFromProto(pbs []*pb.PassageParagraph) []model.PassageParagraph {
	out := make([]model.PassageParagraph, len(pbs))
	for i, p := range pbs {
		out[i] = model.PassageParagraph{Label: p.Label, Text: p.Text}
	}
	return out
}

// ── QuestionGroup ──────────────────────────────────────────────────────────────

func groupContextToProto(c model.GroupContext, groupType string) *pb.GroupContext {
	pbCtx := &pb.GroupContext{}
	switch groupType {
	case "matching_headings":
		sections := make([]*pb.SectionItem, len(c.Sections))
		for i, s := range c.Sections {
			sections[i] = &pb.SectionItem{Key: s.Key, Label: s.Label}
		}
		headings := make([]*pb.OptionItem, len(c.Headings))
		for i, h := range c.Headings {
			headings[i] = &pb.OptionItem{Key: h.Key, Text: h.Text}
		}
		pbCtx.Context = &pb.GroupContext_MatchingHeadings{
			MatchingHeadings: &pb.MatchingHeadingsContext{Sections: sections, Headings: headings},
		}
	case "matching_information":
		paragraphs := make([]*pb.OptionItem, len(c.Paragraphs))
		for i, p := range c.Paragraphs {
			paragraphs[i] = &pb.OptionItem{Key: p.Key, Text: p.Text}
		}
		pbCtx.Context = &pb.GroupContext_MatchingInformation{
			MatchingInformation: &pb.MatchingInformationContext{Paragraphs: paragraphs},
		}
	case "matching_features":
		options := make([]*pb.OptionItem, len(c.Options))
		for i, o := range c.Options {
			options[i] = &pb.OptionItem{Key: o.Key, Text: o.Text}
		}
		pbCtx.Context = &pb.GroupContext_MatchingFeatures{
			MatchingFeatures: &pb.MatchingFeaturesContext{Options: options},
		}
	case "sentence_completion", "short_answer":
		pbCtx.Context = &pb.GroupContext_WordGroup{
			WordGroup: &pb.WordGroupContext{
				WordLimit: int32(c.WordLimit),
				WordBank:  c.WordBank,
			},
		}
	case "form_completion":
		pbCtx.Context = &pb.GroupContext_FormCompletion{
			FormCompletion: &pb.FormCompletionContext{
				WordLimit: int32(c.WordLimit),
				WordBank:  c.WordBank,
				FormType:  c.FormType,
				Title:     c.Title,
				Template:  c.Template,
			},
		}
	}
	return pbCtx
}

func groupContextFromProto(pbCtx *pb.GroupContext) model.GroupContext {
	if pbCtx == nil {
		return model.GroupContext{}
	}
	c := model.GroupContext{}
	switch v := pbCtx.Context.(type) {
	case *pb.GroupContext_MatchingHeadings:
		for _, s := range v.MatchingHeadings.Sections {
			c.Sections = append(c.Sections, model.SectionItem{Key: s.Key, Label: s.Label})
		}
		for _, h := range v.MatchingHeadings.Headings {
			c.Headings = append(c.Headings, model.OptionItem{Key: h.Key, Text: h.Text})
		}
	case *pb.GroupContext_MatchingInformation:
		for _, p := range v.MatchingInformation.Paragraphs {
			c.Paragraphs = append(c.Paragraphs, model.OptionItem{Key: p.Key, Text: p.Text})
		}
	case *pb.GroupContext_MatchingFeatures:
		for _, o := range v.MatchingFeatures.Options {
			c.Options = append(c.Options, model.OptionItem{Key: o.Key, Text: o.Text})
		}
	case *pb.GroupContext_WordGroup:
		c.WordLimit = int(v.WordGroup.WordLimit)
		c.WordBank = v.WordGroup.WordBank
	case *pb.GroupContext_FormCompletion:
		c.WordLimit = int(v.FormCompletion.WordLimit)
		c.WordBank = v.FormCompletion.WordBank
		c.FormType = v.FormCompletion.FormType
		c.Title = v.FormCompletion.Title
		c.Template = v.FormCompletion.Template
	}
	return c
}

func questionGroupToProto(g *model.QuestionGroup) *pb.QuestionGroup {
	var passageID *int32
	if g.PassageID != nil {
		v := int32(*g.PassageID)
		passageID = &v
	}
	return &pb.QuestionGroup{
		Id:         int32(g.ID),
		BankId:     int32(g.BankID),
		CategoryId: int32(g.CategoryID),
		PassageId:  passageID,
		Type:       questionTypeToProto(g.Type),
		Difficulty: difficultyToProto(g.Difficulty),
		Context:    groupContextToProto(g.Context, g.Type),
		CreatedAt:  timestamppb.New(g.CreatedAt),
		UpdatedAt:  timestamppb.New(g.UpdatedAt),
	}
}

// ── Question ───────────────────────────────────────────────────────────────────

func questionToProto(q *model.Question) *pb.Question {
	var groupID *int32
	if q.GroupID != nil {
		v := int32(*q.GroupID)
		groupID = &v
	}
	var position *int32
	if q.Position != nil {
		v := int32(*q.Position)
		position = &v
	}
	pbq := &pb.Question{
		Id:         int32(q.ID),
		BankId:     int32(q.BankID),
		CategoryId: int32(q.CategoryID),
		GroupId:    groupID,
		Type:       questionTypeToProto(q.Type),
		Difficulty: difficultyToProto(q.Difficulty),
		Tags:       []string(q.Tags),
		Position:   position,
		CreatedAt:  timestamppb.New(q.CreatedAt),
		UpdatedAt:  timestamppb.New(q.UpdatedAt),
	}
	if q.Choice != nil {
		opts := make([]*pb.MCQOption, len(q.Choice.Options))
		for i, o := range q.Choice.Options {
			opts[i] = &pb.MCQOption{Key: o.Key, Text: o.Text}
		}
		pbq.Content = &pb.Question_Choice{
			Choice: &pb.MultipleChoice{
				Content: q.Choice.Content,
				Options: opts,
				Answers: []string(q.Choice.Answers),
			},
		}
	} else if q.Item != nil {
		pbq.Content = &pb.Question_Item{
			Item: &pb.QuestionItem{Content: q.Item.Content, Answer: q.Item.Answer},
		}
	}
	return pbq
}

// ── Test ───────────────────────────────────────────────────────────────────────

func testToProto(t *model.Test) *pb.Test {
	qs := make([]*pb.TestQuestion, len(t.TestQuestions))
	for i, tq := range t.TestQuestions {
		pbTQ := &pb.TestQuestion{
			TestId:     int32(tq.TestID),
			QuestionId: int32(tq.QuestionID),
			Position:   int32(tq.Position),
		}
		if tq.Question != nil {
			pbTQ.Question = questionToProto(tq.Question)
		}
		qs[i] = pbTQ
	}
	return &pb.Test{
		Id:          int32(t.ID),
		BankId:      int32(t.BankID),
		Name:        t.Name,
		Description: t.Description,
		Config:      testConfigToProto(t.Config),
		Questions:   qs,
		CreatedAt:   timestamppb.New(t.CreatedAt),
		UpdatedAt:   timestamppb.New(t.UpdatedAt),
	}
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
	if a.CompletedAt != nil {
		pa.CompletedAt = timestamppb.New(*a.CompletedAt)
	} else {
		pa.CompletedAt = timestamppb.New(time.Time{})
	}
	return pa
}
