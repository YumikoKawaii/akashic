package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ContributionRepository interface {
	Create(c *model.Contribution) error
	Save(c *model.Contribution) error
	FindByID(id int) (*model.Contribution, error)
	FindByBank(bankID int, status string) ([]model.Contribution, error)
	FindByBankAndContributor(bankID, contributorID int) ([]model.Contribution, error)
	AddReview(r *model.ContributionReview) error
	SoftDelete(id int) error
}

type contributionRepo struct{ db *gorm.DB }

func NewContributionRepo(db *gorm.DB) ContributionRepository { return &contributionRepo{db} }

// reviewsOrdered preloads the contributor, and the review history oldest→newest
// with each review's reviewer.
func (r *contributionRepo) withAssociations(db *gorm.DB) *gorm.DB {
	return db.
		Preload("Contributor").
		Preload("Reviews", func(db *gorm.DB) *gorm.DB { return db.Order("created_at ASC") }).
		Preload("Reviews.Reviewer")
}

func (r *contributionRepo) Create(c *model.Contribution) error { return r.db.Create(c).Error }

// Save persists the contribution row only; Omit(Associations) keeps GORM from
// upserting the preloaded Reviews/Contributor when we just flip status/payload.
func (r *contributionRepo) Save(c *model.Contribution) error {
	return r.db.Omit(clause.Associations).Save(c).Error
}

func (r *contributionRepo) FindByID(id int) (*model.Contribution, error) {
	var c model.Contribution
	err := r.withAssociations(r.db).First(&c, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &c, err
}

func (r *contributionRepo) FindByBank(bankID int, status string) ([]model.Contribution, error) {
	var cs []model.Contribution
	q := r.withAssociations(r.db).Where("bank_id = ?", bankID)
	if status != "" {
		q = q.Where("status = ?", status)
	}
	err := q.Order("created_at DESC").Find(&cs).Error
	return cs, err
}

func (r *contributionRepo) FindByBankAndContributor(bankID, contributorID int) ([]model.Contribution, error) {
	var cs []model.Contribution
	err := r.withAssociations(r.db).
		Where("bank_id = ? AND contributor_id = ?", bankID, contributorID).
		Order("created_at DESC").Find(&cs).Error
	return cs, err
}

func (r *contributionRepo) AddReview(rev *model.ContributionReview) error {
	return r.db.Create(rev).Error
}

func (r *contributionRepo) SoftDelete(id int) error {
	return r.db.Delete(&model.Contribution{}, id).Error
}
