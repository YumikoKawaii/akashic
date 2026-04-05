package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type AttemptRepository interface {
	FindByID(id string) (*model.TestAttempt, error)
	FindByTest(testID string) ([]model.TestAttempt, error)
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
		Preload("Test.TestQuestions.Question.Passage").
		First(&attempt, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &attempt, err
}

func (r *attemptRepo) FindByTest(testID string) ([]model.TestAttempt, error) {
	var attempts []model.TestAttempt
	err := r.db.
		Select("id, test_id, score, total, started_at, completed_at").
		Where("test_id = ?", testID).
		Order("started_at DESC").
		Find(&attempts).Error
	return attempts, err
}

func (r *attemptRepo) Create(attempt *model.TestAttempt) error {
	return r.db.Create(attempt).Error
}

func (r *attemptRepo) Save(attempt *model.TestAttempt) error {
	return r.db.Save(attempt).Error
}
