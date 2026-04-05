package service

import (
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
)

type PassageService struct {
	repo         repository.PassageRepository
	bankRepo     repository.BankRepository
	categoryRepo repository.CategoryRepository
}

func NewPassageService(
	repo repository.PassageRepository,
	bankRepo repository.BankRepository,
	categoryRepo repository.CategoryRepository,
) *PassageService {
	return &PassageService{repo: repo, bankRepo: bankRepo, categoryRepo: categoryRepo}
}

func (s *PassageService) ListByBank(bankID string) ([]model.Passage, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}
	return s.repo.FindByBank(bankID)
}

func (s *PassageService) GetByID(bankID, id string) (*model.Passage, error) {
	return s.repo.FindByBankAndID(bankID, id)
}

type CreatePassageInput struct {
	CategoryID string `json:"category_id" binding:"required"`
	Title      string `json:"title"       binding:"required"`
	Body       string `json:"body"`
	Difficulty string `json:"difficulty"  binding:"required,oneof=easy medium hard"`
}

func (s *PassageService) Create(bankID string, input CreatePassageInput) (*model.Passage, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}
	if _, err := s.categoryRepo.FindByBankAndID(bankID, input.CategoryID); err != nil {
		return nil, err
	}
	passage := &model.Passage{
		BankID:     bankID,
		CategoryID: input.CategoryID,
		Title:      input.Title,
		Body:       input.Body,
		Difficulty: input.Difficulty,
	}
	return passage, s.repo.Create(passage)
}

type UpdatePassageInput struct {
	CategoryID string `json:"category_id"`
	Title      string `json:"title"`
	Body       string `json:"body"`
	Difficulty string `json:"difficulty" binding:"omitempty,oneof=easy medium hard"`
}

func (s *PassageService) Update(bankID, id string, input UpdatePassageInput) (*model.Passage, error) {
	passage, err := s.repo.FindByBankAndID(bankID, id)
	if err != nil {
		return nil, err
	}
	if input.CategoryID != "" {
		if _, err := s.categoryRepo.FindByBankAndID(bankID, input.CategoryID); err != nil {
			return nil, err
		}
		passage.CategoryID = input.CategoryID
	}
	if input.Title != "" {
		passage.Title = input.Title
	}
	if input.Body != "" {
		passage.Body = input.Body
	}
	if input.Difficulty != "" {
		passage.Difficulty = input.Difficulty
	}
	return passage, s.repo.Save(passage)
}

func (s *PassageService) Delete(bankID, id string) error {
	return s.repo.Delete(bankID, id)
}
