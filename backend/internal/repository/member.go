package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type MemberRepository interface {
	FindByBank(bankID int) ([]model.BankMember, error)
	FindByBankAndUser(bankID, userID int) (*model.BankMember, error)
	GetRole(bankID, userID int) (string, error)
	Create(m *model.BankMember) error
	Save(m *model.BankMember) error
	SoftDelete(bankID, userID int) error
}

type memberRepo struct{ db *gorm.DB }

func NewMemberRepo(db *gorm.DB) MemberRepository { return &memberRepo{db} }

func (r *memberRepo) FindByBank(bankID int) ([]model.BankMember, error) {
	var ms []model.BankMember
	err := r.db.Preload("User").Where("bank_id = ?", bankID).Order("created_at ASC").Find(&ms).Error
	return ms, err
}

func (r *memberRepo) FindByBankAndUser(bankID, userID int) (*model.BankMember, error) {
	var m model.BankMember
	err := r.db.Where("bank_id = ? AND user_id = ?", bankID, userID).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &m, err
}

func (r *memberRepo) GetRole(bankID, userID int) (string, error) {
	var m model.BankMember
	err := r.db.Where("bank_id = ? AND user_id = ?", bankID, userID).First(&m).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return m.Role, nil
}

func (r *memberRepo) Create(m *model.BankMember) error { return r.db.Create(m).Error }
func (r *memberRepo) Save(m *model.BankMember) error   { return r.db.Save(m).Error }

func (r *memberRepo) SoftDelete(bankID, userID int) error {
	return r.db.Where("bank_id = ? AND user_id = ?", bankID, userID).Delete(&model.BankMember{}).Error
}
