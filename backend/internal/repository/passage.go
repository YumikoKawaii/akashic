package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type PassageFilter struct {
	CategoryID *int
	Difficulty string
}

type PassageRepository interface {
	FindByBank(bankID int, f PassageFilter) ([]model.Passage, error)
	FindByBankPaged(bankID int, f PassageFilter, page, pageSize int) ([]model.Passage, int64, error)
	FindByID(id int) (*model.Passage, error)
	Create(p *model.Passage) error
	Save(p *model.Passage) error
	SoftDelete(id int) error
	Restore(id int) error
}

type passageRepo struct{ db *gorm.DB }

func NewPassageRepo(db *gorm.DB) PassageRepository { return &passageRepo{db} }

func applyPassageFilter(q *gorm.DB, f PassageFilter) *gorm.DB {
	if f.CategoryID != nil {
		q = q.Where("category_id = ?", *f.CategoryID)
	}
	if f.Difficulty != "" {
		q = q.Where("difficulty = ?", f.Difficulty)
	}
	return q
}

func (r *passageRepo) FindByBank(bankID int, f PassageFilter) ([]model.Passage, error) {
	var ps []model.Passage
	q := applyPassageFilter(r.db.Where("bank_id = ?", bankID), f)
	err := q.
		Preload("Category").
		Preload("Groups", "deleted_at IS NULL").
		Preload("Groups.Questions", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("position ASC")
		}).
		Order("created_at DESC").
		Find(&ps).Error
	return ps, err
}

func (r *passageRepo) FindByBankPaged(bankID int, f PassageFilter, page, pageSize int) ([]model.Passage, int64, error) {
	base := applyPassageFilter(r.db.Model(&model.Passage{}).Where("bank_id = ?", bankID), f)

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var ps []model.Passage
	err := base.
		Preload("Category").
		Preload("Groups", "deleted_at IS NULL").
		Preload("Groups.Questions", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("position ASC")
		}).
		Order("created_at DESC").
		Limit(pageSize).Offset((page - 1) * pageSize).
		Find(&ps).Error
	return ps, total, err
}

func (r *passageRepo) FindByID(id int) (*model.Passage, error) {
	var p model.Passage
	err := r.db.
		Preload("Category").
		Preload("Groups", "deleted_at IS NULL").
		Preload("Groups.Questions", func(db *gorm.DB) *gorm.DB {
			return db.Where("deleted_at IS NULL").Order("position ASC")
		}).
		Preload("Groups.Questions.Item").
		Preload("Groups.Questions.Choice").
		First(&p, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &p, err
}

func (r *passageRepo) Create(p *model.Passage) error { return r.db.Create(p).Error }
func (r *passageRepo) Save(p *model.Passage) error   { return r.db.Save(p).Error }

func (r *passageRepo) SoftDelete(id int) error {
	return r.db.Delete(&model.Passage{}, id).Error
}

func (r *passageRepo) Restore(id int) error {
	return r.db.Unscoped().Model(&model.Passage{}).Where("id = ?", id).Update("deleted_at", nil).Error
}
