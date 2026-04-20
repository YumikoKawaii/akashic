package service

import (
	"errors"
	"strings"
	"time"

	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
)

var ErrAttemptAlreadyCompleted = errors.New("attempt already completed")

type AttemptService struct {
	repo     repository.AttemptRepository
	testRepo repository.TestRepository
}

func NewAttemptService(repo repository.AttemptRepository, testRepo repository.TestRepository) *AttemptService {
	return &AttemptService{repo: repo, testRepo: testRepo}
}

type StartAttemptInput struct {
	TestID string `json:"test_id" binding:"required"`
}

func (s *AttemptService) Start(bankID string, input StartAttemptInput) (*model.TestAttempt, error) {
	if _, err := s.testRepo.FindByBankAndID(bankID, input.TestID); err != nil {
		return nil, err
	}
	attempt := &model.TestAttempt{
		TestID:    input.TestID,
		Answers:   map[string]string{},
		StartedAt: time.Now(),
	}
	return attempt, s.repo.Create(attempt)
}

func (s *AttemptService) GetByID(id string) (*model.TestAttempt, error) {
	return s.repo.FindByID(id)
}

func (s *AttemptService) ListByTest(bankID, testID string) ([]model.TestAttempt, error) {
	if _, err := s.testRepo.FindByBankAndID(bankID, testID); err != nil {
		return nil, err
	}
	return s.repo.FindByTest(testID)
}

type SubmitAttemptInput struct {
	Answers map[string]string `json:"answers" binding:"required"`
}

func (s *AttemptService) Submit(id string, input SubmitAttemptInput) (*model.TestAttempt, error) {
	attempt, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if attempt.CompletedAt != nil {
		return nil, ErrAttemptAlreadyCompleted
	}

	attempt.Answers = input.Answers

	score, total := s.grade(attempt)
	now := time.Now()
	attempt.Score = &score
	attempt.Total = &total
	attempt.CompletedAt = &now

	return attempt, s.repo.Save(attempt)
}

func (s *AttemptService) grade(attempt *model.TestAttempt) (score, total int) {
	if attempt.Test == nil {
		return 0, 0
	}
	for _, tq := range attempt.Test.TestQuestions {
		q := tq.Question
		if q == nil || q.Type == "open" {
			continue
		}
		total++
		if answer, ok := attempt.Answers[q.ID]; ok {
			got := strings.TrimSpace(answer)
			want := strings.TrimSpace(q.CorrectAnswer)
			if q.Type == "sentence_completion" {
				if strings.EqualFold(got, want) {
					score++
				}
			} else if got == want {
				score++
			}
		}
	}
	return score, total
}
