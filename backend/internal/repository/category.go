package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type CategoryRepository interface {
	FindByBank(bankID string) ([]model.Category, error)
	FindByID(id string) (*model.Category, error)
	FindByBankAndID(bankID, id string) (*model.Category, error)
	Create(category *model.Category) error
	Save(category *model.Category) error
	Delete(bankID, id string) error
}

type categoryRepo struct {
	db *gorm.DB
}

func NewCategoryRepo(db *gorm.DB) CategoryRepository {
	return &categoryRepo{db: db}
}

func (r *categoryRepo) FindByBank(bankID string) ([]model.Category, error) {
	var categories []model.Category
	return categories, r.db.Where("bank_id = ?", bankID).Order("name ASC").Find(&categories).Error
}

func (r *categoryRepo) FindByID(id string) (*model.Category, error) {
	var category model.Category
	err := r.db.First(&category, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &category, err
}

func (r *categoryRepo) FindByBankAndID(bankID, id string) (*model.Category, error) {
	var category model.Category
	err := r.db.First(&category, "bank_id = ? AND id = ?", bankID, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &category, err
}

func (r *categoryRepo) Create(category *model.Category) error {
	return r.db.Create(category).Error
}

func (r *categoryRepo) Save(category *model.Category) error {
	return r.db.Save(category).Error
}

func (r *categoryRepo) Delete(bankID, id string) error {
	result := r.db.Delete(&model.Category{}, "bank_id = ? AND id = ?", bankID, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}
