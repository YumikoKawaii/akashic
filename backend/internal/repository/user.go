package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type UserRepository interface {
	FindByGoogleID(googleID string) (*model.User, error)
	FindByID(id int) (*model.User, error)
	FindByEmail(email string) (*model.User, error)
	Upsert(u *model.User) error
}

type userRepo struct{ db *gorm.DB }

func NewUserRepo(db *gorm.DB) UserRepository { return &userRepo{db} }

func (r *userRepo) FindByGoogleID(googleID string) (*model.User, error) {
	var u model.User
	err := r.db.Where("google_id = ?", googleID).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (r *userRepo) FindByID(id int) (*model.User, error) {
	var u model.User
	err := r.db.First(&u, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (r *userRepo) FindByEmail(email string) (*model.User, error) {
	var u model.User
	err := r.db.Where("email = ?", email).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (r *userRepo) Upsert(u *model.User) error {
	return r.db.
		Where(model.User{GoogleID: u.GoogleID}).
		Assign(model.User{Email: u.Email, Name: u.Name, AvatarURL: u.AvatarURL}).
		FirstOrCreate(u).Error
}
