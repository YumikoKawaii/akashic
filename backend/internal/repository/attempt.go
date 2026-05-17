package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type AttemptRepository interface {
	FindByID(id int) (*model.TestAttempt, error)
	FindByTest(testID int) ([]model.TestAttempt, error)
	Create(a *model.TestAttempt) error
	Save(a *model.TestAttempt) error
	SoftDelete(id int) error
}

type attemptRepo struct{ db *gorm.DB }

func NewAttemptRepo(db *gorm.DB) AttemptRepository { return &attemptRepo{db} }

func (r *attemptRepo) FindByID(id int) (*model.TestAttempt, error) {
	var a model.TestAttempt
	err := r.db.
		Preload("Test.TestQuestions", func(db *gorm.DB) *gorm.DB { return db.Order("position ASC") }).
		Preload("Test.TestQuestions.Question.Item").
		Preload("Test.TestQuestions.Question.Choice").
		Preload("Test.TestQuestions.Question.Group").
		Preload("Test.TestQuestions.Question.Group.Passage").
		First(&a, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &a, err
}

func (r *attemptRepo) FindByTest(testID int) ([]model.TestAttempt, error) {
	var as []model.TestAttempt
	err := r.db.Where("test_id = ?", testID).Order("started_at DESC").Find(&as).Error
	return as, err
}

func (r *attemptRepo) Create(a *model.TestAttempt) error { return r.db.Create(a).Error }
func (r *attemptRepo) Save(a *model.TestAttempt) error   { return r.db.Save(a).Error }

func (r *attemptRepo) SoftDelete(id int) error {
	return r.db.Delete(&model.TestAttempt{}, id).Error
}
