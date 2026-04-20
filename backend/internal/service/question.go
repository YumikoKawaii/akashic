package service

import (
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
)

type QuestionService struct {
	repo         repository.QuestionRepository
	bankRepo     repository.BankRepository
	categoryRepo repository.CategoryRepository
}

func NewQuestionService(
	repo repository.QuestionRepository,
	bankRepo repository.BankRepository,
	categoryRepo repository.CategoryRepository,
) *QuestionService {
	return &QuestionService{repo: repo, bankRepo: bankRepo, categoryRepo: categoryRepo}
}

func (s *QuestionService) ListByBank(bankID string, filter repository.QuestionFilter) ([]model.Question, int64, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, 0, err
	}
	total, err := s.repo.CountByBank(bankID, filter)
	if err != nil {
		return nil, 0, err
	}
	questions, err := s.repo.FindByBank(bankID, filter)
	return questions, total, err
}

func (s *QuestionService) GetByID(bankID, id string) (*model.Question, error) {
	return s.repo.FindByBankAndID(bankID, id)
}

type CreateQuestionInput struct {
	CategoryID    string   `json:"category_id"    binding:"required"`
	Text          string   `json:"text"           binding:"required"`
	Type          string   `json:"type"           binding:"required,oneof=mcq true_false open sentence_completion"`
	Difficulty    string   `json:"difficulty"     binding:"required,oneof=easy medium hard"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"correct_answer"`
	Tags          []string `json:"tags"`
}

func (s *QuestionService) Create(bankID string, input CreateQuestionInput) (*model.Question, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}
	if _, err := s.categoryRepo.FindByBankAndID(bankID, input.CategoryID); err != nil {
		return nil, err
	}
	question := &model.Question{
		BankID:        bankID,
		CategoryID:    input.CategoryID,
		Text:          input.Text,
		Type:          input.Type,
		Difficulty:    input.Difficulty,
		Options:       input.Options,
		CorrectAnswer: input.CorrectAnswer,
		Tags:          input.Tags,
	}
	return question, s.repo.Create(question)
}

type UpdateQuestionInput struct {
	CategoryID    string   `json:"category_id"`
	Text          string   `json:"text"`
	Type          string   `json:"type"       binding:"omitempty,oneof=mcq true_false open sentence_completion"`
	Difficulty    string   `json:"difficulty" binding:"omitempty,oneof=easy medium hard"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"correct_answer"`
	Tags          []string `json:"tags"`
}

func (s *QuestionService) Update(bankID, id string, input UpdateQuestionInput) (*model.Question, error) {
	question, err := s.repo.FindByBankAndID(bankID, id)
	if err != nil {
		return nil, err
	}
	if input.CategoryID != "" {
		if _, err := s.categoryRepo.FindByBankAndID(bankID, input.CategoryID); err != nil {
			return nil, err
		}
		question.CategoryID = input.CategoryID
	}
	if input.Text != "" {
		question.Text = input.Text
	}
	if input.Type != "" {
		question.Type = input.Type
	}
	if input.Difficulty != "" {
		question.Difficulty = input.Difficulty
	}
	if input.Options != nil {
		question.Options = input.Options
	}
	if input.CorrectAnswer != "" {
		question.CorrectAnswer = input.CorrectAnswer
	}
	if input.Tags != nil {
		question.Tags = input.Tags
	}
	return question, s.repo.Save(question)
}

func (s *QuestionService) Delete(bankID, id string) error {
	return s.repo.Delete(bankID, id)
}
