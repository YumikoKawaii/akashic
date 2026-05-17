package service

import (
	"math/rand"

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
}

func NewTestService(
	u *uow.UnitOfWork,
	testRepo repository.TestRepository,
	questionRepo repository.QuestionRepository,
	groupRepo repository.QuestionGroupRepository,
	bankRepo repository.BankRepository,
) *TestService {
	return &TestService{uow: u, testRepo: testRepo, questionRepo: questionRepo, groupRepo: groupRepo, bankRepo: bankRepo}
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
	t, err := s.testRepo.FindByBankAndID(bankID, id)
	if err != nil {
		return nil, err
	}
	return t, nil
}

type GenerateTestInput struct {
	Name        string            `json:"name"        binding:"required"`
	Description string            `json:"description"`
	Config      *model.TestConfig `json:"config"`
}

// selUnit is a single selection unit: a standalone question or a question group.
type selUnit struct {
	question *model.Question
	groupID  int
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

	qFilter := repository.QuestionFilter{
		CategoryIDs:    config.CategoryIDs,
		Types:          config.Types,
		Tags:           config.Tags,
		StandaloneOnly: true,
	}
	gFilter := repository.GroupFilter{
		CategoryIDs: config.CategoryIDs,
		PassageIDs:  config.PassageIDs,
		Types:       config.Types,
	}

	// Build shuffled pools per difficulty.
	pools := map[string][]selUnit{}
	for _, diff := range []string{"easy", "medium", "hard"} {
		pools[diff], err = s.buildPool(bankID, diff, qFilter, gFilter, skipStandalone, skipGroups)
		if err != nil {
			return nil, err
		}
	}

	backfillOrder := map[string][]string{
		"easy":   {"medium", "hard"},
		"medium": {"hard", "easy"},
		"hard":   {"medium", "easy"},
	}

	var selectedUnits []selUnit
	shortage := map[string]int{}

	for _, bucket := range []struct {
		diff  string
		count int
	}{
		{"easy", config.EasyCount},
		{"medium", config.MediumCount},
		{"hard", config.HardCount},
	} {
		if bucket.count <= 0 {
			continue
		}
		pool := pools[bucket.diff]
		n := min(bucket.count, len(pool))
		selectedUnits = append(selectedUnits, pool[:n]...)
		pools[bucket.diff] = pool[n:]
		shortage[bucket.diff] = bucket.count - n
	}

	// Backfill shortages from other difficulty pools.
	for _, bucket := range []struct {
		diff  string
		count int
	}{
		{"easy", config.EasyCount},
		{"medium", config.MediumCount},
		{"hard", config.HardCount},
	} {
		need := shortage[bucket.diff]
		for _, bf := range backfillOrder[bucket.diff] {
			if need <= 0 {
				break
			}
			pool := pools[bf]
			take := min(need, len(pool))
			selectedUnits = append(selectedUnits, pool[:take]...)
			pools[bf] = pool[take:]
			need -= take
		}
	}

	// Expand units into individual questions.
	var picked []model.Question
	for _, u := range selectedUnits {
		if u.question != nil {
			picked = append(picked, *u.question)
		} else {
			qs, err := s.questionRepo.FindByGroup(u.groupID)
			if err != nil {
				return nil, err
			}
			picked = append(picked, qs...)
		}
	}

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
	return s.testRepo.FindByID(test.ID)
}

func (s *TestService) buildPool(bankID int, diff string, qf repository.QuestionFilter, gf repository.GroupFilter, skipStandalone, skipGroups bool) ([]selUnit, error) {
	var pool []selUnit

	if !skipStandalone {
		standalones, err := s.questionRepo.FindByBankAndDifficulty(bankID, diff, qf)
		if err != nil {
			return nil, err
		}
		for i := range standalones {
			pool = append(pool, selUnit{question: &standalones[i]})
		}
	}

	if !skipGroups {
		gf.Difficulty = diff
		groups, err := s.groupRepo.FindByBank(bankID, gf)
		if err != nil {
			return nil, err
		}
		for _, g := range groups {
			pool = append(pool, selUnit{groupID: g.ID})
		}
	}

	// Passage-only pools preserve original group order; standalone/mixed pools are shuffled.
	if !skipStandalone {
		rand.Shuffle(len(pool), func(i, j int) { pool[i], pool[j] = pool[j], pool[i] })
	}
	return pool, nil
}

func (s *TestService) Delete(bankID, id int) error {
	t, err := s.testRepo.FindByBankAndID(bankID, id)
	if err != nil {
		return err
	}
	_ = t
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
