package repository

import (
	"errors"

	"github.com/lib/pq"
	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type PassageFilter struct {
	CategoryIDs []string
}

type PassageRepository interface {
	FindByBank(bankID string) ([]model.Passage, error)
	FindByBankAndDifficulty(bankID, difficulty string, filter PassageFilter) ([]model.Passage, error)
	FindByBankAndID(bankID, id string) (*model.Passage, error)
	Create(passage *model.Passage) error
	Save(passage *model.Passage) error
	Delete(bankID, id string) error
}

type passageRepo struct {
	db *gorm.DB
}

func NewPassageRepo(db *gorm.DB) PassageRepository {
	return &passageRepo{db: db}
}

func (r *passageRepo) FindByBank(bankID string) ([]model.Passage, error) {
	var passages []model.Passage
	return passages, r.db.Where("bank_id = ?", bankID).
		Preload("Category").
		Preload("Questions").
		Order("created_at DESC").
		Find(&passages).Error
}

func (r *passageRepo) FindByBankAndDifficulty(bankID, difficulty string, filter PassageFilter) ([]model.Passage, error) {
	q := r.db.Where("bank_id = ? AND difficulty = ?", bankID, difficulty)
	if len(filter.CategoryIDs) > 0 {
		q = q.Where("category_id = ANY(?)", pq.Array(filter.CategoryIDs))
	}
	var passages []model.Passage
	return passages, q.Preload("Questions").Find(&passages).Error
}

func (r *passageRepo) FindByBankAndID(bankID, id string) (*model.Passage, error) {
	var passage model.Passage
	err := r.db.
		Preload("Category").
		Preload("Questions").
		First(&passage, "bank_id = ? AND id = ?", bankID, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &passage, err
}

func (r *passageRepo) Create(passage *model.Passage) error {
	return r.db.Create(passage).Error
}

func (r *passageRepo) Save(passage *model.Passage) error {
	return r.db.Save(passage).Error
}

func (r *passageRepo) Delete(bankID, id string) error {
	result := r.db.Delete(&model.Passage{}, "bank_id = ? AND id = ?", bankID, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}
