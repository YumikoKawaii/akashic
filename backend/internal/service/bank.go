package service

import (
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
)

type BankService struct {
	repo repository.BankRepository
}

func NewBankService(repo repository.BankRepository) *BankService {
	return &BankService{repo: repo}
}

func (s *BankService) List() ([]model.Bank, error) {
	return s.repo.FindAll()
}

func (s *BankService) GetByID(id string) (*model.Bank, error) {
	return s.repo.FindByID(id)
}

type CreateBankInput struct {
	Name          string           `json:"name"           binding:"required"`
	Description   string           `json:"description"`
	DefaultConfig model.TestConfig `json:"default_config"`
}

func (s *BankService) Create(input CreateBankInput) (*model.Bank, error) {
	bank := &model.Bank{
		Name:          input.Name,
		Description:   input.Description,
		DefaultConfig: input.DefaultConfig,
	}
	return bank, s.repo.Create(bank)
}

type UpdateBankInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (s *BankService) Update(id string, input UpdateBankInput) (*model.Bank, error) {
	bank, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if input.Name != "" {
		bank.Name = input.Name
	}
	bank.Description = input.Description
	return bank, s.repo.Save(bank)
}

func (s *BankService) UpdateDefaultConfig(id string, config model.TestConfig) (*model.Bank, error) {
	bank, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	bank.DefaultConfig = config
	return bank, s.repo.Save(bank)
}

func (s *BankService) Delete(id string) error {
	return s.repo.Delete(id)
}
