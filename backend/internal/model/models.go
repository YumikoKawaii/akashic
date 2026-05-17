package model

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// ── Value types ────────────────────────────────────────────────────────────────

type TestConfig struct {
	EasyCount      int      `json:"easy_count"`
	MediumCount    int      `json:"medium_count"`
	HardCount      int      `json:"hard_count"`
	CategoryIDs    []int    `json:"category_ids,omitempty"`
	PassageIDs     []int    `json:"passage_ids,omitempty"`
	Types          []string `json:"types,omitempty"`
	Tags           []string `json:"tags,omitempty"`
	StandaloneOnly bool     `json:"standalone_only,omitempty"`
}

func (t TestConfig) QuestionCount() int {
	return t.EasyCount + t.MediumCount + t.HardCount
}

// GroupContext holds type-specific shared data for a QuestionGroup.
// Fields are populated based on group type; unused fields are omitted from JSON.
type GroupContext struct {
	// matching_headings
	Sections []SectionItem `json:"sections,omitempty"`
	Headings []OptionItem  `json:"headings,omitempty"`
	// matching_information
	Paragraphs []OptionItem `json:"paragraphs,omitempty"`
	// matching_features
	Options []OptionItem `json:"options,omitempty"`
	// sentence_completion · form_completion · short_answer
	WordLimit int      `json:"word_limit,omitempty"`
	WordBank  []string `json:"word_bank,omitempty"`
	// form_completion only
	FormType string `json:"form_type,omitempty"`
	Title    string `json:"title,omitempty"`
	Template string `json:"template,omitempty"`
}

type SectionItem struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}

type OptionItem struct {
	Key  string `json:"key"`
	Text string `json:"text"`
}

type MCQOption struct {
	Key  string `json:"key"`
	Text string `json:"text"`
}

// ── Entity models ──────────────────────────────────────────────────────────────

type User struct {
	ID           int            `gorm:"primaryKey;autoIncrement" json:"id"`
	GoogleID     *string        `gorm:"uniqueIndex"              json:"-"`
	Email        string         `gorm:"uniqueIndex;not null"     json:"email"`
	Name         string         `gorm:"not null"                 json:"name"`
	AvatarURL    string         `gorm:"not null;default:''"      json:"avatar_url"`
	PasswordHash string         `gorm:"not null;default:''"      json:"-"`
	CreatedAt    time.Time      `                                json:"created_at"`
	UpdatedAt    time.Time      `                                json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index"                    json:"-"`
}

type Bank struct {
	ID            int            `gorm:"primaryKey;autoIncrement"  json:"id"`
	Name          string         `gorm:"not null"                  json:"name"`
	Description   string         `gorm:"not null;default:''"       json:"description"`
	OwnerID       *int           `                                 json:"owner_id,omitempty"`
	DefaultConfig TestConfig     `gorm:"serializer:json"           json:"default_config"`
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

type Category struct {
	ID          int            `gorm:"primaryKey;autoIncrement" json:"id"`
	BankID      int            `gorm:"not null;index"           json:"bank_id"`
	Name        string         `gorm:"not null"                 json:"name"`
	Description string         `gorm:"not null;default:''"      json:"description"`
	CreatedAt   time.Time      `                                json:"created_at"`
	UpdatedAt   time.Time      `                                json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index"                    json:"-"`
}

type Passage struct {
	ID         int             `gorm:"primaryKey;autoIncrement" json:"id"`
	BankID     int             `gorm:"not null;index"           json:"bank_id"`
	CategoryID int             `gorm:"not null;index"           json:"category_id"`
	Category   *Category       `gorm:"foreignKey:CategoryID"    json:"category,omitempty"`
	Title      string          `gorm:"not null"                 json:"title"`
	Body       string          `gorm:"not null;default:''"      json:"body"`
	Difficulty string          `gorm:"not null"                 json:"difficulty"`
	Groups     []QuestionGroup `gorm:"foreignKey:PassageID"     json:"groups,omitempty"`
	CreatedAt  time.Time       `                                json:"created_at"`
	UpdatedAt  time.Time       `                                json:"updated_at"`
	DeletedAt  gorm.DeletedAt  `gorm:"index"                    json:"-"`
}

type QuestionGroup struct {
	ID         int            `gorm:"primaryKey;autoIncrement" json:"id"`
	BankID     int            `gorm:"not null;index"           json:"bank_id"`
	CategoryID int            `gorm:"not null;index"           json:"category_id"`
	PassageID  *int           `gorm:"index"                    json:"passage_id,omitempty"`
	Type       string         `gorm:"not null"                 json:"type"`
	Difficulty string         `gorm:"not null"                 json:"difficulty"`
	Context    GroupContext   `gorm:"serializer:json"          json:"context"`
	Questions  []Question     `gorm:"foreignKey:GroupID"       json:"questions,omitempty"`
	CreatedAt  time.Time      `                                json:"created_at"`
	UpdatedAt  time.Time      `                                json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index"                    json:"-"`
}

type Question struct {
	ID         int              `gorm:"primaryKey;autoIncrement" json:"id"`
	BankID     int              `gorm:"not null;index"           json:"bank_id"`
	CategoryID int              `gorm:"not null;index"           json:"category_id"`
	GroupID    *int             `gorm:"index"                    json:"group_id,omitempty"`
	Type       string           `gorm:"not null"                 json:"type"`
	Difficulty string           `gorm:"not null"                 json:"difficulty"`
	Tags       pq.StringArray   `gorm:"type:text[]"              json:"tags"`
	Position   *int16           `                                json:"position,omitempty"`
	Item       *QQuestionItem   `gorm:"foreignKey:QuestionID"    json:"item,omitempty"`
	Choice     *QMultipleChoice `gorm:"foreignKey:QuestionID"    json:"choice,omitempty"`
	CreatedAt  time.Time        `                                json:"created_at"`
	UpdatedAt  time.Time        `                                json:"updated_at"`
	DeletedAt  gorm.DeletedAt   `gorm:"index"                    json:"-"`
}

// QQuestionItem covers all non-MCQ types. No audit columns — lifecycle owned by Question.
type QQuestionItem struct {
	QuestionID int    `gorm:"primaryKey"  json:"question_id"`
	Content    string `gorm:"not null"    json:"content"`
	Answer     string `gorm:"not null"    json:"answer"`
}

// QMultipleChoice covers mcq only. No audit columns — lifecycle owned by Question.
type QMultipleChoice struct {
	QuestionID int          `gorm:"primaryKey"        json:"question_id"`
	Content    string       `gorm:"not null"          json:"content"`
	Options    []MCQOption  `gorm:"serializer:json"   json:"options"`
	Answers    pq.StringArray `gorm:"type:text[]"     json:"answers"`
}

type Test struct {
	ID            int            `gorm:"primaryKey;autoIncrement" json:"id"`
	BankID        int            `gorm:"not null;index"           json:"bank_id"`
	Name          string         `gorm:"not null"                 json:"name"`
	Description   string         `gorm:"not null;default:''"      json:"description"`
	Config        TestConfig     `gorm:"serializer:json"          json:"config"`
	TestQuestions []TestQuestion `gorm:"foreignKey:TestID"        json:"questions,omitempty"`
	CreatedAt     time.Time      `                                json:"created_at"`
	UpdatedAt     time.Time      `                                json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index"                    json:"-"`
}

// TestQuestion is the ordered join between Test and Question. No audit columns.
type TestQuestion struct {
	TestID     int       `gorm:"primaryKey"            json:"test_id"`
	QuestionID int       `gorm:"primaryKey"            json:"question_id"`
	Question   *Question `gorm:"foreignKey:QuestionID" json:"question,omitempty"`
	Position   int       `                             json:"position"`
}

type TestAttempt struct {
	ID          int               `gorm:"primaryKey;autoIncrement" json:"id"`
	TestID      int               `gorm:"not null;index"           json:"test_id"`
	Test        *Test             `gorm:"foreignKey:TestID"        json:"test,omitempty"`
	Answers     map[string]string `gorm:"serializer:json"          json:"answers"`
	Score       *int              `                                json:"score"`
	Total       *int              `                                json:"total"`
	StartedAt   time.Time         `                                json:"started_at"`
	CompletedAt *time.Time        `                                json:"completed_at"`
	CreatedAt   time.Time         `                                json:"created_at"`
	UpdatedAt   time.Time         `                                json:"updated_at"`
	DeletedAt   gorm.DeletedAt    `gorm:"index"                    json:"-"`
}
