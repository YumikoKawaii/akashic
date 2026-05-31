package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

// PublicBankCard is a lightweight public-bank projection for the community home.
type PublicBankCard struct {
	ID            int
	Name          string
	Description   string
	OwnerID       *int
	OwnerName     string
	OwnerEmail    string
	OwnerAvatar   string
	QuestionCount int
	CategoryCount int
}

type BankRepository interface {
	FindAllIDs() ([]int, error)
	FindPublicIDs() ([]int, error)
	FindPublicPaged(query string, page, pageSize int) ([]PublicBankCard, int64, error)
	FindAllForUser(userID int) ([]model.BankWithRole, error)
	FindByID(id int) (*model.Bank, error)
	Create(b *model.Bank) error
	Save(b *model.Bank) error
	SoftDelete(id int) error
	Restore(id int) error
}

type bankRepo struct{ db *gorm.DB }

func NewBankRepo(db *gorm.DB) BankRepository { return &bankRepo{db} }

func (r *bankRepo) FindAllIDs() ([]int, error) {
	var ids []int
	err := r.db.Model(&model.Bank{}).Pluck("id", &ids).Error
	return ids, err
}

// FindPublicIDs returns the IDs of all active public banks (GORM excludes
// soft-deleted rows). Used to warm the visibility cache at startup.
func (r *bankRepo) FindPublicIDs() ([]int, error) {
	var ids []int
	err := r.db.Model(&model.Bank{}).
		Where("visibility = ?", model.VisibilityPublic).
		Pluck("id", &ids).Error
	return ids, err
}

// FindPublicPaged returns public banks (optionally name/description-filtered),
// newest first, with per-bank question/category counts and owner info.
func (r *bankRepo) FindPublicPaged(query string, page, pageSize int) ([]PublicBankCard, int64, error) {
	where := "b.visibility = ? AND b.deleted_at IS NULL"
	args := []any{model.VisibilityPublic}
	if query != "" {
		like := "%" + query + "%"
		where += " AND (b.name ILIKE ? OR b.description ILIKE ?)"
		args = append(args, like, like)
	}

	var total int64
	if err := r.db.Table("banks b").Where(where, args...).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []PublicBankCard
	err := r.db.Table("banks b").
		Select(`b.id, b.name, b.description, b.owner_id,
			u.name AS owner_name, u.email AS owner_email, u.avatar_url AS owner_avatar,
			(SELECT COUNT(*) FROM questions q WHERE q.bank_id = b.id AND q.deleted_at IS NULL) AS question_count,
			(SELECT COUNT(*) FROM categories c WHERE c.bank_id = b.id AND c.deleted_at IS NULL) AS category_count`).
		Joins("LEFT JOIN users u ON u.id = b.owner_id").
		Where(where, args...).
		Order("b.created_at DESC").
		Limit(pageSize).Offset((page - 1) * pageSize).
		Scan(&rows).Error
	return rows, total, err
}

func (r *bankRepo) FindAllForUser(userID int) ([]model.BankWithRole, error) {
	type row struct {
		model.Bank
		MyRole string
	}
	var rows []row
	err := r.db.Raw(`
		SELECT b.*, bm.role AS my_role
		FROM banks b
		JOIN bank_members bm ON bm.bank_id = b.id AND bm.user_id = ? AND bm.deleted_at IS NULL
		WHERE b.deleted_at IS NULL
		ORDER BY b.created_at DESC
	`, userID).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]model.BankWithRole, len(rows))
	for i, r := range rows {
		out[i] = model.BankWithRole{Bank: r.Bank, MyRole: r.MyRole}
	}
	return out, nil
}

func (r *bankRepo) FindByID(id int) (*model.Bank, error) {
	var b model.Bank
	err := r.db.First(&b, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &b, err
}

func (r *bankRepo) Create(b *model.Bank) error { return r.db.Create(b).Error }
func (r *bankRepo) Save(b *model.Bank) error   { return r.db.Save(b).Error }

func (r *bankRepo) SoftDelete(id int) error {
	return r.db.Delete(&model.Bank{}, id).Error
}

func (r *bankRepo) Restore(id int) error {
	return r.db.Unscoped().Model(&model.Bank{}).Where("id = ?", id).Update("deleted_at", nil).Error
}
