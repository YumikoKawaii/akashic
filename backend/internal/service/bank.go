package service

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/membership"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
)

var (
	ErrForbidden  = errors.New("forbidden")
	ErrBadRequest = errors.New("bad request")
)

// Bank-role authorization (viewer/editor/owner) is enforced centrally by the
// membership authz interceptor (internal/rpchandler/authz_interceptor.go), so
// the methods below assume the caller has already cleared the required role.
// They own only business rules (valid target role, no self-removal) and the
// dual-write that keeps the authz cache in sync with membership changes.
type BankService struct {
	repo       repository.BankRepository
	memberRepo repository.MemberRepository
	userRepo   repository.UserRepository
	cache      membership.RoleCache
	visibility membership.VisibilityCache
}

func NewBankService(repo repository.BankRepository, memberRepo repository.MemberRepository, userRepo repository.UserRepository, cache membership.RoleCache, visibility membership.VisibilityCache) *BankService {
	return &BankService{repo: repo, memberRepo: memberRepo, userRepo: userRepo, cache: cache, visibility: visibility}
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
		// Non-member: a public bank grants an implicit read-only viewer; a
		// private bank is forbidden. (Mirrors the interceptor's effective role.)
		if bank.Visibility == model.VisibilityPublic {
			role = membership.RoleViewer
		} else {
			return nil, ErrForbidden
		}
	}
	return &model.BankWithRole{Bank: *bank, MyRole: role}, nil
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
		Role:   membership.RoleOwner,
	}); err != nil {
		return nil, err
	}
	s.cache.Set(bank.ID, userID, membership.RoleOwner)
	return &model.BankWithRole{Bank: *bank, MyRole: membership.RoleOwner}, nil
}

type UpdateBankInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (s *BankService) Update(bankID, userID int, input UpdateBankInput) (*model.BankWithRole, error) {
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

func (s *BankService) Delete(bankID int) error {
	if err := s.repo.SoftDelete(bankID); err != nil {
		return err
	}
	// A deleted bank must stop granting public access.
	s.visibility.SetPrivate(bankID)
	return nil
}

func (s *BankService) SetVisibility(bankID, userID int, visibility string) (*model.BankWithRole, error) {
	if visibility != model.VisibilityPrivate && visibility != model.VisibilityPublic {
		return nil, ErrBadRequest
	}
	bank, err := s.repo.FindByID(bankID)
	if err != nil {
		return nil, err
	}
	bank.Visibility = visibility
	if err := s.repo.Save(bank); err != nil {
		return nil, err
	}
	if visibility == model.VisibilityPublic {
		s.visibility.SetPublic(bankID)
	} else {
		s.visibility.SetPrivate(bankID)
	}
	return s.GetByID(bankID, userID)
}

func (s *BankService) Restore(bankID, userID int) (*model.BankWithRole, error) {
	if err := s.repo.Restore(bankID); err != nil {
		return nil, err
	}
	return s.GetByID(bankID, userID)
}

// ── Members ────────────────────────────────────────────────────────────────────

func (s *BankService) ListMembers(bankID int) ([]model.BankMember, error) {
	return s.memberRepo.FindByBank(bankID)
}

type ShareInput struct {
	Email string `json:"email" binding:"required"`
	Role  string `json:"role"  binding:"required"`
}

func (s *BankService) AddMember(bankID int, input ShareInput) (*model.BankMember, error) {
	if input.Role != membership.RoleEditor && input.Role != membership.RoleViewer {
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
		s.cache.Set(bankID, target.ID, input.Role)
		return existing, nil
	}
	m := &model.BankMember{BankID: bankID, UserID: target.ID, Role: input.Role}
	if err := s.memberRepo.Create(m); err != nil {
		return nil, err
	}
	s.cache.Set(bankID, target.ID, input.Role)
	return m, nil
}

func (s *BankService) RemoveMember(bankID, requesterID, targetUserID int) error {
	if requesterID == targetUserID {
		return ErrForbidden
	}
	if err := s.memberRepo.SoftDelete(bankID, targetUserID); err != nil {
		return err
	}
	s.cache.Delete(bankID, targetUserID)
	return nil
}

func (s *BankService) UpdateMemberRole(bankID, targetUserID int, role string) (*model.BankMember, error) {
	if role != membership.RoleEditor && role != membership.RoleViewer {
		return nil, ErrBadRequest
	}
	m, err := s.memberRepo.FindByBankAndUser(bankID, targetUserID)
	if err != nil {
		return nil, err
	}
	m.Role = role
	if err := s.memberRepo.Save(m); err != nil {
		return nil, err
	}
	s.cache.Set(bankID, targetUserID, role)
	return m, nil
}
