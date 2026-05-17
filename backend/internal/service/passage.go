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

func (s *PassageService) List(bankID int, f repository.PassageFilter) ([]model.Passage, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}
	return s.repo.FindByBank(bankID, f)
}

type PassagePage struct {
	Data     []model.Passage `json:"data"`
	Total    int64           `json:"total"`
	Page     int             `json:"page"`
	PageSize int             `json:"page_size"`
}

func (s *PassageService) ListPaged(bankID int, f repository.PassageFilter, page, pageSize int) (*PassagePage, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}
	ps, total, err := s.repo.FindByBankPaged(bankID, f, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &PassagePage{Data: ps, Total: total, Page: page, PageSize: pageSize}, nil
}

func (s *PassageService) GetByID(bankID, id int) (*model.Passage, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if p.BankID != bankID {
		return nil, ErrForbidden
	}
	return p, nil
}

type CreatePassageInput struct {
	CategoryID int    `json:"category_id" binding:"required"`
	Title      string `json:"title"       binding:"required"`
	Difficulty string `json:"difficulty"  binding:"required"`
}

func (s *PassageService) Create(bankID int, input CreatePassageInput) (*model.Passage, error) {
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
	passage := &model.Passage{
		BankID:     bankID,
		CategoryID: input.CategoryID,
		Title:      input.Title,
		Difficulty: input.Difficulty,
	}
	return passage, s.repo.Create(passage)
}

type UpdatePassageInput struct {
	CategoryID *int   `json:"category_id"`
	Title      string `json:"title"`
	Difficulty string `json:"difficulty"`
}

func (s *PassageService) Update(bankID, id int, input UpdatePassageInput) (*model.Passage, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if p.BankID != bankID {
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
		p.CategoryID = *input.CategoryID
	}
	if input.Title != "" {
		p.Title = input.Title
	}
	if input.Difficulty != "" {
		p.Difficulty = input.Difficulty
	}
	return p, s.repo.Save(p)
}

func (s *PassageService) Delete(bankID, id int) error {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	if p.BankID != bankID {
		return ErrForbidden
	}
	return s.repo.SoftDelete(id)
}

func (s *PassageService) Restore(bankID, id int) (*model.Passage, error) {
	p, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if p.BankID != bankID {
		return nil, ErrForbidden
	}
	return p, s.repo.Restore(id)
}
