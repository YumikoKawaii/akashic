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

	var picked []model.Question
	var seq int
	var standaloneIDs []int

	// ── Standalone path: pool cache + per-user exclusion ─────────────────
	{
		pool, ok := s.cache.GetPool(bankID)
		if !ok {
			pool, err = s.loadPool(bankID)
			if err != nil {
				return nil, err
			}
		}

		var excluded map[int]struct{}
		seq, excluded = s.cache.BeginGeneration(input.UserID, bankID)
		byDiff := filterPool(pool, config.Types, config.Tags)

		type bucket struct {
			diff  string
			count int
		}
		buckets := []bucket{
			{"easy", config.EasyCount},
			{"medium", config.MediumCount},
			{"hard", config.HardCount},
		}
		backfillOrder := map[string][]string{
			"easy":   {"medium", "hard"},
			"medium": {"hard", "easy"},
			"hard":   {"medium", "easy"},
		}

		pickedSet := make(map[int]struct{})
		shortage := map[string]int{}

		// Primary selection per difficulty
		for _, b := range buckets {
			if b.count <= 0 {
				continue
			}
			chosen := pickRandom(available(byDiff[b.diff], pickedSet), excluded, b.count)
			for _, q := range chosen {
				standaloneIDs = append(standaloneIDs, q.ID)
				pickedSet[q.ID] = struct{}{}
			}
			shortage[b.diff] = b.count - len(chosen)
		}

		// Backfill shortages from other difficulty buckets
		for _, b := range buckets {
			need := shortage[b.diff]
			for _, bf := range backfillOrder[b.diff] {
				if need <= 0 {
					break
				}
				chosen := pickRandom(available(byDiff[bf], pickedSet), excluded, need)
				for _, q := range chosen {
					standaloneIDs = append(standaloneIDs, q.ID)
					pickedSet[q.ID] = struct{}{}
					need--
				}
			}
		}

		if len(standaloneIDs) > 0 {
			qs, err := s.uow.Store().Questions.FindByIDs(standaloneIDs)
			if err != nil {
				return nil, err
			}
			picked = append(picked, qs...)
		}
	}

	// ── Persist test ──────────────────────────────────────────────────────
	// Snapshot the actual difficulty mix of the picked questions: passage
	// mode requests zero counts and backfill can shift the standalone mix,
	// so the requested counts may not reflect the test's real composition.
	var easyN, mediumN, hardN int
	for i := range picked {
		switch picked[i].Difficulty {
		case "easy":
			easyN++
		case "medium":
			mediumN++
		case "hard":
			hardN++
		}
	}
	config.EasyCount, config.MediumCount, config.HardCount = easyN, mediumN, hardN

	test := &model.Test{
		BankID:      bankID,
		CreatedBy:   &input.UserID,
		Name:        input.Name,
		Description: input.Description,
		Config:      config,
	}

	test.QuestionIDs = make(pq.Int64Array, len(picked))
	for i, q := range picked {
		test.QuestionIDs[i] = int64(q.ID)
	}
	if err := s.uow.Store().Tests.Create(test); err != nil {
		return nil, err
	}

	// ── Record standalone question history for future exclusion ──────────
	s.cache.RecordGeneration(input.UserID, bankID, seq, standaloneIDs)

	return s.uow.Store().Tests.FindByID(test.ID)
}

// loadPool loads question metadata from the DB for pool filtering and selection.
func (s *TestService) loadPool(bankID int) ([]CachedQuestion, error) {
	metas, err := s.uow.Store().Questions.FindAllMeta(bankID)
	if err != nil {
		return nil, err
	}
	pool := make([]CachedQuestion, 0, len(metas))
	for _, m := range metas {
		pool = append(pool, CachedQuestion{
			ID:         m.ID,
			Difficulty: m.Difficulty,
			Type:       m.Type,
			Tags:       []string(m.Tags),
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
	test, err := s.uow.Store().Tests.FindByBankAndID(bankID, id)
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
