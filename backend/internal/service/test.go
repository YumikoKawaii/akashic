package service

import (
	"context"

	"github.com/lib/pq"
	"github.com/yumikokawaii/akashic/internal/membership"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/uow"
)

type TestService struct {
	uow   uow.UnitOfWork
	cache GenerateCache
}

func NewTestService(u uow.UnitOfWork, cache GenerateCache) *TestService {
	return &TestService{uow: u, cache: cache}
}

func (s *TestService) ListByBank(bankID int) ([]model.Test, error) {
	if _, err := s.uow.Store().Banks.FindByID(bankID); err != nil {
		return nil, err
	}
	return s.uow.Store().Tests.FindByBank(bankID)
}

type TestPage struct {
	Data      []model.Test                  `json:"data"`
	Best      map[int]repository.BestResult `json:"-"` // caller's best per test id
	Completed map[int]int                   `json:"-"` // completed-attempt count per test id
	Summary   repository.TestsSummary       `json:"-"` // caller's standing across the bank
	Total     int64                         `json:"total"`
	Page      int                           `json:"page"`
	PageSize  int                           `json:"page_size"`
}

// ListByBankPaged returns one page of the bank's shared tests — all members and
// public visitors see them all. The page is sorted/filtered per q, each test
// carries the caller's best completed attempt, and the summary aggregates the
// caller's standing over the whole filtered bank (not just this page).
func (s *TestService) ListByBankPaged(bankID int, q repository.TestListQuery) (*TestPage, error) {
	if _, err := s.uow.Store().Banks.FindByID(bankID); err != nil {
		return nil, err
	}
	store := s.uow.Store()
	ts, total, err := store.Tests.FindByBankPaged(bankID, q)
	if err != nil {
		return nil, err
	}

	ids := make([]int, len(ts))
	for i := range ts {
		ids[i] = ts[i].ID
	}
	best, err := store.Tests.BestResultsByUser(bankID, q.UserID, ids)
	if err != nil {
		return nil, err
	}
	completed, err := store.Tests.CompletedCounts(ids)
	if err != nil {
		return nil, err
	}
	summary, err := store.Tests.TestsSummary(bankID, q.UserID)
	if err != nil {
		return nil, err
	}

	return &TestPage{
		Data:      ts,
		Best:      best,
		Completed: completed,
		Summary:   summary,
		Total:     total,
		Page:      q.Page,
		PageSize:  q.PageSize,
	}, nil
}

func (s *TestService) GetByID(bankID, id int) (*model.Test, error) {
	return s.uow.Store().Tests.FindByBankAndID(bankID, id)
}

// canManageTest reports whether userID (with bank role callerRole) may delete or
// restore a test: its creator, or any editor+.
func canManageTest(test *model.Test, userID int, callerRole string) bool {
	if test.CreatedBy != nil && *test.CreatedBy == userID {
		return true
	}
	return membership.Level(callerRole) >= membership.Level(membership.RoleEditor)
}

type GenerateTestInput struct {
	Name        string            `json:"name"        binding:"required"`
	Description string            `json:"description"`
	Config      *model.TestConfig `json:"config"`
	UserID      int               `json:"-"` // set by handler from auth context
}

func (s *TestService) Generate(ctx context.Context, bankID int, input GenerateTestInput) (*model.Test, error) {
	bank, err := s.uow.Store().Banks.FindByID(bankID)
	if err != nil {
		return nil, err
	}

	config := bank.DefaultConfig
	if input.Config != nil {
		config = *input.Config
	}

	pool, err := s.pool(bankID)
	if err != nil {
		return nil, err
	}

	seq, excluded := s.cache.BeginGeneration(input.UserID, bankID)
	units := selectUnits(pool, config, excluded)
	if len(units) == 0 {
		return nil, ErrNoQuestions
	}

	counts := map[string]int{}
	var ids []int
	for _, u := range units {
		counts[u.Difficulty] += u.Size()
		ids = append(ids, u.QuestionIDs...)
	}
	config.EasyCount, config.MediumCount, config.HardCount = counts["easy"], counts["medium"], counts["hard"]

	test := &model.Test{
		BankID:      bankID,
		CreatedBy:   &input.UserID,
		Name:        input.Name,
		Description: input.Description,
		Config:      config,
		QuestionIDs: make(pq.Int64Array, len(ids)),
	}
	for i, id := range ids {
		test.QuestionIDs[i] = int64(id)
	}
	if err := s.uow.Store().Tests.Create(test); err != nil {
		return nil, err
	}

	s.cache.RecordGeneration(input.UserID, bankID, seq, ids)

	return s.uow.Store().Tests.FindByID(test.ID)
}

func (s *TestService) pool(bankID int) ([]PoolUnit, error) {
	if pool, ok := s.cache.GetPool(bankID); ok {
		return pool, nil
	}
	version := s.cache.PoolVersion(bankID)
	pool, err := LoadPool(s.uow.Store(), bankID)
	if err != nil {
		return nil, err
	}
	s.cache.SetPool(bankID, version, pool)
	return pool, nil
}

func LoadPool(store *uow.Store, bankID int) ([]PoolUnit, error) {
	qs, err := store.Questions.FindAllMeta(bankID)
	if err != nil {
		return nil, err
	}
	gs, err := store.Groups.FindAllMeta(bankID)
	if err != nil {
		return nil, err
	}
	pool := make([]PoolUnit, 0, len(qs)+len(gs))
	for _, q := range qs {
		pool = append(pool, PoolUnit{
			QuestionIDs: []int{q.ID},
			Difficulty:  q.Difficulty,
			Types:       []string{q.Type},
			Tags:        []string(q.Tags),
		})
	}
	for _, g := range gs {
		ids := make([]int, len(g.QuestionIDs))
		for i, id := range g.QuestionIDs {
			ids[i] = int(id)
		}
		pool = append(pool, PoolUnit{
			GroupID:     g.ID,
			QuestionIDs: ids,
			Difficulty:  g.Difficulty,
			Types:       []string(g.Types),
			Tags:        []string(g.Tags),
		})
	}
	return pool, nil
}

func (s *TestService) Delete(bankID, id, userID int, callerRole string) error {
	test, err := s.uow.Store().Tests.FindByBankAndID(bankID, id)
	if err != nil {
		return err
	}
	if !canManageTest(test, userID, callerRole) {
		return ErrForbidden
	}
	return s.uow.Store().Tests.SoftDelete(id)
}

func (s *TestService) Restore(bankID, id, userID int, callerRole string) (*model.Test, error) {
	test, err := s.uow.Store().Tests.FindByBankAndIDUnscoped(bankID, id)
	if err != nil {
		return nil, err
	}
	if !canManageTest(test, userID, callerRole) {
		return nil, ErrForbidden
	}
	if err := s.uow.Store().Tests.Restore(id); err != nil {
		return nil, err
	}
	return s.uow.Store().Tests.FindByBankAndID(bankID, id)
}

// ListDeleted returns the bank's soft-deleted tests the caller may restore:
// their own, or all of them for an editor+.
func (s *TestService) ListDeleted(bankID, userID int, callerRole string) ([]model.Test, error) {
	tests, err := s.uow.Store().Tests.FindDeletedByBank(bankID)
	if err != nil {
		return nil, err
	}
	out := tests[:0]
	for i := range tests {
		if canManageTest(&tests[i], userID, callerRole) {
			out = append(out, tests[i])
		}
	}
	return out, nil
}
