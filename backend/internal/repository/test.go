package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type TestRepository interface {
	FindByBank(bankID string) ([]model.Test, error)
	FindByBankAndID(bankID, id string) (*model.Test, error)
	Create(test *model.Test) error
	CreateWithQuestions(test *model.Test, questions []model.TestQuestion) error
	Delete(bankID, id string) error
}

type testRepo struct {
	db *gorm.DB
}

func NewTestRepo(db *gorm.DB) TestRepository {
	return &testRepo{db: db}
}

func (r *testRepo) FindByBank(bankID string) ([]model.Test, error) {
	var tests []model.Test
	return tests, r.db.Where("bank_id = ?", bankID).Order("created_at DESC").Find(&tests).Error
}

func (r *testRepo) FindByBankAndID(bankID, id string) (*model.Test, error) {
	var test model.Test
	err := r.db.
		Preload("TestQuestions", func(db *gorm.DB) *gorm.DB {
			return db.Order("test_questions.position ASC")
		}).
		Preload("TestQuestions.Question").
		Preload("TestQuestions.Question.Category").
		First(&test, "bank_id = ? AND id = ?", bankID, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &test, err
}

func (r *testRepo) Create(test *model.Test) error {
	return r.db.Create(test).Error
}

func (r *testRepo) CreateWithQuestions(test *model.Test, questions []model.TestQuestion) error {
	if err := r.db.Create(test).Error; err != nil {
		return err
	}
	if len(questions) == 0 {
		return nil
	}
	return r.db.Create(&questions).Error
}

func (r *testRepo) Delete(bankID, id string) error {
	result := r.db.Delete(&model.Test{}, "bank_id = ? AND id = ?", bankID, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}
