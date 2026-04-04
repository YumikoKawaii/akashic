package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type BankRepository interface {
	FindAll() ([]model.Bank, error)
	FindByID(id string) (*model.Bank, error)
	Create(bank *model.Bank) error
	Save(bank *model.Bank) error
	Delete(id string) error
}

type bankRepo struct {
	db *gorm.DB
}

func NewBankRepo(db *gorm.DB) BankRepository {
	return &bankRepo{db: db}
}

func (r *bankRepo) FindAll() ([]model.Bank, error) {
	var banks []model.Bank
	return banks, r.db.Order("created_at DESC").Find(&banks).Error
}

func (r *bankRepo) FindByID(id string) (*model.Bank, error) {
	var bank model.Bank
	err := r.db.First(&bank, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &bank, err
}

func (r *bankRepo) Create(bank *model.Bank) error {
	return r.db.Create(bank).Error
}

func (r *bankRepo) Save(bank *model.Bank) error {
	return r.db.Save(bank).Error
}

func (r *bankRepo) Delete(id string) error {
	result := r.db.Delete(&model.Bank{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}
