package service

import (
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/uow"
)

type TestService struct {
	uow          *uow.UnitOfWork
	testRepo     repository.TestRepository
	questionRepo repository.QuestionRepository
	groupRepo    repository.QuestionGroupRepository
	bankRepo     repository.BankRepository
	cache        *GenerateCache
}

func NewTestService(
	u *uow.UnitOfWork,
	testRepo repository.TestRepository,
	questionRepo repository.QuestionRepository,
	groupRepo repository.QuestionGroupRepository,
	bankRepo repository.BankRepository,
	cache *GenerateCache,
) *TestService {
	return &TestService{
		uow:          u,
		testRepo:     testRepo,
		questionRepo: questionRepo,
		groupRepo:    groupRepo,
		bankRepo:     bankRepo,
		cache:        cache,
	}
}

func (s *TestService) ListByBank(bankID int) ([]model.Test, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}
	return s.testRepo.FindByBank(bankID)
}

type TestPage struct {
	Data     []model.Test `json:"data"`
	Total    int64        `json:"total"`
	Page     int          `json:"page"`
	PageSize int          `json:"page_size"`
}

func (s *TestService) ListByBankPaged(bankID, page, pageSize int) (*TestPage, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}
	ts, total, err := s.testRepo.FindByBankPaged(bankID, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &TestPage{Data: ts, Total: total, Page: page, PageSize: pageSize}, nil
}

func (s *TestService) GetByID(bankID, id int) (*model.Test, error) {
	return s.testRepo.FindByBankAndID(bankID, id)
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

func (s *TestService) Generate(bankID int, input GenerateTestInput) (*model.Test, error) {
	bank, err := s.bankRepo.FindByID(bankID)
	if err != nil {
		return nil, err
	}

	config := bank.DefaultConfig
	if input.Config != nil {
		config = *input.Config
	}

	skipGroups     := config.StandaloneOnly
	skipStandalone := len(config.PassageIDs) > 0 && !config.StandaloneOnly

	var picked []model.Question

	// ── Standalone path: in-memory cache + per-user exclusion ────────────
	if !skipStandalone {
		pool, err := s.loadPool(bankID)
		if err != nil {
			return nil, err
		}
		byDiff := filterPool(pool, config.CategoryIDs, config.Types, config.Tags)
		excluded := s.cache.excludedForUser(input.UserID, bankID)

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

		selectedIDs := make([]int, 0, config.EasyCount+config.MediumCount+config.HardCount)
		pickedSet := make(map[int]struct{})
		shortage := map[string]int{}

		// Primary selection per difficulty
		for _, b := range buckets {
			if b.count <= 0 {
				continue
			}
			chosen := pickRandom(available(byDiff[b.diff], pickedSet), excluded, b.count)
			for _, q := range chosen {
				selectedIDs = append(selectedIDs, q.ID)
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
					selectedIDs = append(selectedIDs, q.ID)
					pickedSet[q.ID] = struct{}{}
					need--
				}
			}
		}

		if len(selectedIDs) > 0 {
			qs, err := s.questionRepo.FindByIDs(selectedIDs)
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

		var groupUnits []selUnit
		shortage := map[string]int{}

		for _, b := range []struct{ diff string; count int }{
			{"easy", config.EasyCount},
			{"medium", config.MediumCount},
			{"hard", config.HardCount},
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
		for _, b := range []struct{ diff string; count int }{
			{"easy", config.EasyCount},
			{"medium", config.MediumCount},
			{"hard", config.HardCount},
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
			qs, err := s.questionRepo.FindByGroup(u.groupID)
			if err != nil {
				return nil, err
			}
			picked = append(picked, qs...)
		}
	}

	// ── Persist test ──────────────────────────────────────────────────────
	test := &model.Test{
		BankID:      bankID,
		Name:        input.Name,
		Description: input.Description,
		Config:      config,
	}

	tx := s.uow.Begin()
	defer tx.Rollback()

	if err := tx.Tests.Create(test); err != nil {
		return nil, err
	}
	for i, q := range picked {
		if err := tx.Tests.CreateTestQuestion(&model.TestQuestion{
			TestID:     test.ID,
			QuestionID: q.ID,
			Position:   i + 1,
		}); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// ── Record attempt in per-user history cache ──────────────────────────
	if input.UserID > 0 {
		ids := make([]int, 0, len(picked))
		for _, q := range picked {
			ids = append(ids, q.ID)
		}
		s.cache.RecordAttempt(input.UserID, bankID, ids)
	}

	return s.testRepo.FindByID(test.ID)
}

// loadPool loads question metadata from the DB for pool filtering and selection.
func (s *TestService) loadPool(bankID int) ([]CachedQuestion, error) {
	metas, err := s.questionRepo.FindAllMeta(bankID)
	if err != nil {
		return nil, err
	}
	pool := make([]CachedQuestion, len(metas))
	for i, m := range metas {
		pool[i] = CachedQuestion{
			ID:         m.ID,
			Difficulty: m.Difficulty,
			CategoryID: m.CategoryID,
			Type:       m.Type,
			Tags:       []string(m.Tags),
			GroupID:    m.GroupID,
		}
	}
	return pool, nil
}

// buildGroupPool fetches question groups from the DB for the passage path.
func (s *TestService) buildGroupPool(bankID int, diff string, gf repository.GroupFilter) ([]selUnit, error) {
	gf.Difficulty = diff
	groups, err := s.groupRepo.FindByBank(bankID, gf)
	if err != nil {
		return nil, err
	}
	pool := make([]selUnit, len(groups))
	for i, g := range groups {
		pool[i] = selUnit{groupID: g.ID}
	}
	return pool, nil
}

func (s *TestService) Delete(bankID, id int) error {
	if _, err := s.testRepo.FindByBankAndID(bankID, id); err != nil {
		return err
	}
	return s.testRepo.SoftDelete(id)
}

func (s *TestService) Restore(bankID, id int) (*model.Test, error) {
	if _, err := s.testRepo.FindByBankAndID(bankID, id); err != nil {
		return nil, err
	}
	if err := s.testRepo.Restore(id); err != nil {
		return nil, err
	}
	return s.testRepo.FindByBankAndID(bankID, id)
}
