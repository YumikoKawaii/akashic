package service

import (
	"math/rand"

	"github.com/google/uuid"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/uow"
)

type TestService struct {
	uow          *uow.UnitOfWork
	testRepo     repository.TestRepository
	questionRepo repository.QuestionRepository
	passageRepo  repository.PassageRepository
	bankRepo     repository.BankRepository
}

func NewTestService(
	u *uow.UnitOfWork,
	testRepo repository.TestRepository,
	questionRepo repository.QuestionRepository,
	passageRepo repository.PassageRepository,
	bankRepo repository.BankRepository,
) *TestService {
	return &TestService{uow: u, testRepo: testRepo, questionRepo: questionRepo, passageRepo: passageRepo, bankRepo: bankRepo}
}

func (s *TestService) ListByBank(bankID, userID string) ([]model.Test, error) {
	if _, err := s.bankRepo.FindByIDForUser(bankID, userID); err != nil {
		return nil, err
	}
	return s.testRepo.FindByBank(bankID)
}

func (s *TestService) GetByID(bankID, id string) (*model.Test, error) {
	return s.testRepo.FindByBankAndID(bankID, id)
}

type GenerateTestInput struct {
	Name        string            `json:"name"        binding:"required"`
	Description string            `json:"description"`
	Config      *model.TestConfig `json:"config"`
}

// unit is either a standalone question or a passage (atomic group of questions).
type unit struct {
	question *model.Question
	passage  *model.Passage
}

func (s *TestService) Generate(bankID, userID string, input GenerateTestInput) (*model.Test, error) {
	bank, err := s.bankRepo.FindByIDForUser(bankID, userID)
	if err != nil {
		return nil, err
	}

	config := bank.DefaultConfig
	if input.Config != nil {
		config = *input.Config
	}

	// Determine what goes into the pool: passages, standalone questions, or both.
	wantPassages    := len(config.Types) == 0
	wantStandalone  := len(config.Types) == 0
	standaloneTypes := []string{}
	for _, t := range config.Types {
		if t == "passage" {
			wantPassages = true
		} else {
			wantStandalone = true
			standaloneTypes = append(standaloneTypes, t)
		}
	}

	passageFilter := repository.PassageFilter{
		CategoryIDs: config.CategoryIDs,
	}
	questionFilter := repository.QuestionFilter{
		CategoryIDs:    config.CategoryIDs,
		Tags:           config.Tags,
		Types:          standaloneTypes,
		StandaloneOnly: true,
	}

	var picked []model.Question

	if config.TotalCount > 0 {
		// Flat-pool mode: pick N units regardless of difficulty.
		var pool []unit

		for _, diff := range []string{"easy", "medium", "hard"} {
			if wantStandalone {
				questions, err := s.questionRepo.FindByBankAndDifficulty(bankID, diff, questionFilter)
				if err != nil {
					return nil, err
				}
				for i := range questions {
					pool = append(pool, unit{question: &questions[i]})
				}
			}
			if wantPassages {
				passages, err := s.passageRepo.FindByBankAndDifficulty(bankID, diff, passageFilter)
				if err != nil {
					return nil, err
				}
				for i := range passages {
					pool = append(pool, unit{passage: &passages[i]})
				}
			}
		}

		rand.Shuffle(len(pool), func(i, j int) { pool[i], pool[j] = pool[j], pool[i] })
		n := min(config.TotalCount, len(pool))
		for _, u := range pool[:n] {
			if u.question != nil {
				picked = append(picked, *u.question)
			} else {
				questions, err := s.questionRepo.FindByPassage(u.passage.ID)
				if err != nil {
					return nil, err
				}
				picked = append(picked, questions...)
			}
		}
	} else {
		// Per-difficulty mode.
		for _, bucket := range []struct {
			difficulty string
			count      int
		}{
			{"easy", config.EasyCount},
			{"medium", config.MediumCount},
			{"hard", config.HardCount},
		} {
			if bucket.count <= 0 {
				continue
			}

			var units []unit

			if wantStandalone {
				questions, err := s.questionRepo.FindByBankAndDifficulty(bankID, bucket.difficulty, questionFilter)
				if err != nil {
					return nil, err
				}
				for i := range questions {
					units = append(units, unit{question: &questions[i]})
				}
			}

			if wantPassages {
				passages, err := s.passageRepo.FindByBankAndDifficulty(bankID, bucket.difficulty, passageFilter)
				if err != nil {
					return nil, err
				}
				for i := range passages {
					units = append(units, unit{passage: &passages[i]})
				}
			}

			rand.Shuffle(len(units), func(i, j int) { units[i], units[j] = units[j], units[i] })

			n := min(bucket.count, len(units))
			for _, u := range units[:n] {
				if u.question != nil {
					picked = append(picked, *u.question)
				} else {
					questions, err := s.questionRepo.FindByPassage(u.passage.ID)
					if err != nil {
						return nil, err
					}
					picked = append(picked, questions...)
				}
			}
		}
	}

	test := &model.Test{
		ID:          uuid.New().String(),
		BankID:      bankID,
		Name:        input.Name,
		Description: input.Description,
		Config:      config,
	}

	testQuestions := make([]model.TestQuestion, len(picked))
	for i, q := range picked {
		testQuestions[i] = model.TestQuestion{
			TestID:     test.ID,
			QuestionID: q.ID,
			Position:   i + 1,
		}
	}

	tx := s.uow.Begin()
	defer tx.Rollback()

	if err := tx.Tests.CreateWithQuestions(test, testQuestions); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return s.testRepo.FindByBankAndID(bankID, test.ID)
}

func (s *TestService) Delete(bankID, id string) error {
	return s.testRepo.Delete(bankID, id)
}
