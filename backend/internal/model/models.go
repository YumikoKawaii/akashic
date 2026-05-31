package model

import (
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// ── Value types ────────────────────────────────────────────────────────────────

type PassageParagraph struct {
	Label string `json:"label"`
	Text  string `json:"text"`
}

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
	ID         int                `gorm:"primaryKey;autoIncrement" json:"id"`
	BankID     int                `gorm:"not null;index"           json:"bank_id"`
	CategoryID int                `gorm:"not null;index"           json:"category_id"`
	Category   *Category          `gorm:"foreignKey:CategoryID"    json:"category,omitempty"`
	Title      string             `gorm:"not null"        json:"title"`
	Paragraphs []PassageParagraph `gorm:"serializer:json" json:"paragraphs,omitempty"`
	Difficulty string             `gorm:"not null"                 json:"difficulty"`
	Groups     []QuestionGroup    `gorm:"foreignKey:PassageID"     json:"groups,omitempty"`
	CreatedAt  time.Time          `                                json:"created_at"`
	UpdatedAt  time.Time          `                                json:"updated_at"`
	DeletedAt  gorm.DeletedAt     `gorm:"index"                    json:"-"`
}

type QuestionGroup struct {
	ID         int            `gorm:"primaryKey;autoIncrement" json:"id"`
	BankID     int            `gorm:"not null;index"           json:"bank_id"`
	CategoryID int            `gorm:"not null;index"           json:"category_id"`
	PassageID  *int           `gorm:"index"                    json:"passage_id,omitempty"`
	Passage    *Passage       `gorm:"foreignKey:PassageID"     json:"passage,omitempty"`
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
	Group      *QuestionGroup   `gorm:"foreignKey:GroupID"       json:"group,omitempty"`
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
	QuestionID int            `gorm:"primaryKey"        json:"question_id"`
	Content    string         `gorm:"not null"          json:"content"`
	Options    []MCQOption    `gorm:"serializer:json"   json:"options"`
	Answers    pq.StringArray `gorm:"type:text[]"     json:"answers"`
}

type Test struct {
	ID            int            `gorm:"primaryKey;autoIncrement" json:"id"`
	BankID        int            `gorm:"not null;index"           json:"bank_id"`
	CreatedBy     *int           `                                json:"created_by,omitempty"`
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

// ── Contributions ────────────────────────────────────────────────────────────

// Contribution lifecycle: a non-terminal status is one of pending /
// changes_requested / approved; rejected and merged are terminal.
const (
	ContributionPending          = "pending"
	ContributionChangesRequested = "changes_requested"
	ContributionApproved         = "approved"  // >=1 approve, awaiting contributor merge
	ContributionRejected         = "rejected"  // reviewer rejected; contributor may reopen
	ContributionMerged           = "merged"    // terminal — question created
	ContributionWithdrawn        = "withdrawn" // contributor pulled back; may reopen
	ContributionClosed           = "closed"    // terminal — contributor abandoned

	// Contribution event log — every state transition. Approve/Reject/RequestChanges
	// are reviewer actions; the rest are contributor actions.
	EventApprove        = "approve"
	EventReject         = "reject"
	EventRequestChanges = "request_changes"
	EventRevise         = "revise"
	EventMerge          = "merge"
	EventResubmit       = "resubmit"
	EventWithdraw       = "withdraw"
	EventReopen         = "reopen"
	EventClose          = "close"
)

// ContributionPayload is the proposed new question, snapshotted as JSONB. Mirrors
// service.CreateQuestionInput so the merge path can build a question directly.
type ContributionPayload struct {
	CategoryID int         `json:"category_id"`
	Type       string      `json:"type"`
	Difficulty string      `json:"difficulty"`
	Tags       []string    `json:"tags"`
	Content    string      `json:"content"`
	Answer     string      `json:"answer,omitempty"`  // non-mcq
	Options    []MCQOption `json:"options,omitempty"` // mcq
	Answers    []string    `json:"answers,omitempty"` // mcq
}

type Contribution struct {
	ID            int                   `gorm:"primaryKey;autoIncrement" json:"id"`
	BankID        int                   `gorm:"not null;index"           json:"bank_id"`
	ContributorID int                   `gorm:"not null;index"           json:"contributor_id"`
	Contributor   *User                 `gorm:"foreignKey:ContributorID" json:"contributor,omitempty"`
	Payload       ContributionPayload   `gorm:"serializer:json"          json:"payload"`
	Status        string                `gorm:"not null;default:'pending'" json:"status"`
	QuestionID    *int                  `                                json:"question_id,omitempty"`
	Events        []ContributionEvent   `gorm:"foreignKey:ContributionID" json:"events,omitempty"`
	Comments      []ContributionComment `gorm:"foreignKey:ContributionID" json:"comments,omitempty"`
	CreatedAt     time.Time             `                                json:"created_at"`
	UpdatedAt     time.Time             `                                json:"updated_at"`
	DeletedAt     gorm.DeletedAt        `gorm:"index"                    json:"-"`
}

// ContributionEvent is one state transition on a contribution (prose-free).
type ContributionEvent struct {
	ID             int            `gorm:"primaryKey;autoIncrement" json:"id"`
	ContributionID int            `gorm:"not null;index"           json:"contribution_id"`
	ActorID        int            `gorm:"not null"                 json:"actor_id"`
	Actor          *User          `gorm:"foreignKey:ActorID"       json:"actor,omitempty"`
	Event          string         `gorm:"not null"                 json:"event"`
	CreatedAt      time.Time      `                                json:"created_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index"                    json:"-"`
}

type ContributionComment struct {
	ID             int            `gorm:"primaryKey;autoIncrement" json:"id"`
	ContributionID int            `gorm:"not null;index"           json:"contribution_id"`
	AuthorID       int            `gorm:"not null"                 json:"author_id"`
	Author         *User          `gorm:"foreignKey:AuthorID"      json:"author,omitempty"`
	Body           string         `gorm:"not null"                 json:"body"`
	CreatedAt      time.Time      `                                json:"created_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index"                    json:"-"`
}
