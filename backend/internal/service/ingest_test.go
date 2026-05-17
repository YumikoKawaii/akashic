package service

import (
	"strings"
	"testing"
)

func TestParseJSONIngestPassage(t *testing.T) {
	input := `{
		"type": "passage",
		"title": "Reading Passage 1",
		"body": "Passage body",
		"difficulty": "medium",
		"category_name": "IELTS Reading",
		"tags": ["test-1"],
		"questions": [
			{"type": "tf_ng", "content": "The passage mentions rockets.", "answer": "true"},
			{"type": "mcq", "difficulty": "hard", "content": "Choose one.", "options": [{"key":"A","text":"A1"},{"key":"B","text":"B1"}], "answers": ["B"]}
		]
	}`

	items, errs := parseJSONIngest(strings.NewReader(input))
	if len(errs) != 0 {
		t.Fatalf("parse errors: %#v", errs)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].passage == nil {
		t.Fatal("expected passage item")
	}
	p := items[0].passage
	if p.Type != "passage" || p.Title != "Reading Passage 1" {
		t.Fatalf("unexpected passage: %#v", p)
	}
	if len(p.Questions) != 2 {
		t.Fatalf("expected 2 questions, got %d", len(p.Questions))
	}
	if err := validatePassage(*p); err != nil {
		t.Fatalf("expected valid passage, got %v", err)
	}
}

func TestParseYAMLIngestSinglePassageWithGroup(t *testing.T) {
	input := `
type: passage
title: Reading Passage 1
body: Passage body
difficulty: medium
category_name: IELTS Reading
groups:
  - type: matching_headings
    context:
      headings:
        - key: i
          text: First heading
    questions:
      - content: A
        answer: i
`

	items, errs := parseYAMLIngest(strings.NewReader(input))
	if len(errs) != 0 {
		t.Fatalf("parse errors: %#v", errs)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].passage == nil {
		t.Fatal("expected passage item")
	}
	p := items[0].passage
	if len(p.Groups) != 1 {
		t.Fatalf("expected 1 group, got %d", len(p.Groups))
	}
	if err := validatePassage(*p); err != nil {
		t.Fatalf("expected valid passage, got %v", err)
	}
}

func TestValidatePassageRequiresQuestionsOrGroups(t *testing.T) {
	err := validatePassage(IngestPassageRow{
		Type:         "passage",
		Title:        "Reading Passage 1",
		Difficulty:   "medium",
		CategoryName: "IELTS Reading",
	})
	if err == nil {
		t.Fatal("expected validation error")
	}
	if !strings.Contains(err.Error(), "questions") || !strings.Contains(err.Error(), "groups") {
		t.Fatalf("unexpected error: %v", err)
	}
}
