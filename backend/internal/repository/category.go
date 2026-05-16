package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type CategoryRepository interface {
	FindByBank(bankID int) ([]model.Category, error)
	FindByID(id int) (*model.Category, error)
	FindByBankAndName(bankID int, name string) (*model.Category, error)
	Create(c *model.Category) error
	Save(c *model.Category) error
	SoftDelete(id int) error
	Restore(id int) error
}

type categoryRepo struct{ db *gorm.DB }

func NewCategoryRepo(db *gorm.DB) CategoryRepository { return &categoryRepo{db} }

func (r *categoryRepo) FindByBank(bankID int) ([]model.Category, error) {
	var cs []model.Category
	err := r.db.Where("bank_id = ?", bankID).Order("name ASC").Find(&cs).Error
	return cs, err
}

func (r *categoryRepo) FindByID(id int) (*model.Category, error) {
	var c model.Category
	err := r.db.First(&c, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &c, err
}

func (r *categoryRepo) FindByBankAndName(bankID int, name string) (*model.Category, error) {
	var c model.Category
	err := r.db.Where("bank_id = ? AND LOWER(name) = LOWER(?)", bankID, name).First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &c, err
}

func (r *categoryRepo) Create(c *model.Category) error { return r.db.Create(c).Error }
func (r *categoryRepo) Save(c *model.Category) error   { return r.db.Save(c).Error }

func (r *categoryRepo) SoftDelete(id int) error {
	return r.db.Delete(&model.Category{}, id).Error
}

func (r *categoryRepo) Restore(id int) error {
	return r.db.Unscoped().Model(&model.Category{}).Where("id = ?", id).Update("deleted_at", nil).Error
}
