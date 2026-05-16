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

func (s *CategoryService) List(bankID int) ([]model.Category, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}
	return s.repo.FindByBank(bankID)
}

type CreateCategoryInput struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

func (s *CategoryService) Create(bankID int, input CreateCategoryInput) (*model.Category, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}
	c := &model.Category{BankID: bankID, Name: input.Name, Description: input.Description}
	return c, s.repo.Create(c)
}

type UpdateCategoryInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (s *CategoryService) Update(bankID, id int, input UpdateCategoryInput) (*model.Category, error) {
	c, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if c.BankID != bankID {
		return nil, ErrForbidden
	}
	if input.Name != "" {
		c.Name = input.Name
	}
	c.Description = input.Description
	return c, s.repo.Save(c)
}

func (s *CategoryService) Delete(bankID, id int) error {
	c, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	if c.BankID != bankID {
		return ErrForbidden
	}
	return s.repo.SoftDelete(id)
}

func (s *CategoryService) Restore(bankID, id int) (*model.Category, error) {
	c, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if c.BankID != bankID {
		return nil, ErrForbidden
	}
	return c, s.repo.Restore(id)
}
