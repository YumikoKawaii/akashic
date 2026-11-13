package repository

import (
	"errors"

	"github.com/lib/pq"
	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type GroupMeta struct {
	ID          int            `gorm:"column:id"`
	Difficulty  string         `gorm:"column:difficulty"`
	Tags        pq.StringArray `gorm:"column:tags;type:text[]"`
	QuestionIDs pq.Int64Array  `gorm:"column:question_ids;type:integer[]"`
	Types       pq.StringArray `gorm:"column:types;type:text[]"`
}

type GroupRepository interface {
	FindAllMeta(bankID int) ([]GroupMeta, error)
	Create(g *model.QuestionGroup) error
	FindSummaries(bankID int) ([]GroupSummary, error)
	FindByID(id int) (*model.QuestionGroup, error)
	Save(g *model.QuestionGroup) error
}

// GroupSummary is a group with the number of live questions in it.
type GroupSummary struct {
	model.QuestionGroup
	QuestionCount int
}

type groupRepo struct{ db *gorm.DB }

func NewGroupRepo(db *gorm.DB) GroupRepository { return &groupRepo{db} }

func (r *groupRepo) Create(g *model.QuestionGroup) error { return r.db.Create(g).Error }

func (r *groupRepo) FindAllMeta(bankID int) ([]GroupMeta, error) {
	var metas []GroupMeta
	err := r.db.Raw(
		`SELECT g.id, g.difficulty, g.tags,
		        array_agg(q.id ORDER BY q.position) AS question_ids,
		        array_agg(DISTINCT q.type) AS types
		 FROM question_groups g
		 JOIN questions q ON q.group_id = g.id AND q.deleted_at IS NULL
		 WHERE g.bank_id = ? AND g.deleted_at IS NULL
		 GROUP BY g.id`, bankID,
	).Scan(&metas).Error
	return metas, err
}

func (r *groupRepo) FindSummaries(bankID int) ([]GroupSummary, error) {
	var rows []GroupSummary
	err := r.db.Raw(
		`SELECT g.*, COUNT(q.id) AS question_count
		 FROM question_groups g
		 LEFT JOIN questions q ON q.group_id = g.id AND q.deleted_at IS NULL
		 WHERE g.bank_id = ? AND g.deleted_at IS NULL
		 GROUP BY g.id
		 ORDER BY g.created_at DESC`, bankID,
	).Scan(&rows).Error
	return rows, err
}

func (r *groupRepo) FindByID(id int) (*model.QuestionGroup, error) {
	var g model.QuestionGroup
	err := r.db.First(&g, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &g, err
}

func (r *groupRepo) Save(g *model.QuestionGroup) error { return r.db.Save(g).Error }
