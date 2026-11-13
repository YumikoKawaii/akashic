package model

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// ── Value types ────────────────────────────────────────────────────────────────

type TestConfig struct {
	EasyCount   int      `json:"easy_count"`
	MediumCount int      `json:"medium_count"`
	HardCount   int      `json:"hard_count"`
	Types       []string `json:"types,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	GroupMode   string   `json:"group_mode,omitempty"`
}

func (t TestConfig) QuestionCount() int {
	return t.EasyCount + t.MediumCount + t.HardCount
}

type MCQOption struct {
	Key  string `json:"key"`
	Text string `json:"text"`
}

// ── Entity models ──────────────────────────────────────────────────────────────

type User struct {
	ID        int            `gorm:"primaryKey;autoIncrement" json:"id"`
	GoogleID  *string        `gorm:"uniqueIndex"              json:"-"`
	Email     string         `gorm:"uniqueIndex;not null"     json:"email"`
	Name      string         `gorm:"not null"                 json:"name"`
	AvatarURL string         `gorm:"not null;default:''"      json:"avatar_url"`
	CreatedAt time.Time      `                                json:"created_at"`
	UpdatedAt time.Time      `                                json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index"                    json:"-"`
}

// Bank visibility values.
const (
	VisibilityPrivate = "private"
	VisibilityPublic  = "public"
)

type Bank struct {
	ID            int            `gorm:"primaryKey;autoIncrement"  json:"id"`
	Name          string         `gorm:"not null"                  json:"name"`
	Description   string         `gorm:"not null;default:''"       json:"description"`
	OwnerID       *int           `                                 json:"owner_id,omitempty"`
	Visibility    string         `gorm:"not null;default:'private'" json:"visibility"`
	DefaultConfig TestConfig     `gorm:"serializer:json" json:"default_config"`
	Members       []BankMember   `gorm:"foreignKey:BankID"         json:"members,omitempty"`
	CreatedAt     time.Time      `                                 json:"created_at"`
	UpdatedAt     time.Time      `                                 json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index"                     json:"-"`
}

type BankMember struct {
	ID        int            `gorm:"primaryKey;autoIncrement" json:"id"`
	BankID    int            `gorm:"not null;index"           json:"bank_id"`
	UserID    int            `gorm:"not null;index"           json:"user_id"`
	User      *User          `gorm:"foreignKey:UserID"        json:"user,omitempty"`
	Role      string         `gorm:"not null"                 json:"role"`
	CreatedAt time.Time      `                                json:"created_at"`
	UpdatedAt time.Time      `                                json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index"                    json:"-"`
}

type BankWithRole struct {
	Bank
	MyRole string `json:"my_role"`
}

type Question struct {
	ID         int             `gorm:"primaryKey;autoIncrement" json:"id"`
	BankID     int             `gorm:"not null;index"           json:"bank_id"`
	Type       string          `gorm:"not null"                 json:"type"`
	Difficulty string          `gorm:"not null"                 json:"difficulty"`
	Tags       pq.StringArray  `gorm:"type:text[]"              json:"tags"`
	Content    QuestionContent `gorm:"serializer:json;type:jsonb;not null" json:"content"`
	GroupID    *int            `gorm:"index"                    json:"group_id,omitempty"`
	Position   *int            `                                json:"position,omitempty"`
	CreatedAt  time.Time       `                                json:"created_at"`
	UpdatedAt  time.Time       `                                json:"updated_at"`
	DeletedAt  gorm.DeletedAt  `gorm:"index"                    json:"-"`
}

type QuestionContent struct {
	Text    string      `json:"text"`
	Answer  string      `json:"answer,omitempty"`
	Options []MCQOption `json:"options,omitempty"`
	Answers []string    `json:"answers,omitempty"`
}

func NewQuestionContent(qType, text, answer string, options []MCQOption, answers []string) QuestionContent {
	if qType == "mcq" {
		return QuestionContent{Text: text, Options: options, Answers: answers}
	}
	return QuestionContent{Text: text, Answer: answer}
}

type GroupContent struct {
	Instructions string      `json:"instructions,omitempty"`
	Passage      string      `json:"passage,omitempty"`
	Options      []MCQOption `json:"options,omitempty"`
}

type QuestionGroup struct {
	ID         int            `gorm:"primaryKey;autoIncrement" json:"id"`
	BankID     int            `gorm:"not null;index"           json:"bank_id"`
	Title      string         `gorm:"not null;default:''"      json:"title"`
	Content    GroupContent   `gorm:"serializer:json;type:jsonb;not null" json:"content"`
	Difficulty string         `gorm:"not null"                 json:"difficulty"`
	Tags       pq.StringArray `gorm:"type:text[]"              json:"tags"`
	CreatedAt  time.Time      `                                json:"created_at"`
	UpdatedAt  time.Time      `                                json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index"                    json:"-"`
}

const (
	GroupModeMixed      = ""
	GroupModeStandalone = "standalone"
	GroupModeGroups     = "groups"
)

type Test struct {
	ID          int            `gorm:"primaryKey;autoIncrement" json:"id"`
	BankID      int            `gorm:"not null;index"           json:"bank_id"`
	CreatedBy   *int           `                                json:"created_by,omitempty"`
	Creator     *User          `gorm:"foreignKey:CreatedBy"     json:"creator,omitempty"`
	Name        string         `gorm:"not null"                 json:"name"`
	Description string         `gorm:"not null;default:''"      json:"description"`
	Config      TestConfig     `gorm:"serializer:json"          json:"config"`
	QuestionIDs pq.Int64Array  `gorm:"type:integer[];not null"  json:"question_ids"`
	Questions   []Question     `gorm:"-"                        json:"questions,omitempty"`
	Groups      []QuestionGroup `gorm:"-"                       json:"groups,omitempty"`
	CreatedAt   time.Time      `                                json:"created_at"`
	UpdatedAt   time.Time      `                                json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index"                    json:"-"`
}

type TestAttempt struct {
	ID          int               `gorm:"primaryKey;autoIncrement" json:"id"`
	TestID      int               `gorm:"not null;index"           json:"test_id"`
	Test        *Test             `gorm:"foreignKey:TestID"        json:"test,omitempty"`
	UserID      *int              `gorm:"index"                    json:"user_id,omitempty"`
	Taker       *User             `gorm:"foreignKey:UserID"        json:"taker,omitempty"`
	Answers     map[string]string `gorm:"serializer:json"          json:"answers"`
	Score       *int              `                                json:"score"`
	Total       *int              `                                json:"total"`
	StartedAt   time.Time         `                                json:"started_at"`
	CompletedAt *time.Time        `                                json:"completed_at"`
	CreatedAt   time.Time         `                                json:"created_at"`
	UpdatedAt   time.Time         `                                json:"updated_at"`
	DeletedAt   gorm.DeletedAt    `gorm:"index"                    json:"-"`
}
