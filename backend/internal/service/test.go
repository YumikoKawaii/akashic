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
	bankRepo     repository.BankRepository
}

func NewTestService(
	u *uow.UnitOfWork,
	testRepo repository.TestRepository,
	questionRepo repository.QuestionRepository,
	bankRepo repository.BankRepository,
) *TestService {
	return &TestService{uow: u, testRepo: testRepo, questionRepo: questionRepo, bankRepo: bankRepo}
}

func (s *TestService) ListByBank(bankID string) ([]model.Test, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
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

func (s *TestService) Generate(bankID string, input GenerateTestInput) (*model.Test, error) {
	bank, err := s.bankRepo.FindByID(bankID)
	if err != nil {
		return nil, err
	}

	// Resolve config: use provided config or fall back to bank default
	config := bank.DefaultConfig
	if input.Config != nil {
		config = *input.Config
	}

	filter := repository.QuestionFilter{
		CategoryID: config.CategoryID,
		Type:       config.Type,
		Tags:       config.Tags,
	}

	var picked []model.Question
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
		questions, err := s.questionRepo.FindByBankAndDifficulty(bankID, bucket.difficulty, filter)
		if err != nil {
			return nil, err
		}
		rand.Shuffle(len(questions), func(i, j int) {
			questions[i], questions[j] = questions[j], questions[i]
		})
		n := min(bucket.count, len(questions))
		picked = append(picked, questions[:n]...)
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

	// UoW: insert test + test_questions in one transaction
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
