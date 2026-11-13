package repository

import (
	"github.com/lib/pq"
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
}

type groupRepo struct{ db *gorm.DB }

func NewGroupRepo(db *gorm.DB) GroupRepository { return &groupRepo{db} }

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
