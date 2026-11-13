package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/lib/pq"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/uow"
)

type QuestionService struct {
	uow  uow.UnitOfWork
	pool GenerateCache
}

func NewQuestionService(u uow.UnitOfWork, pool GenerateCache) *QuestionService {
	return &QuestionService{uow: u, pool: pool}
}

func (s *QuestionService) List(bankID int, f repository.QuestionFilter) ([]model.Question, error) {
	if _, err := s.uow.Store().Banks.FindByID(bankID); err != nil {
		return nil, err
	}
	return s.uow.Store().Questions.FindByBank(bankID, f)
}

type QuestionPage struct {
	Data     []model.Question `json:"data"`
	Total    int64            `json:"total"`
	Page     int              `json:"page"`
	PageSize int              `json:"page_size"`
}

func (s *QuestionService) ListPaged(bankID int, f repository.QuestionFilter, page, pageSize int) (*QuestionPage, error) {
	if _, err := s.uow.Store().Banks.FindByID(bankID); err != nil {
		return nil, err
	}
	qs, total, err := s.uow.Store().Questions.FindByBankPaged(bankID, f, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &QuestionPage{Data: qs, Total: total, Page: page, PageSize: pageSize}, nil
}

// ListTags returns the bank's distinct question tags, for the generate-by-tags picker.
func (s *QuestionService) ListTags(bankID int) ([]string, error) {
	if _, err := s.uow.Store().Banks.FindByID(bankID); err != nil {
		return nil, err
	}
	return s.uow.Store().Questions.ListTags(bankID)
}

func (s *QuestionService) GetByID(bankID, id int) (*model.Question, error) {
	q, err := s.uow.Store().Questions.FindByID(id)
	if err != nil {
		return nil, err
	}
	if q.BankID != bankID {
		return nil, ErrForbidden
	}
	return q, nil
}

type CreateQuestionInput struct {
	Type       string            `json:"type"        binding:"required"`
	Difficulty string            `json:"difficulty"  binding:"required"`
	Tags       []string          `json:"tags"`
	Content    string            `json:"content"     binding:"required"`
	Answer     string            `json:"answer"`
	Options    []model.MCQOption `json:"options"`
	Answers    []string          `json:"answers"`
}

func (s *QuestionService) Create(ctx context.Context, bankID int, input CreateQuestionInput) (*model.Question, error) {
	if _, err := s.uow.Store().Banks.FindByID(bankID); err != nil {
		return nil, err
	}
	q := &model.Question{
		BankID:     bankID,
		Type:       input.Type,
		Difficulty: input.Difficulty,
		Tags:       pq.StringArray(input.Tags),
		Content:    model.NewQuestionContent(input.Type, input.Content, input.Answer, input.Options, input.Answers),
	}

	if err := s.uow.Store().Questions.Create(q); err != nil {
		return nil, err
	}

	created, err := s.uow.Store().Questions.FindByID(q.ID)
	if err != nil {
		return nil, err
	}
	s.pool.InvalidatePool(bankID)
	return created, nil
}

type UpdateQuestionInput struct {
	Difficulty string            `json:"difficulty"`
	Tags       []string          `json:"tags"`
	Content    string            `json:"content"`
	Answer     string            `json:"answer"`
	Options    []model.MCQOption `json:"options"`
	Answers    []string          `json:"answers"`
}

func (s *QuestionService) Update(bankID, id int, input UpdateQuestionInput) (*model.Question, error) {
	q, err := s.uow.Store().Questions.FindByID(id)
	if err != nil {
		return nil, err
	}
	if q.BankID != bankID {
		return nil, ErrForbidden
	}
	if input.Difficulty != "" {
		q.Difficulty = input.Difficulty
	}
	if input.Tags != nil {
		q.Tags = pq.StringArray(input.Tags)
	}
	if input.Content != "" {
		q.Content.Text = input.Content
		if q.Type == "mcq" {
			if input.Options != nil {
				q.Content.Options = input.Options
			}
			if input.Answers != nil {
				q.Content.Answers = input.Answers
			}
		} else if input.Answer != "" {
			q.Content.Answer = input.Answer
		}
	}
	if err := s.uow.Store().Questions.Save(q); err != nil {
		return nil, err
	}

	updated, err := s.uow.Store().Questions.FindByID(q.ID)
	if err != nil {
		return nil, err
	}
	s.pool.InvalidatePool(q.BankID)
	return updated, nil
}

func (s *QuestionService) Delete(bankID, id int) error {
	q, err := s.uow.Store().Questions.FindByID(id)
	if err != nil {
		return err
	}
	if q.BankID != bankID {
		return ErrForbidden
	}
	if err := s.uow.Store().Questions.SoftDelete(id); err != nil {
		return err
	}
	s.pool.InvalidatePool(bankID)
	return nil
}

func (s *QuestionService) Restore(bankID, id int) (*model.Question, error) {
	q, err := s.uow.Store().Questions.FindByIDUnscoped(id)
	if err != nil {
		return nil, err
	}
	if q.BankID != bankID {
		return nil, ErrForbidden
	}
	if err := s.uow.Store().Questions.Restore(id); err != nil {
		return nil, err
	}
	s.pool.InvalidatePool(bankID)
	return s.uow.Store().Questions.FindByID(id)
}

func (s *QuestionService) ListDeleted(bankID int) ([]model.Question, error) {
	return s.uow.Store().Questions.FindDeletedByBank(bankID)
}

func (s *QuestionService) ListGroups(bankID int) ([]repository.GroupSummary, error) {
	return s.uow.Store().Groups.FindSummaries(bankID)
}

type UpdateGroupInput struct {
	Title        string
	Instructions string
	Passage      string
	Options      []model.MCQOption
	Difficulty   string
	Tags         []string
}

func (s *QuestionService) UpdateGroup(bankID, id int, input UpdateGroupInput) (*model.QuestionGroup, error) {
	if !validDifficultyLevels[input.Difficulty] {
		return nil, fmt.Errorf("%w: difficulty must be easy, medium or hard", ErrBadRequest)
	}
	options := make([]model.MCQOption, len(input.Options))
	for i, o := range input.Options {
		options[i] = model.MCQOption{Key: strings.TrimSpace(o.Key), Text: strings.TrimSpace(o.Text)}
		if options[i].Key == "" || options[i].Text == "" {
			return nil, fmt.Errorf("%w: every option needs a key and text", ErrBadRequest)
		}
	}
	g, err := s.uow.Store().Groups.FindByID(id)
	if err != nil {
		return nil, err
	}
	if g.BankID != bankID {
		return nil, ErrForbidden
	}
	g.Title = strings.TrimSpace(input.Title)
	g.Content = model.GroupContent{
		Instructions: strings.TrimSpace(input.Instructions),
		Passage:      strings.TrimSpace(input.Passage),
		Options:      options,
	}
	g.Difficulty = input.Difficulty
	g.Tags = pq.StringArray(nonNilSlice(input.Tags))
	if err := s.uow.Store().Groups.Save(g); err != nil {
		return nil, err
	}
	s.pool.InvalidatePool(bankID)
	return g, nil
}
