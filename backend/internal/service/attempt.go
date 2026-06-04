package service

import (
	"errors"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/lib/pq"
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

func (s *AttemptService) Start(bankID, testID, userID int) (*model.TestAttempt, error) {
	if _, err := s.testRepo.FindByBankAndID(bankID, testID); err != nil {
		return nil, err
	}
	attempt := &model.TestAttempt{
		TestID:    testID,
		UserID:    &userID,
		Answers:   map[string]string{},
		StartedAt: time.Now(),
	}
	return attempt, s.repo.Create(attempt)
}

func (s *AttemptService) GetByID(bankID, id int) (*model.TestAttempt, error) {
	attempt, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if attempt.Test == nil || attempt.Test.BankID != bankID {
		return nil, ErrForbidden
	}
	return attempt, nil
}

func (s *AttemptService) ListByTest(bankID, testID int) ([]model.TestAttempt, error) {
	if _, err := s.testRepo.FindByBankAndID(bankID, testID); err != nil {
		return nil, err
	}
	return s.repo.FindByTest(testID)
}

type SubmitAttemptInput struct {
	Answers map[string]string `json:"answers" binding:"required"`
}

// SaveProgress persists in-progress answers without grading or completing the
// attempt, so a reload can resume. Same caller guards as Submit (taker-only,
// must belong to the bank, must still be in progress), but it only touches the
// answers column.
func (s *AttemptService) SaveProgress(bankID, id, userID int, answers map[string]string) (*model.TestAttempt, error) {
	attempt, err := s.repo.FindByIDLite(id)
	if err != nil {
		return nil, err
	}
	if attempt.Test == nil || attempt.Test.BankID != bankID {
		return nil, ErrForbidden
	}
	if attempt.UserID == nil || *attempt.UserID != userID {
		return nil, ErrForbidden
	}
	if attempt.CompletedAt != nil {
		return nil, ErrAttemptAlreadyCompleted
	}

	if err := s.repo.UpdateAnswers(id, answers); err != nil {
		return nil, err
	}
	attempt.Answers = answers
	return attempt, nil
}

func (s *AttemptService) Submit(bankID, id, userID int, input SubmitAttemptInput) (*model.TestAttempt, error) {
	attempt, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if attempt.Test == nil || attempt.Test.BankID != bankID {
		return nil, ErrForbidden
	}
	// Only the taker may submit their own attempt.
	if attempt.UserID == nil || *attempt.UserID != userID {
		return nil, ErrForbidden
	}
	if attempt.CompletedAt != nil {
		return nil, ErrAttemptAlreadyCompleted
	}

	attempt.Answers = input.Answers

	score, total := grade(attempt)
	now := time.Now()
	attempt.Score = &score
	attempt.Total = &total
	attempt.CompletedAt = &now

	return attempt, s.repo.Save(attempt)
}

func grade(attempt *model.TestAttempt) (score, total int) {
	if attempt.Test == nil {
		return 0, 0
	}
	for _, tq := range attempt.Test.TestQuestions {
		q := tq.Question
		if q == nil || (q.Item == nil && q.Choice == nil) {
			continue
		}
		total++
		submitted, ok := attempt.Answers[strconv.Itoa(q.ID)]
		if !ok {
			continue
		}
		got := strings.TrimSpace(submitted)

		if q.Choice != nil {
			if mcqMatch(got, q.Choice.Answers) {
				score++
			}
		} else {
			want := strings.TrimSpace(q.Item.Answer)
			switch q.Type {
			case "sentence_completion", "form_completion", "short_answer", "tf_ng", "yn_ng":
				if strings.EqualFold(got, want) {
					score++
				}
			default:
				if got == want {
					score++
				}
			}
		}
	}
	return score, total
}

func mcqMatch(submitted string, want pq.StringArray) bool {
	gotParts := strings.Split(submitted, "|")
	for i := range gotParts {
		gotParts[i] = strings.TrimSpace(gotParts[i])
	}
	sort.Strings(gotParts)

	wantCopy := make([]string, len(want))
	copy(wantCopy, want)
	sort.Strings(wantCopy)

	if len(gotParts) != len(wantCopy) {
		return false
	}
	for i := range gotParts {
		if gotParts[i] != wantCopy[i] {
			return false
		}
	}
	return true
}
