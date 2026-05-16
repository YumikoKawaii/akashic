package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type BankRepository interface {
	FindAllForUser(userID int) ([]model.BankWithRole, error)
	FindByID(id int) (*model.Bank, error)
	Create(b *model.Bank) error
	Save(b *model.Bank) error
	SoftDelete(id int) error
	Restore(id int) error
}

type bankRepo struct{ db *gorm.DB }

func NewBankRepo(db *gorm.DB) BankRepository { return &bankRepo{db} }

func (r *bankRepo) FindAllForUser(userID int) ([]model.BankWithRole, error) {
	type row struct {
		model.Bank
		MyRole string
	}
	var rows []row
	err := r.db.Raw(`
		SELECT b.*, bm.role AS my_role
		FROM banks b
		JOIN bank_members bm ON bm.bank_id = b.id AND bm.user_id = ? AND bm.deleted_at IS NULL
		WHERE b.deleted_at IS NULL
		ORDER BY b.created_at DESC
	`, userID).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]model.BankWithRole, len(rows))
	for i, r := range rows {
		out[i] = model.BankWithRole{Bank: r.Bank, MyRole: r.MyRole}
	}
	return out, nil
}

func (r *bankRepo) FindByID(id int) (*model.Bank, error) {
	var b model.Bank
	err := r.db.First(&b, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &b, err
}

func (r *bankRepo) Create(b *model.Bank) error { return r.db.Create(b).Error }
func (r *bankRepo) Save(b *model.Bank) error   { return r.db.Save(b).Error }

func (r *bankRepo) SoftDelete(id int) error {
	return r.db.Delete(&model.Bank{}, id).Error
}

func (r *bankRepo) Restore(id int) error {
	return r.db.Unscoped().Model(&model.Bank{}).Where("id = ?", id).Update("deleted_at", nil).Error
}
