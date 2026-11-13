package service

import (
	"testing"

	"github.com/lib/pq"
	"github.com/yumikokawaii/akashic/internal/model"
)

func gradeOf(questions []model.Question, answers map[string]string) (int, int) {
	return grade(&model.TestAttempt{
		Test:    &model.Test{Questions: questions},
		Answers: answers,
	})
}

func TestGradeMatchesEveryTypeCaseInsensitively(t *testing.T) {
	questions := []model.Question{
		{ID: 1, Type: "mcq", Content: model.QuestionContent{Answers: pq.StringArray{"B", "D"}}},
		{ID: 2, Type: "tf_ng", Content: model.QuestionContent{Answer: "Not Given"}},
		{ID: 3, Type: "sentence_completion", Content: model.QuestionContent{Answer: "sink"}},
		{ID: 4, Type: "short_answer", Content: model.QuestionContent{Answer: "Tokyo"}},
		{ID: 5, Type: "matching_headings", Content: model.QuestionContent{Answer: "iv"}},
		{ID: 6, Type: "matching_features", Content: model.QuestionContent{Answer: "C"}},
	}
	answers := map[string]string{
		"1": "D | B",
		"2": "not given",
		"3": " SINK ",
		"4": "tokyo",
		"5": "IV",
		"6": "c",
	}
	score, total := gradeOf(questions, answers)
	if score != 6 || total != 6 {
		t.Fatalf("got %d/%d, want 6/6", score, total)
	}
}

func TestGradeCountsUnansweredAndWrong(t *testing.T) {
	questions := []model.Question{
		{ID: 1, Type: "mcq", Content: model.QuestionContent{Answers: pq.StringArray{"A"}}},
		{ID: 2, Type: "mcq", Content: model.QuestionContent{Answers: pq.StringArray{"A", "B"}}},
		{ID: 3, Type: "yn_ng", Content: model.QuestionContent{Answer: "Yes"}},
	}
	score, total := gradeOf(questions, map[string]string{"1": "B", "2": "A"})
	if score != 0 || total != 3 {
		t.Fatalf("got %d/%d, want 0/3", score, total)
	}
}

func TestGradeWithoutTest(t *testing.T) {
	score, total := grade(&model.TestAttempt{})
	if score != 0 || total != 0 {
		t.Fatalf("got %d/%d, want 0/0", score, total)
	}
}
