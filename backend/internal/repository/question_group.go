package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type GroupFilter struct {
	CategoryIDs []int
	PassageID   *int
	Type        string
	Types       []string
	Difficulty  string
	Tags        []string
}

type QuestionGroupRepository interface {
	FindByBank(bankID int, f GroupFilter) ([]model.QuestionGroup, error)
	FindByID(id int) (*model.QuestionGroup, error)
	Create(g *model.QuestionGroup) error
	Save(g *model.QuestionGroup) error
	SoftDelete(id int) error
	Restore(id int) error
}

type questionGroupRepo struct{ db *gorm.DB }

func NewQuestionGroupRepo(db *gorm.DB) QuestionGroupRepository {
	return &questionGroupRepo{db}
}

func (r *questionGroupRepo) FindByBank(bankID int, f GroupFilter) ([]model.QuestionGroup, error) {
	var gs []model.QuestionGroup
	q := r.db.Where("bank_id = ?", bankID)
	if len(f.CategoryIDs) > 0 {
		q = q.Where("category_id IN ?", f.CategoryIDs)
	}
	if f.PassageID != nil {
		q = q.Where("passage_id = ?", *f.PassageID)
	}
	if f.Type != "" {
		q = q.Where("type = ?", f.Type)
	}
	if len(f.Types) > 0 {
		q = q.Where("type IN ?", f.Types)
	}
	if f.Difficulty != "" {
		q = q.Where("difficulty = ?", f.Difficulty)
	}
	err := q.Find(&gs).Error
	return gs, err
}

func (r *questionGroupRepo) FindByID(id int) (*model.QuestionGroup, error) {
	var g model.QuestionGroup
	err := r.db.
		Preload("Questions", "deleted_at IS NULL", func(db *gorm.DB) *gorm.DB {
			return db.Order("position ASC")
		}).
		Preload("Questions.Item").
		Preload("Questions.Choice").
		First(&g, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &g, err
}

func (r *questionGroupRepo) Create(g *model.QuestionGroup) error { return r.db.Create(g).Error }
func (r *questionGroupRepo) Save(g *model.QuestionGroup) error   { return r.db.Save(g).Error }

func (r *questionGroupRepo) SoftDelete(id int) error {
	return r.db.Delete(&model.QuestionGroup{}, id).Error
}

func (r *questionGroupRepo) Restore(id int) error {
	return r.db.Unscoped().Model(&model.QuestionGroup{}).Where("id = ?", id).Update("deleted_at", nil).Error
}
