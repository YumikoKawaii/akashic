package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// TestConfig is a value type stored as JSONB.
// It lives in banks.default_config and is snapshotted into tests.config at generation time.
type TestConfig struct {
	EasyCount   int      `json:"easy_count"`
	MediumCount int      `json:"medium_count"`
	HardCount   int      `json:"hard_count"`
	CategoryID  *string  `json:"category_id,omitempty"`
	Type        *string  `json:"type,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}

func (t TestConfig) TotalCount() int {
	return t.EasyCount + t.MediumCount + t.HardCount
}

// Bank is a top-level question bank (e.g. "English", "Japanese").
type Bank struct {
	ID            string     `gorm:"type:uuid;primaryKey"          json:"id"`
	Name          string     `gorm:"uniqueIndex;not null"           json:"name"`
	Description   string     `gorm:"not null;default:''"            json:"description"`
	DefaultConfig TestConfig `gorm:"serializer:json"                json:"default_config"`
	CreatedAt     time.Time  `                                      json:"created_at"`
	UpdatedAt     time.Time  `                                      json:"updated_at"`
}

func (b *Bank) BeforeCreate(_ *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	return nil
}

// Category groups questions within a bank.
type Category struct {
	ID          string    `gorm:"type:uuid;primaryKey"                               json:"id"`
	BankID      string    `gorm:"type:uuid;not null;index"                           json:"bank_id"`
	Name        string    `gorm:"not null;uniqueIndex:idx_categories_bank_name"      json:"name"`
	Description string    `gorm:"not null;default:''"                                json:"description"`
	CreatedAt   time.Time `                                                          json:"created_at"`
	UpdatedAt   time.Time `                                                          json:"updated_at"`
}

func (c *Category) BeforeCreate(_ *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

// Question belongs to one bank and one category.
// Type: mcq | true_false | open
// Difficulty: easy | medium | hard
type Question struct {
	ID            string         `gorm:"type:uuid;primaryKey"  json:"id"`
	BankID        string         `gorm:"type:uuid;not null;index" json:"bank_id"`
	CategoryID    string         `gorm:"type:uuid;not null;index" json:"category_id"`
	Category      *Category      `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Text          string         `gorm:"not null"              json:"text"`
	Type          string         `gorm:"not null"              json:"type"`
	Difficulty    string         `gorm:"not null"              json:"difficulty"`
	Options       pq.StringArray `gorm:"type:text[]"           json:"options"`
	CorrectAnswer string         `gorm:"not null;default:''"   json:"correct_answer"`
	Tags          pq.StringArray `gorm:"type:text[]"           json:"tags"`
	CreatedAt     time.Time      `                             json:"created_at"`
	UpdatedAt     time.Time      `                             json:"updated_at"`
}

func (q *Question) BeforeCreate(_ *gorm.DB) error {
	if q.ID == "" {
		q.ID = uuid.New().String()
	}
	return nil
}

// Test belongs to one bank. Config is a snapshot of the TestConfig used at generation time.
type Test struct {
	ID            string         `gorm:"type:uuid;primaryKey"     json:"id"`
	BankID        string         `gorm:"type:uuid;not null;index" json:"bank_id"`
	Name          string         `gorm:"not null"                 json:"name"`
	Description   string         `gorm:"not null;default:''"      json:"description"`
	Config        TestConfig     `gorm:"serializer:json"          json:"config"`
	TestQuestions []TestQuestion `gorm:"foreignKey:TestID"        json:"questions,omitempty"`
	CreatedAt     time.Time      `                                json:"created_at"`
	UpdatedAt     time.Time      `                                json:"updated_at"`
}

func (t *Test) BeforeCreate(_ *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return nil
}

// TestQuestion is the join table between Test and Question with an explicit position.
type TestQuestion struct {
	TestID     string    `gorm:"type:uuid;primaryKey"  json:"test_id"`
	QuestionID string    `gorm:"type:uuid;primaryKey"  json:"question_id"`
	Question   *Question `gorm:"foreignKey:QuestionID" json:"question,omitempty"`
	Position   int       `                             json:"position"`
}

// TestAttempt represents one run-through of a test.
type TestAttempt struct {
	ID          string            `gorm:"type:uuid;primaryKey"     json:"id"`
	TestID      string            `gorm:"type:uuid;not null;index" json:"test_id"`
	Test        *Test             `gorm:"foreignKey:TestID"        json:"test,omitempty"`
	Answers     map[string]string `gorm:"serializer:json"          json:"answers"`
	Score       *int              `                                json:"score"`
	Total       *int              `                                json:"total"`
	StartedAt   time.Time         `                                json:"started_at"`
	CompletedAt *time.Time        `                                json:"completed_at"`
}

func (a *TestAttempt) BeforeCreate(_ *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}
