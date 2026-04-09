package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type UserRepository interface {
	FindByGoogleID(googleID string) (*model.User, error)
	FindByEmail(email string) (*model.User, error)
	FindByID(id string) (*model.User, error)
	Upsert(user *model.User) error
}

type userRepo struct {
	db *gorm.DB
}

func NewUserRepo(db *gorm.DB) UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) FindByGoogleID(googleID string) (*model.User, error) {
	var u model.User
	err := r.db.First(&u, "google_id = ?", googleID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (r *userRepo) FindByEmail(email string) (*model.User, error) {
	var u model.User
	err := r.db.First(&u, "email = ?", email).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (r *userRepo) FindByID(id string) (*model.User, error) {
	var u model.User
	err := r.db.First(&u, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &u, err
}

// Upsert creates or updates a user by google_id.
func (r *userRepo) Upsert(user *model.User) error {
	return r.db.
		Where(model.User{GoogleID: user.GoogleID}).
		Assign(model.User{
			Email:     user.Email,
			Name:      user.Name,
			AvatarURL: user.AvatarURL,
		}).
		FirstOrCreate(user).Error
}
