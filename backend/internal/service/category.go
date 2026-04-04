package service

import (
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
)

type CategoryService struct {
	repo     repository.CategoryRepository
	bankRepo repository.BankRepository
}

func NewCategoryService(repo repository.CategoryRepository, bankRepo repository.BankRepository) *CategoryService {
	return &CategoryService{repo: repo, bankRepo: bankRepo}
}

func (s *CategoryService) ListByBank(bankID string) ([]model.Category, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}
	return s.repo.FindByBank(bankID)
}

type CreateCategoryInput struct {
	Name        string `json:"name"        binding:"required"`
	Description string `json:"description"`
}

func (s *CategoryService) Create(bankID string, input CreateCategoryInput) (*model.Category, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}
	category := &model.Category{
		BankID:      bankID,
		Name:        input.Name,
		Description: input.Description,
	}
	return category, s.repo.Create(category)
}

type UpdateCategoryInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (s *CategoryService) Update(bankID, id string, input UpdateCategoryInput) (*model.Category, error) {
	category, err := s.repo.FindByBankAndID(bankID, id)
	if err != nil {
		return nil, err
	}
	if input.Name != "" {
		category.Name = input.Name
	}
	category.Description = input.Description
	return category, s.repo.Save(category)
}

func (s *CategoryService) Delete(bankID, id string) error {
	return s.repo.Delete(bankID, id)
}
