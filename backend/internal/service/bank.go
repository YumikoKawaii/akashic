package service

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
)

var (
	ErrForbidden   = errors.New("forbidden")
	ErrBadRequest  = errors.New("bad request")
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

func (s *BankService) List(userID string) ([]model.BankWithRole, error) {
	return s.repo.FindAllForUser(userID)
}

func (s *BankService) GetByID(bankID, userID string) (*model.BankWithRole, error) {
	return s.repo.FindByIDForUser(bankID, userID)
}

// requireRole checks that userID has at least minRole on the bank.
// Legacy banks (owner_id IS NULL) grant editor access to everyone.
func (s *BankService) requireRole(bankID, userID, minRole string) error {
	bank, err := s.repo.FindByID(bankID)
	if err != nil {
		return err
	}
	var role string
	if bank.OwnerID == nil {
		role = "editor" // legacy bank: open to all authenticated users
	} else {
		role, err = s.memberRepo.GetRole(bankID, userID)
		if err != nil {
			return err
		}
		if role == "" {
			return ErrForbidden
		}
	}
	if roleLevel(role) < roleLevel(minRole) {
		return ErrForbidden
	}
	return nil
}

type CreateBankInput struct {
	Name          string           `json:"name"           binding:"required"`
	Description   string           `json:"description"`
	DefaultConfig model.TestConfig `json:"default_config"`
}

func (s *BankService) Create(input CreateBankInput, userID string) (*model.BankWithRole, error) {
	bank := &model.Bank{
		Name:          input.Name,
		Description:   input.Description,
		DefaultConfig: input.DefaultConfig,
		OwnerID:       &userID,
	}
	if err := s.repo.Create(bank); err != nil {
		return nil, err
	}
	// Make creator owner
	if err := s.memberRepo.Add(&model.BankMember{
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

func (s *BankService) Update(bankID, userID string, input UpdateBankInput) (*model.BankWithRole, error) {
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
	return s.repo.FindByIDForUser(bankID, userID)
}

func (s *BankService) UpdateDefaultConfig(bankID, userID string, config model.TestConfig) (*model.BankWithRole, error) {
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
	return s.repo.FindByIDForUser(bankID, userID)
}

func (s *BankService) DeleteBank(bankID, userID string) error {
	if err := s.requireRole(bankID, userID, "owner"); err != nil {
		return err
	}
	return s.repo.Delete(bankID)
}

// ── Sharing ────────────────────────────────────────────────────────────────────

func (s *BankService) ListMembers(bankID, userID string) ([]model.BankMember, error) {
	if err := s.requireRole(bankID, userID, "viewer"); err != nil {
		return nil, err
	}
	return s.memberRepo.List(bankID)
}

type ShareInput struct {
	Email string `json:"email" binding:"required"`
	Role  string `json:"role"  binding:"required"`
}

func (s *BankService) AddMember(bankID, userID string, input ShareInput) (*model.BankMember, error) {
	if err := s.requireRole(bankID, userID, "owner"); err != nil {
		return nil, err
	}
	if input.Role != "editor" && input.Role != "viewer" {
		return nil, ErrBadRequest
	}
	target, err := s.userRepo.FindByEmail(input.Email)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrBadRequest // user hasn't logged in yet
		}
		return nil, err
	}
	// Check if already a member
	existing, err := s.memberRepo.GetRole(bankID, target.ID)
	if err != nil {
		return nil, err
	}
	if existing != "" {
		// Update role instead
		if err := s.memberRepo.UpdateRole(bankID, target.ID, input.Role); err != nil {
			return nil, err
		}
	} else {
		if err := s.memberRepo.Add(&model.BankMember{
			BankID: bankID,
			UserID: target.ID,
			Role:   input.Role,
		}); err != nil {
			return nil, err
		}
	}
	members, err := s.memberRepo.List(bankID)
	if err != nil {
		return nil, err
	}
	for i := range members {
		if members[i].UserID == target.ID {
			return &members[i], nil
		}
	}
	return nil, nil
}

func (s *BankService) RemoveMember(bankID, requesterID, targetUserID string) error {
	if err := s.requireRole(bankID, requesterID, "owner"); err != nil {
		return err
	}
	// Can't remove yourself if you're the owner
	if requesterID == targetUserID {
		return ErrForbidden
	}
	return s.memberRepo.Remove(bankID, targetUserID)
}
