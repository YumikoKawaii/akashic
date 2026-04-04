package repository

import (
	"errors"

	"github.com/lib/pq"
	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type QuestionFilter struct {
	CategoryIDs []string
	Difficulty  *string
	Types       []string
	Tags        []string
}

type QuestionRepository interface {
	FindByBank(bankID string, filter QuestionFilter) ([]model.Question, error)
	FindByBankAndDifficulty(bankID, difficulty string, filter QuestionFilter) ([]model.Question, error)
	FindByBankAndID(bankID, id string) (*model.Question, error)
	Create(question *model.Question) error
	BulkCreate(questions []*model.Question) error
	Save(question *model.Question) error
	Delete(bankID, id string) error
}

type questionRepo struct {
	db *gorm.DB
}

func NewQuestionRepo(db *gorm.DB) QuestionRepository {
	return &questionRepo{db: db}
}

func (r *questionRepo) FindByBank(bankID string, filter QuestionFilter) ([]model.Question, error) {
	q := r.db.Where("bank_id = ?", bankID)
	q = applyQuestionFilter(q, filter)
	var questions []model.Question
	return questions, q.Preload("Category").Order("created_at DESC").Find(&questions).Error
}

func (r *questionRepo) FindByBankAndDifficulty(bankID, difficulty string, filter QuestionFilter) ([]model.Question, error) {
	q := r.db.Where("bank_id = ? AND difficulty = ?", bankID, difficulty)
	q = applyQuestionFilter(q, filter)
	var questions []model.Question
	return questions, q.Find(&questions).Error
}

func (r *questionRepo) FindByBankAndID(bankID, id string) (*model.Question, error) {
	var question model.Question
	err := r.db.Preload("Category").First(&question, "bank_id = ? AND id = ?", bankID, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &question, err
}

func (r *questionRepo) Create(question *model.Question) error {
	return r.db.Create(question).Error
}

func (r *questionRepo) BulkCreate(questions []*model.Question) error {
	return r.db.Create(questions).Error
}

func (r *questionRepo) Save(question *model.Question) error {
	return r.db.Save(question).Error
}

func (r *questionRepo) Delete(bankID, id string) error {
	result := r.db.Delete(&model.Question{}, "bank_id = ? AND id = ?", bankID, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func applyQuestionFilter(q *gorm.DB, filter QuestionFilter) *gorm.DB {
	if len(filter.CategoryIDs) > 0 {
		q = q.Where("category_id = ANY(?)", pq.Array(filter.CategoryIDs))
	}
	if filter.Difficulty != nil {
		q = q.Where("difficulty = ?", *filter.Difficulty)
	}
	if len(filter.Types) > 0 {
		q = q.Where("type = ANY(?)", pq.Array(filter.Types))
	}
	if len(filter.Tags) > 0 {
		q = q.Where("tags && ?", pq.Array(filter.Tags))
	}
	return q
}
