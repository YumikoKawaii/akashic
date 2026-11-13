package service

import (
	"strings"
	"testing"

	"github.com/yumikokawaii/akashic/internal/model"
)

const groupJSON = `[
  {"type": "tf_ng", "difficulty": "easy", "content": "Mount Fuji is the tallest mountain.", "answer": "False"},
  {
    "title": "Urban forests",
    "instructions": "Match each paragraph with a heading.",
    "passage": "A. Trees cool cities.\n\nB. Parks cut noise.",
    "options": [{"key": "i", "text": "Cooling"}, {"key": "ii", "text": "Quiet"}],
    "difficulty": "medium",
    "tags": ["environment"],
    "questions": [
      {"type": "matching_headings", "content": "Paragraph A", "answer": "i"},
      {"type": "matching_headings", "content": "Paragraph B", "answer": "ii", "difficulty": "hard", "tags": ["urban"]}
    ]
  }
]`

func TestParseJSONIngestReadsGroupsAndStandalone(t *testing.T) {
	items, errs := parseJSONIngest(strings.NewReader(groupJSON))
	if len(errs) > 0 {
		t.Fatalf("unexpected errors: %+v", errs)
	}
	if len(items) != 2 {
		t.Fatalf("got %d items, want 2", len(items))
	}
	if items[0].standalone == nil || items[0].group != nil {
		t.Fatalf("item 1 should be standalone")
	}
	g := items[1].group
	if g == nil {
		t.Fatalf("item 2 should be a group")
	}
	if g.Title != "Urban forests" || len(g.Options) != 2 || len(g.Questions) != 2 {
		t.Fatalf("group parsed wrong: %+v", g)
	}
	if err := validateGroup(g); err != nil {
		t.Fatalf("valid group rejected: %v", err)
	}
}

func TestParseYAMLIngestReadsGroups(t *testing.T) {
	src := `
- title: Features
  difficulty: easy
  options:
    - {key: A, text: Smith}
    - {key: B, text: Jones}
  questions:
    - {type: matching_features, content: Argued for taxes, answer: B}
`
	items, errs := parseYAMLIngest(strings.NewReader(src))
	if len(errs) > 0 || len(items) != 1 || items[0].group == nil {
		t.Fatalf("got items=%+v errs=%+v", items, errs)
	}
	if err := validateGroup(items[0].group); err != nil {
		t.Fatalf("valid group rejected: %v", err)
	}
}

func TestValidateGroupRejects(t *testing.T) {
	base := func() *IngestGroup {
		return &IngestGroup{
			Difficulty: "medium",
			Options:    []model.MCQOption{{Key: "A", Text: "One"}},
			Questions:  []IngestStandaloneRow{{Type: "matching_features", Content: "Q", Answer: "A"}},
		}
	}
	cases := map[string]func(g *IngestGroup){
		"missing difficulty": func(g *IngestGroup) { g.Difficulty = "" },
		"bad difficulty":     func(g *IngestGroup) { g.Difficulty = "extreme" },
		"no questions":       func(g *IngestGroup) { g.Questions = nil },
		"no options":         func(g *IngestGroup) { g.Options = nil },
		"unknown key":        func(g *IngestGroup) { g.Questions[0].Answer = "Z" },
		"blank option":       func(g *IngestGroup) { g.Options[0].Text = "" },
		"invalid child":      func(g *IngestGroup) { g.Questions[0].Content = "" },
	}
	for name, mutate := range cases {
		g := base()
		mutate(g)
		if err := validateGroup(g); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
	if err := validateGroup(base()); err != nil {
		t.Fatalf("base group rejected: %v", err)
	}
}

func TestMergeTagsDedupes(t *testing.T) {
	got := mergeTags([]string{"a", " b"}, []string{"b", "c", ""})
	if strings.Join(got, ",") != "a,b,c" {
		t.Fatalf("got %v", got)
	}
}
