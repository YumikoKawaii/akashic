package repository

import (
	"errors"

	"github.com/yumikokawaii/akashic/internal/model"
	"gorm.io/gorm"
)

type TestRepository interface {
	FindByBank(bankID int) ([]model.Test, error)
	FindByBankPaged(bankID int, q TestListQuery) ([]model.Test, int64, error)
	BestResultsByUser(bankID, userID int, testIDs []int) (map[int]BestResult, error)
	CompletedCounts(testIDs []int) (map[int]int, error)
	TestsSummary(bankID, userID int) (TestsSummary, error)
	FindByID(id int) (*model.Test, error)
	FindByBankAndID(bankID, id int) (*model.Test, error)
	RecentlyUsedQuestionIDs(bankID, lastN int) ([]int, error)
	Create(t *model.Test) error
	SoftDelete(id int) error
	Restore(id int) error
	CreateTestQuestion(tq *model.TestQuestion) error
}

// TestSort selects the page ordering. Zero value is "newest".
type TestSort int

const (
	SortNewest TestSort = iota
	SortOldest
	SortName
	SortSize
)

// TakenFilter restricts the page to tests the caller has / hasn't completed.
// Zero value is "all".
type TakenFilter int

const (
	TakenAll TakenFilter = iota
	TakenOnly
	UntakenOnly
)

// TestListQuery bundles the pagination + sort + caller-relative filter for a
// test listing. UserID is the caller, used by the taken filter (its absence —
// userID 0 — means no attempts match, so "taken" is empty and "untaken" is all).
type TestListQuery struct {
	Page     int
	PageSize int
	Sort     TestSort
	Taken    TakenFilter
	UserID   int
}

// BestResult is the caller's highest-scoring completed attempt on one test.
type BestResult struct {
	Score int
	Total int
}

// TestsSummary aggregates the caller's standing across every test in the bank.
type TestsSummary struct {
	Total      int64
	TakenCount int64
	BestPct    int // -1 when the caller has no completed attempt
}

// completedByUser is the join condition for "tests the caller has completed":
// a non-deleted, completed attempt belonging to userID with a gradeable total.
const completedByUser = `EXISTS (
	SELECT 1 FROM test_attempts ta
	WHERE ta.test_id = tests.id AND ta.user_id = ?
	  AND ta.completed_at IS NOT NULL AND ta.deleted_at IS NULL
	  AND ta.total > 0
)`

type testRepo struct{ db *gorm.DB }

func NewTestRepo(db *gorm.DB) TestRepository { return &testRepo{db} }

func (r *testRepo) FindByBank(bankID int) ([]model.Test, error) {
	var ts []model.Test
	err := r.db.Where("bank_id = ?", bankID).Order("created_at DESC").Find(&ts).Error
	return ts, err
}

// FindByBankPaged returns one page of the bank's shared tests (all creators),
// ordered and filtered per q. The taken/untaken filter is evaluated against the
// caller's own completed attempts, and total reflects the filtered set so the
// page count is correct. "Most questions" sorts on the snapshot config counts.
func (r *testRepo) FindByBankPaged(bankID int, q TestListQuery) ([]model.Test, int64, error) {
	base := r.db.Model(&model.Test{}).Where("bank_id = ?", bankID)
	switch q.Taken {
	case TakenOnly:
		base = base.Where(completedByUser, q.UserID)
	case UntakenOnly:
		base = base.Where("NOT "+completedByUser, q.UserID)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// "Most questions" reads the per-difficulty counts out of the JSONB config.
	const sizeExpr = `(COALESCE((config->>'easy_count')::int,0)
		+ COALESCE((config->>'medium_count')::int,0)
		+ COALESCE((config->>'hard_count')::int,0))`
	order := "created_at DESC"
	switch q.Sort {
	case SortOldest:
		order = "created_at ASC"
	case SortName:
		order = "name ASC"
	case SortSize:
		order = sizeExpr + " DESC, created_at DESC"
	}

	var ts []model.Test
	err := base.Preload("Creator").Order(order).
		Limit(q.PageSize).Offset((q.Page - 1) * q.PageSize).
		Find(&ts).Error
	return ts, total, err
}

// BestResultsByUser returns, for each of testIDs, the caller's highest-scoring
// completed attempt — keyed by test id, absent when the caller never finished
// that test. "Highest" is by score/total ratio, computed in one grouped pass.
func (r *testRepo) BestResultsByUser(bankID, userID int, testIDs []int) (map[int]BestResult, error) {
	out := map[int]BestResult{}
	if len(testIDs) == 0 {
		return out, nil
	}
	type row struct {
		TestID int
		Score  int
		Total  int
	}
	var rows []row
	// DISTINCT ON picks the best ratio per test; ties resolve to the most recent.
	err := r.db.Raw(`
		SELECT DISTINCT ON (test_id) test_id, score, total
		FROM test_attempts
		WHERE test_id IN ? AND user_id = ?
		  AND completed_at IS NOT NULL AND deleted_at IS NULL AND total > 0
		ORDER BY test_id, (score::float / total) DESC, completed_at DESC
	`, testIDs, userID).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, r := range rows {
		out[r.TestID] = BestResult{Score: r.Score, Total: r.Total}
	}
	return out, nil
}

// CompletedCounts returns the number of completed attempts (by anyone) per test
// — the History count shown on each card. Keyed by test id; tests with none are
// absent.
func (r *testRepo) CompletedCounts(testIDs []int) (map[int]int, error) {
	out := map[int]int{}
	if len(testIDs) == 0 {
		return out, nil
	}
	type row struct {
		TestID int
		N      int
	}
	var rows []row
	err := r.db.Raw(`
		SELECT test_id, COUNT(*) AS n
		FROM test_attempts
		WHERE test_id IN ? AND completed_at IS NOT NULL AND deleted_at IS NULL
		GROUP BY test_id
	`, testIDs).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, r := range rows {
		out[r.TestID] = r.N
	}
	return out, nil
}

// TestsSummary aggregates the caller's standing across every test in the bank:
// the total test count, how many they've completed, and their best pct overall.
func (r *testRepo) TestsSummary(bankID, userID int) (TestsSummary, error) {
	var s TestsSummary
	if err := r.db.Model(&model.Test{}).Where("bank_id = ?", bankID).Count(&s.Total).Error; err != nil {
		return s, err
	}
	if err := r.db.Model(&model.Test{}).
		Where("bank_id = ?", bankID).Where(completedByUser, userID).
		Count(&s.TakenCount).Error; err != nil {
		return s, err
	}

	// Best pct across all the caller's completed attempts on this bank's tests.
	var best struct{ Pct *float64 }
	err := r.db.Raw(`
		SELECT MAX(ta.score::float / ta.total) * 100 AS pct
		FROM test_attempts ta
		JOIN tests t ON t.id = ta.test_id AND t.deleted_at IS NULL
		WHERE t.bank_id = ? AND ta.user_id = ?
		  AND ta.completed_at IS NOT NULL AND ta.deleted_at IS NULL AND ta.total > 0
	`, bankID, userID).Scan(&best).Error
	if err != nil {
		return s, err
	}
	s.BestPct = -1
	if best.Pct != nil {
		s.BestPct = int(*best.Pct + 0.5) // round
	}
	return s, nil
}

func (r *testRepo) FindByID(id int) (*model.Test, error) {
	var t model.Test
	err := r.db.
		Preload("Creator").
		Preload("TestQuestions", func(db *gorm.DB) *gorm.DB { return db.Order("position ASC") }).
		Preload("TestQuestions.Question.Item").
		Preload("TestQuestions.Question.Choice").
		First(&t, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &t, err
}

func (r *testRepo) FindByBankAndID(bankID, id int) (*model.Test, error) {
	var t model.Test
	err := r.db.
		Preload("Creator").
		Preload("TestQuestions", func(db *gorm.DB) *gorm.DB { return db.Order("position ASC") }).
		Preload("TestQuestions.Question.Item").
		Preload("TestQuestions.Question.Choice").
		Where("bank_id = ?", bankID).First(&t, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &t, err
}

func (r *testRepo) Create(t *model.Test) error { return r.db.Create(t).Error }

func (r *testRepo) SoftDelete(id int) error {
	return r.db.Delete(&model.Test{}, id).Error
}

func (r *testRepo) Restore(id int) error {
	return r.db.Unscoped().Model(&model.Test{}).Where("id = ?", id).Update("deleted_at", nil).Error
}

func (r *testRepo) CreateTestQuestion(tq *model.TestQuestion) error {
	return r.db.Create(tq).Error
}

// RecentlyUsedQuestionIDs returns distinct question IDs from the last N tests in a bank.
func (r *testRepo) RecentlyUsedQuestionIDs(bankID, lastN int) ([]int, error) {
	var ids []int
	err := r.db.Raw(`
		SELECT DISTINCT question_id FROM test_questions
		WHERE test_id IN (
			SELECT id FROM tests WHERE bank_id = ? AND deleted_at IS NULL
			ORDER BY created_at DESC LIMIT ?
		)
	`, bankID, lastN).Scan(&ids).Error
	return ids, err
}
