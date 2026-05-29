package service

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
)

var (
	ErrForbidden  = errors.New("forbidden")
	ErrBadRequest = errors.New("bad request")
)

func roleLevel(role string) int {
	switch role {
	case "owner":
		return 3
	case "editor":
		return 2
	case "viewer":
		return 1
	default:
		return 0
	}
}

type BankService struct {
	repo       repository.BankRepository
	memberRepo repository.MemberRepository
	userRepo   repository.UserRepository
}

func NewBankService(repo repository.BankRepository, memberRepo repository.MemberRepository, userRepo repository.UserRepository) *BankService {
	return &BankService{repo: repo, memberRepo: memberRepo, userRepo: userRepo}
}

func (s *BankService) List(userID int) ([]model.BankWithRole, error) {
	return s.repo.FindAllForUser(userID)
}

func (s *BankService) GetByID(bankID, userID int) (*model.BankWithRole, error) {
	bank, err := s.repo.FindByID(bankID)
	if err != nil {
		return nil, err
	}
	role, err := s.memberRepo.GetRole(bankID, userID)
	if err != nil {
		return nil, err
	}
	if role == "" {
		return nil, ErrForbidden
	}
	return &model.BankWithRole{Bank: *bank, MyRole: role}, nil
}

func (s *BankService) requireRole(bankID, userID int, minRole string) error {
	role, err := s.memberRepo.GetRole(bankID, userID)
	if err != nil {
		return err
	}
	if role == "" {
		return ErrForbidden
	}
	if roleLevel(role) < roleLevel(minRole) {
		return ErrForbidden
	}
	return nil
}

type CreateBankInput struct {
	Name          string           `json:"name" binding:"required"`
	Description   string           `json:"description"`
	DefaultConfig model.TestConfig `json:"default_config"`
}

func (s *BankService) Create(input CreateBankInput, userID int) (*model.BankWithRole, error) {
	bank := &model.Bank{
		Name:          input.Name,
		Description:   input.Description,
		DefaultConfig: input.DefaultConfig,
		OwnerID:       &userID,
	}
	if err := s.repo.Create(bank); err != nil {
		return nil, err
	}
	if err := s.memberRepo.Create(&model.BankMember{
		BankID: bank.ID,
		UserID: userID,
		Role:   "owner",
	}); err != nil {
		return nil, err
	}
	return &model.BankWithRole{Bank: *bank, MyRole: "owner"}, nil
}

type UpdateBankInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (s *BankService) Update(bankID, userID int, input UpdateBankInput) (*model.BankWithRole, error) {
	if err := s.requireRole(bankID, userID, "editor"); err != nil {
		return nil, err
	}
	bank, err := s.repo.FindByID(bankID)
	if err != nil {
		return nil, err
	}
	if input.Name != "" {
		bank.Name = input.Name
	}
	bank.Description = input.Description
	if err := s.repo.Save(bank); err != nil {
		return nil, err
	}
	return s.GetByID(bankID, userID)
}

func (s *BankService) UpdateDefaultConfig(bankID, userID int, config model.TestConfig) (*model.BankWithRole, error) {
	if err := s.requireRole(bankID, userID, "editor"); err != nil {
		return nil, err
	}
	bank, err := s.repo.FindByID(bankID)
	if err != nil {
		return nil, err
	}
	bank.DefaultConfig = config
	if err := s.repo.Save(bank); err != nil {
		return nil, err
	}
	return s.GetByID(bankID, userID)
}

func (s *BankService) Delete(bankID, userID int) error {
	if err := s.requireRole(bankID, userID, "owner"); err != nil {
		return err
	}
	return s.repo.SoftDelete(bankID)
}

func (s *BankService) Restore(bankID, userID int) (*model.BankWithRole, error) {
	if err := s.requireRole(bankID, userID, "owner"); err != nil {
		return nil, err
	}
	if err := s.repo.Restore(bankID); err != nil {
		return nil, err
	}
	return s.GetByID(bankID, userID)
}

// ── Members ────────────────────────────────────────────────────────────────────

func (s *BankService) ListMembers(bankID, userID int) ([]model.BankMember, error) {
	if err := s.requireRole(bankID, userID, "viewer"); err != nil {
		return nil, err
	}
	return s.memberRepo.FindByBank(bankID)
}

type ShareInput struct {
	Email string `json:"email" binding:"required"`
	Role  string `json:"role"  binding:"required"`
}

func (s *BankService) AddMember(bankID, userID int, input ShareInput) (*model.BankMember, error) {
	if err := s.requireRole(bankID, userID, "owner"); err != nil {
		return nil, err
	}
	if input.Role != "editor" && input.Role != "viewer" {
		return nil, ErrBadRequest
	}
	target, err := s.userRepo.FindByEmail(input.Email)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrBadRequest
		}
		return nil, err
	}
	existing, err := s.memberRepo.FindByBankAndUser(bankID, target.ID)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	if existing != nil {
		existing.Role = input.Role
		if err := s.memberRepo.Save(existing); err != nil {
			return nil, err
		}
		return existing, nil
	}
	m := &model.BankMember{BankID: bankID, UserID: target.ID, Role: input.Role}
	return m, s.memberRepo.Create(m)
}

func (s *BankService) RemoveMember(bankID, requesterID, targetUserID int) error {
	if err := s.requireRole(bankID, requesterID, "owner"); err != nil {
		return err
	}
	if requesterID == targetUserID {
		return ErrForbidden
	}
	return s.memberRepo.SoftDelete(bankID, targetUserID)
}

func (s *BankService) UpdateMemberRole(bankID, requesterID, targetUserID int, role string) (*model.BankMember, error) {
	if err := s.requireRole(bankID, requesterID, "owner"); err != nil {
		return nil, err
	}
	if role != "editor" && role != "viewer" {
		return nil, ErrBadRequest
	}
	m, err := s.memberRepo.FindByBankAndUser(bankID, targetUserID)
	if err != nil {
		return nil, err
	}
	m.Role = role
	return m, s.memberRepo.Save(m)
}
