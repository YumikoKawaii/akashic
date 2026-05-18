package repository

import (
	"errors"

	"github.com/lib/pq"
	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type QuestionFilter struct {
	CategoryIDs    []int
	GroupID        *int
	Type           string
	Types          []string
	Difficulty     string
	Tags           []string
	StandaloneOnly bool
	ExcludeIDs     []int
}

type QuestionRepository interface {
	FindByBank(bankID int, f QuestionFilter) ([]model.Question, error)
	FindByBankPaged(bankID int, f QuestionFilter, page, pageSize int) ([]model.Question, int64, error)
	FindByBankAndDifficulty(bankID int, difficulty string, f QuestionFilter) ([]model.Question, error)
	FindByGroup(groupID int) ([]model.Question, error)
	FindByID(id int) (*model.Question, error)
	Create(q *model.Question) error
	Save(q *model.Question) error
	SoftDelete(id int) error
	Restore(id int) error
	CreateItem(item *model.QQuestionItem) error
	SaveItem(item *model.QQuestionItem) error
	CreateChoice(choice *model.QMultipleChoice) error
	SaveChoice(choice *model.QMultipleChoice) error
}

type questionRepo struct{ db *gorm.DB }

func NewQuestionRepo(db *gorm.DB) QuestionRepository { return &questionRepo{db} }

func (r *questionRepo) FindByBank(bankID int, f QuestionFilter) ([]model.Question, error) {
	var qs []model.Question
	q := r.db.Where("bank_id = ?", bankID)
	q = applyQuestionFilter(q, f)
	err := q.Preload("Item").Preload("Choice").Order("created_at DESC").Find(&qs).Error
	return qs, err
}

func (r *questionRepo) FindByBankPaged(bankID int, f QuestionFilter, page, pageSize int) ([]model.Question, int64, error) {
	base := r.db.Model(&model.Question{}).Where("bank_id = ?", bankID)
	base = applyQuestionFilter(base, f)

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var qs []model.Question
	err := base.Preload("Item").Preload("Choice").
		Order("created_at DESC").
		Limit(pageSize).Offset((page - 1) * pageSize).
		Find(&qs).Error
	return qs, total, err
}

func (r *questionRepo) FindByBankAndDifficulty(bankID int, difficulty string, f QuestionFilter) ([]model.Question, error) {
	var qs []model.Question
	q := r.db.Where("bank_id = ? AND difficulty = ?", bankID, difficulty)
	q = applyQuestionFilter(q, f)
	err := q.Preload("Item").Preload("Choice").Order("RANDOM()").Find(&qs).Error
	return qs, err
}

func (r *questionRepo) FindByGroup(groupID int) ([]model.Question, error) {
	var qs []model.Question
	err := r.db.Where("group_id = ?", groupID).
		Preload("Item").Preload("Choice").
		Order("position ASC").Find(&qs).Error
	return qs, err
}

func (r *questionRepo) FindByID(id int) (*model.Question, error) {
	var q model.Question
	err := r.db.Preload("Item").Preload("Choice").First(&q, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &q, err
}

func (r *questionRepo) Create(q *model.Question) error { return r.db.Create(q).Error }
func (r *questionRepo) Save(q *model.Question) error   { return r.db.Save(q).Error }

func (r *questionRepo) SoftDelete(id int) error {
	return r.db.Delete(&model.Question{}, id).Error
}

func (r *questionRepo) Restore(id int) error {
	return r.db.Unscoped().Model(&model.Question{}).Where("id = ?", id).Update("deleted_at", nil).Error
}

func (r *questionRepo) CreateItem(item *model.QQuestionItem) error { return r.db.Create(item).Error }
func (r *questionRepo) SaveItem(item *model.QQuestionItem) error   { return r.db.Save(item).Error }

func (r *questionRepo) CreateChoice(choice *model.QMultipleChoice) error {
	return r.db.Create(choice).Error
}
func (r *questionRepo) SaveChoice(choice *model.QMultipleChoice) error {
	return r.db.Save(choice).Error
}

func applyQuestionFilter(q *gorm.DB, f QuestionFilter) *gorm.DB {
	if len(f.CategoryIDs) > 0 {
		q = q.Where("category_id IN ?", f.CategoryIDs)
	}
	if f.GroupID != nil {
		q = q.Where("group_id = ?", *f.GroupID)
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
	if len(f.Tags) > 0 {
		q = q.Where("tags && ?", pq.Array(f.Tags))
	}
	if f.StandaloneOnly {
		q = q.Where("group_id IS NULL")
	}
	if len(f.ExcludeIDs) > 0 {
		q = q.Where("id NOT IN ?", f.ExcludeIDs)
	}
	return q
}
