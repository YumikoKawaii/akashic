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
	FindByID(id int) (*model.Passage, error)
	Create(p *model.Passage) error
	Save(p *model.Passage) error
	SoftDelete(id int) error
	Restore(id int) error
}

type passageRepo struct{ db *gorm.DB }

func NewPassageRepo(db *gorm.DB) PassageRepository { return &passageRepo{db} }

func (r *passageRepo) FindByBank(bankID int, f PassageFilter) ([]model.Passage, error) {
	var ps []model.Passage
	q := r.db.Where("bank_id = ?", bankID)
	if f.CategoryID != nil {
		q = q.Where("category_id = ?", *f.CategoryID)
	}
	if f.Difficulty != "" {
		q = q.Where("difficulty = ?", f.Difficulty)
	}
	err := q.Preload("Category").Order("created_at DESC").Find(&ps).Error
	return ps, err
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
