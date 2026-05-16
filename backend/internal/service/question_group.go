package service

import (
	"github.com/lib/pq"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/uow"
)

type QuestionGroupService struct {
	uow          *uow.UnitOfWork
	groupRepo    repository.QuestionGroupRepository
	bankRepo     repository.BankRepository
	categoryRepo repository.CategoryRepository
}

func NewQuestionGroupService(
	u *uow.UnitOfWork,
	groupRepo repository.QuestionGroupRepository,
	bankRepo repository.BankRepository,
	categoryRepo repository.CategoryRepository,
) *QuestionGroupService {
	return &QuestionGroupService{uow: u, groupRepo: groupRepo, bankRepo: bankRepo, categoryRepo: categoryRepo}
}

func (s *QuestionGroupService) List(bankID int, f repository.GroupFilter) ([]model.QuestionGroup, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}
	return s.groupRepo.FindByBank(bankID, f)
}

func (s *QuestionGroupService) GetByID(bankID, id int) (*model.QuestionGroup, error) {
	g, err := s.groupRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if g.BankID != bankID {
		return nil, ErrForbidden
	}
	return g, nil
}

type GroupQuestionInput struct {
	Content string            `json:"content" binding:"required"`
	Answer  string            `json:"answer"`
	Options []model.MCQOption `json:"options"`
	Answers []string          `json:"answers"`
	Tags    []string          `json:"tags"`
}

type CreateGroupInput struct {
	CategoryID int                  `json:"category_id" binding:"required"`
	PassageID  *int                 `json:"passage_id"`
	Type       string               `json:"type"        binding:"required"`
	Difficulty string               `json:"difficulty"  binding:"required"`
	Context    model.GroupContext   `json:"context"`
	Questions  []GroupQuestionInput `json:"questions"   binding:"required,min=1"`
}

func (s *QuestionGroupService) Create(bankID int, input CreateGroupInput) (*model.QuestionGroup, error) {
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

	group := &model.QuestionGroup{
		BankID:     bankID,
		CategoryID: input.CategoryID,
		PassageID:  input.PassageID,
		Type:       input.Type,
		Difficulty: input.Difficulty,
		Context:    input.Context,
	}

	tx := s.uow.Begin()
	defer tx.Rollback()

	if err := tx.QuestionGroups.Create(group); err != nil {
		return nil, err
	}

	isMCQ := input.Type == "mcq"
	for i, qi := range input.Questions {
		pos := int16(i + 1)
		q := &model.Question{
			BankID:     bankID,
			CategoryID: input.CategoryID,
			GroupID:    &group.ID,
			Type:       input.Type,
			Difficulty: input.Difficulty,
			Tags:       pq.StringArray(qi.Tags),
			Position:   &pos,
		}
		if err := tx.Questions.Create(q); err != nil {
			return nil, err
		}
		if isMCQ {
			if err := tx.Questions.CreateChoice(&model.QMultipleChoice{
				QuestionID: q.ID,
				Content:    qi.Content,
				Options:    qi.Options,
				Answers:    pq.StringArray(qi.Answers),
			}); err != nil {
				return nil, err
			}
		} else {
			if err := tx.Questions.CreateItem(&model.QQuestionItem{
				QuestionID: q.ID,
				Content:    qi.Content,
				Answer:     qi.Answer,
			}); err != nil {
				return nil, err
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.groupRepo.FindByID(group.ID)
}

type UpdateGroupInput struct {
	Difficulty string             `json:"difficulty"`
	Context    *model.GroupContext `json:"context"`
}

func (s *QuestionGroupService) Update(bankID, id int, input UpdateGroupInput) (*model.QuestionGroup, error) {
	g, err := s.groupRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if g.BankID != bankID {
		return nil, ErrForbidden
	}
	if input.Difficulty != "" {
		g.Difficulty = input.Difficulty
	}
	if input.Context != nil {
		g.Context = *input.Context
	}
	return g, s.groupRepo.Save(g)
}

func (s *QuestionGroupService) Delete(bankID, id int) error {
	g, err := s.groupRepo.FindByID(id)
	if err != nil {
		return err
	}
	if g.BankID != bankID {
		return ErrForbidden
	}
	return s.groupRepo.SoftDelete(id)
}

func (s *QuestionGroupService) Restore(bankID, id int) (*model.QuestionGroup, error) {
	g, err := s.groupRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if g.BankID != bankID {
		return nil, ErrForbidden
	}
	return g, s.groupRepo.Restore(id)
}
