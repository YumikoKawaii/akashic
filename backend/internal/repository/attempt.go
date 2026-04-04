package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type AttemptRepository interface {
	FindByID(id string) (*model.TestAttempt, error)
	Create(attempt *model.TestAttempt) error
	Save(attempt *model.TestAttempt) error
}

type attemptRepo struct {
	db *gorm.DB
}

func NewAttemptRepo(db *gorm.DB) AttemptRepository {
	return &attemptRepo{db: db}
}

func (r *attemptRepo) FindByID(id string) (*model.TestAttempt, error) {
	var attempt model.TestAttempt
	err := r.db.
		Preload("Test").
		Preload("Test.TestQuestions", func(db *gorm.DB) *gorm.DB {
			return db.Order("test_questions.position ASC")
		}).
		Preload("Test.TestQuestions.Question").
		First(&attempt, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &attempt, err
}

func (r *attemptRepo) Create(attempt *model.TestAttempt) error {
	return r.db.Create(attempt).Error
}

func (r *attemptRepo) Save(attempt *model.TestAttempt) error {
	return r.db.Save(attempt).Error
}
