package service

import (
	"github.com/lib/pq"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/uow"
)

type QuestionService struct {
	uow          *uow.UnitOfWork
	repo         repository.QuestionRepository
	bankRepo     repository.BankRepository
	categoryRepo repository.CategoryRepository
}

func NewQuestionService(
	u *uow.UnitOfWork,
	repo repository.QuestionRepository,
	bankRepo repository.BankRepository,
	categoryRepo repository.CategoryRepository,
) *QuestionService {
	return &QuestionService{uow: u, repo: repo, bankRepo: bankRepo, categoryRepo: categoryRepo}
}

func (s *QuestionService) List(bankID int, f repository.QuestionFilter) ([]model.Question, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}
	return s.repo.FindByBank(bankID, f)
}

func (s *QuestionService) GetByID(bankID, id int) (*model.Question, error) {
	q, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if q.BankID != bankID {
		return nil, ErrForbidden
	}
	return q, nil
}

type CreateQuestionInput struct {
	CategoryID int               `json:"category_id" binding:"required"`
	Type       string            `json:"type"        binding:"required"`
	Difficulty string            `json:"difficulty"  binding:"required"`
	Tags       []string          `json:"tags"`
	Content    string            `json:"content"     binding:"required"`
	Answer     string            `json:"answer"`
	Options    []model.MCQOption `json:"options"`
	Answers    []string          `json:"answers"`
}

func (s *QuestionService) Create(bankID int, input CreateQuestionInput) (*model.Question, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}
	cat, err := s.categoryRepo.FindByID(input.CategoryID)
	if err != nil {
		return nil, err
	}
	if cat.BankID != bankID {
		return nil, ErrForbidden
	}

	q := &model.Question{
		BankID:     bankID,
		CategoryID: input.CategoryID,
		Type:       input.Type,
		Difficulty: input.Difficulty,
		Tags:       pq.StringArray(input.Tags),
	}

	tx := s.uow.Begin()
	defer tx.Rollback()

	if err := tx.Questions.Create(q); err != nil {
		return nil, err
	}

	if input.Type == "mcq" {
		if err := tx.Questions.CreateChoice(&model.QMultipleChoice{
			QuestionID: q.ID,
			Content:    input.Content,
			Options:    input.Options,
			Answers:    pq.StringArray(input.Answers),
		}); err != nil {
			return nil, err
		}
	} else {
		if err := tx.Questions.CreateItem(&model.QQuestionItem{
			QuestionID: q.ID,
			Content:    input.Content,
			Answer:     input.Answer,
		}); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.repo.FindByID(q.ID)
}

type UpdateQuestionInput struct {
	CategoryID *int              `json:"category_id"`
	Difficulty string            `json:"difficulty"`
	Tags       []string          `json:"tags"`
	Content    string            `json:"content"`
	Answer     string            `json:"answer"`
	Options    []model.MCQOption `json:"options"`
	Answers    []string          `json:"answers"`
}

func (s *QuestionService) Update(bankID, id int, input UpdateQuestionInput) (*model.Question, error) {
	q, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if q.BankID != bankID {
		return nil, ErrForbidden
	}
	if input.CategoryID != nil {
		cat, err := s.categoryRepo.FindByID(*input.CategoryID)
		if err != nil {
			return nil, err
		}
		if cat.BankID != bankID {
			return nil, ErrForbidden
		}
		q.CategoryID = *input.CategoryID
	}
	if input.Difficulty != "" {
		q.Difficulty = input.Difficulty
	}
	if input.Tags != nil {
		q.Tags = pq.StringArray(input.Tags)
	}
	if err := s.repo.Save(q); err != nil {
		return nil, err
	}

	if q.Choice != nil && input.Content != "" {
		q.Choice.Content = input.Content
		if input.Options != nil {
			q.Choice.Options = input.Options
		}
		if input.Answers != nil {
			q.Choice.Answers = pq.StringArray(input.Answers)
		}
		if err := s.repo.SaveChoice(q.Choice); err != nil {
			return nil, err
		}
	} else if q.Item != nil && input.Content != "" {
		q.Item.Content = input.Content
		if input.Answer != "" {
			q.Item.Answer = input.Answer
		}
		if err := s.repo.SaveItem(q.Item); err != nil {
			return nil, err
		}
	}

	return s.repo.FindByID(q.ID)
}

func (s *QuestionService) Delete(bankID, id int) error {
	q, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	if q.BankID != bankID {
		return ErrForbidden
	}
	return s.repo.SoftDelete(id)
}

func (s *QuestionService) Restore(bankID, id int) (*model.Question, error) {
	q, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if q.BankID != bankID {
		return nil, ErrForbidden
	}
	return q, s.repo.Restore(id)
}
