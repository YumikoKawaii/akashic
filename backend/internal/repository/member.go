package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type MemberRepository interface {
	GetRole(bankID, userID string) (string, error) // "" if not a member
	List(bankID string) ([]model.BankMember, error)
	Add(m *model.BankMember) error
	UpdateRole(bankID, userID, role string) error
	Remove(bankID, userID string) error
}

type memberRepo struct {
	db *gorm.DB
}

func NewMemberRepo(db *gorm.DB) MemberRepository {
	return &memberRepo{db: db}
}

func (r *memberRepo) GetRole(bankID, userID string) (string, error) {
	var m model.BankMember
	err := r.db.First(&m, "bank_id = ? AND user_id = ?", bankID, userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return m.Role, nil
}

func (r *memberRepo) List(bankID string) ([]model.BankMember, error) {
	var members []model.BankMember
	err := r.db.Preload("User").Where("bank_id = ?", bankID).Order("created_at ASC").Find(&members).Error
	return members, err
}

func (r *memberRepo) Add(m *model.BankMember) error {
	return r.db.Create(m).Error
}

func (r *memberRepo) UpdateRole(bankID, userID, role string) error {
	result := r.db.Model(&model.BankMember{}).
		Where("bank_id = ? AND user_id = ?", bankID, userID).
		Update("role", role)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *memberRepo) Remove(bankID, userID string) error {
	result := r.db.Delete(&model.BankMember{}, "bank_id = ? AND user_id = ?", bankID, userID)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}
