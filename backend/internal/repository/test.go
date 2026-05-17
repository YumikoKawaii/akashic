package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type TestRepository interface {
	FindByBank(bankID int) ([]model.Test, error)
	FindByBankPaged(bankID int, page, pageSize int) ([]model.Test, int64, error)
	FindByID(id int) (*model.Test, error)
	FindByBankAndID(bankID, id int) (*model.Test, error)
	Create(t *model.Test) error
	SoftDelete(id int) error
	Restore(id int) error
	CreateTestQuestion(tq *model.TestQuestion) error
}

type testRepo struct{ db *gorm.DB }

func NewTestRepo(db *gorm.DB) TestRepository { return &testRepo{db} }

func (r *testRepo) FindByBank(bankID int) ([]model.Test, error) {
	var ts []model.Test
	err := r.db.Where("bank_id = ?", bankID).Order("created_at DESC").Find(&ts).Error
	return ts, err
}

func (r *testRepo) FindByBankPaged(bankID int, page, pageSize int) ([]model.Test, int64, error) {
	base := r.db.Model(&model.Test{}).Where("bank_id = ?", bankID)

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var ts []model.Test
	err := base.Order("created_at DESC").
		Limit(pageSize).Offset((page - 1) * pageSize).
		Find(&ts).Error
	return ts, total, err
}

func (r *testRepo) FindByID(id int) (*model.Test, error) {
	var t model.Test
	err := r.db.
		Preload("TestQuestions", func(db *gorm.DB) *gorm.DB { return db.Order("position ASC") }).
		Preload("TestQuestions.Question.Item").
		Preload("TestQuestions.Question.Choice").
		First(&t, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &t, err
}

func (r *testRepo) FindByBankAndID(bankID, id int) (*model.Test, error) {
	var t model.Test
	err := r.db.
		Preload("TestQuestions", func(db *gorm.DB) *gorm.DB { return db.Order("position ASC") }).
		Preload("TestQuestions.Question.Item").
		Preload("TestQuestions.Question.Choice").
		Where("bank_id = ?", bankID).First(&t, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &t, err
}

func (r *testRepo) Create(t *model.Test) error { return r.db.Create(t).Error }

func (r *testRepo) SoftDelete(id int) error {
	return r.db.Delete(&model.Test{}, id).Error
}

func (r *testRepo) Restore(id int) error {
	return r.db.Unscoped().Model(&model.Test{}).Where("id = ?", id).Update("deleted_at", nil).Error
}

func (r *testRepo) CreateTestQuestion(tq *model.TestQuestion) error {
	return r.db.Create(tq).Error
}
