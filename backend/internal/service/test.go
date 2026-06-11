package service

import (
	"context"

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

// selUnit is a selection unit for the passage/group path.
type selUnit struct {
	groupID int
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

	skipGroups := config.StandaloneOnly
	skipStandalone := len(config.PassageIDs) > 0 && !config.StandaloneOnly

	var picked []model.Question
	var seq int
	var standaloneIDs []int

	// ── Standalone path: pool cache + per-user exclusion ─────────────────
	if !skipStandalone {
		pool, ok := s.cache.GetPool(bankID)
		if !ok {
			pool, err = s.loadPool(bankID)
			if err != nil {
				return nil, err
			}
		}

		var excluded map[int]struct{}
		seq, excluded = s.cache.BeginGeneration(input.UserID, bankID)
		byDiff := filterPool(pool, config.CategoryIDs, config.Types, config.Tags)

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

	// ── Passage/group path: DB-backed ────────────────────────────────────
	if !skipGroups {
		gFilter := repository.GroupFilter{
			CategoryIDs: config.CategoryIDs,
			PassageIDs:  config.PassageIDs,
			Types:       config.Types,
		}
		groupPools := map[string][]selUnit{}
		for _, diff := range []string{"easy", "medium", "hard"} {
			groupPools[diff], err = s.buildGroupPool(bankID, diff, gFilter)
			if err != nil {
				return nil, err
			}
		}

		backfillOrder := map[string][]string{
			"easy":   {"medium", "hard"},
			"medium": {"hard", "easy"},
			"hard":   {"medium", "easy"},
		}

		// Explicit passages with no per-difficulty counts means "the whole
		// passage": take every group the selected passages contain.
		easyCount, mediumCount, hardCount := config.EasyCount, config.MediumCount, config.HardCount
		if len(config.PassageIDs) > 0 && easyCount+mediumCount+hardCount <= 0 {
			easyCount = len(groupPools["easy"])
			mediumCount = len(groupPools["medium"])
			hardCount = len(groupPools["hard"])
		}

		var groupUnits []selUnit
		shortage := map[string]int{}

		for _, b := range []struct {
			diff  string
			count int
		}{
			{"easy", easyCount},
			{"medium", mediumCount},
			{"hard", hardCount},
		} {
			if b.count <= 0 {
				continue
			}
			pool := groupPools[b.diff]
			n := min(b.count, len(pool))
			groupUnits = append(groupUnits, pool[:n]...)
			groupPools[b.diff] = pool[n:]
			shortage[b.diff] = b.count - n
		}
		for _, b := range []struct {
			diff  string
			count int
		}{
			{"easy", easyCount},
			{"medium", mediumCount},
			{"hard", hardCount},
		} {
			need := shortage[b.diff]
			for _, bf := range backfillOrder[b.diff] {
				if need <= 0 {
					break
				}
				pool := groupPools[bf]
				take := min(need, len(pool))
				groupUnits = append(groupUnits, pool[:take]...)
				groupPools[bf] = pool[take:]
				need -= take
			}
		}

		for _, u := range groupUnits {
			qs, err := s.uow.Store().Questions.FindByGroup(u.groupID)
			if err != nil {
				return nil, err
			}
			picked = append(picked, qs...)
		}
	}

	// ── Persist test ──────────────────────────────────────────────────────
	test := &model.Test{
		BankID:      bankID,
		CreatedBy:   &input.UserID,
		Name:        input.Name,
		Description: input.Description,
		Config:      config,
	}

	if err := s.uow.Do(ctx, func(tx *uow.Store) error {
		if err := tx.Tests.Create(test); err != nil {
			return err
		}
		for i, q := range picked {
			if err := tx.Tests.CreateTestQuestion(&model.TestQuestion{
				TestID:     test.ID,
				QuestionID: q.ID,
				Position:   i + 1,
			}); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
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
		if m.GroupID != nil {
			continue
		}
		pool = append(pool, CachedQuestion{
			ID:         m.ID,
			Difficulty: m.Difficulty,
			CategoryID: m.CategoryID,
			Type:       m.Type,
			Tags:       []string(m.Tags),
		})
	}
	return pool, nil
}

// buildGroupPool fetches question groups from the DB for the passage path.
func (s *TestService) buildGroupPool(bankID int, diff string, gf repository.GroupFilter) ([]selUnit, error) {
	gf.Difficulty = diff
	groups, err := s.uow.Store().QuestionGroups.FindByBank(bankID, gf)
	if err != nil {
		return nil, err
	}
	pool := make([]selUnit, len(groups))
	for i, g := range groups {
		pool[i] = selUnit{groupID: g.ID}
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
