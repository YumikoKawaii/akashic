package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type BankRepository interface {
	FindAll() ([]model.Bank, error)
	FindAllForUser(userID string) ([]model.BankWithRole, error)
	FindByID(id string) (*model.Bank, error)
	FindByIDForUser(id, userID string) (*model.BankWithRole, error)
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

// FindAllForUser returns banks where the user is a member or the bank has no owner (legacy).
// Legacy banks (owner_id IS NULL) are returned with role 'editor'.
func (r *bankRepo) FindAllForUser(userID string) ([]model.BankWithRole, error) {
	type row struct {
		model.Bank
		MyRole *string
	}
	var rows []row
	err := r.db.Raw(`
		SELECT b.*, bm.role AS my_role
		FROM banks b
		LEFT JOIN bank_members bm ON b.id = bm.bank_id AND bm.user_id = ?
		WHERE bm.user_id = ? OR b.owner_id IS NULL
		ORDER BY b.created_at DESC
	`, userID, userID).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	result := make([]model.BankWithRole, len(rows))
	for i, row := range rows {
		result[i] = model.BankWithRole{Bank: row.Bank}
		if row.MyRole != nil {
			result[i].MyRole = *row.MyRole
		} else {
			result[i].MyRole = "editor" // legacy bank
		}
	}
	return result, nil
}

func (r *bankRepo) FindByID(id string) (*model.Bank, error) {
	var bank model.Bank
	err := r.db.First(&bank, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &bank, err
}

// FindByIDForUser returns a bank with the user's role, or ErrNotFound if no access.
func (r *bankRepo) FindByIDForUser(id, userID string) (*model.BankWithRole, error) {
	type row struct {
		model.Bank
		MyRole *string
	}
	var r2 row
	err := r.db.Raw(`
		SELECT b.*, bm.role AS my_role
		FROM banks b
		LEFT JOIN bank_members bm ON b.id = bm.bank_id AND bm.user_id = ?
		WHERE b.id = ? AND (bm.user_id = ? OR b.owner_id IS NULL)
	`, userID, id, userID).Scan(&r2).Error
	if err != nil {
		return nil, err
	}
	if r2.Bank.ID == "" {
		return nil, ErrNotFound
	}
	result := &model.BankWithRole{Bank: r2.Bank}
	if r2.MyRole != nil {
		result.MyRole = *r2.MyRole
	} else {
		result.MyRole = "editor"
	}
	return result, nil
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
