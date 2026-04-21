package service

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"gopkg.in/yaml.v3"

	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/uow"
)

// IngestRow represents a standalone question in the import file.
type IngestRow struct {
	Text          string   `json:"text"           yaml:"text"`
	Type          string   `json:"type"           yaml:"type"`
	Difficulty    string   `json:"difficulty"     yaml:"difficulty"`
	CategoryName  string   `json:"category_name"  yaml:"category_name"`
	Options       []string `json:"options"        yaml:"options"`
	CorrectAnswer string   `json:"correct_answer" yaml:"correct_answer"`
	Tags          []string `json:"tags"           yaml:"tags"`
}

// IngestSubQuestion is a question nested inside a passage entry.
// It inherits difficulty and category from the parent passage.
type IngestSubQuestion struct {
	Text          string   `json:"text"           yaml:"text"`
	Type          string   `json:"type"           yaml:"type"`
	Options       []string `json:"options"        yaml:"options"`
	CorrectAnswer string   `json:"correct_answer" yaml:"correct_answer"`
	Tags          []string `json:"tags"           yaml:"tags"`
}

// IngestPassageRow represents a passage with its sub-questions in the import file.
type IngestPassageRow struct {
	Type         string              `json:"type"          yaml:"type"`
	Title        string              `json:"title"         yaml:"title"`
	Body         string              `json:"body"          yaml:"body"`
	Difficulty   string              `json:"difficulty"    yaml:"difficulty"`
	CategoryName string              `json:"category_name" yaml:"category_name"`
	Questions    []IngestSubQuestion `json:"questions"     yaml:"questions"`
}

// IngestResult is returned to the caller after an import.
type IngestResult struct {
	Created int           `json:"created"`
	Failed  int           `json:"failed"`
	Errors  []IngestError `json:"errors,omitempty"`
}

// IngestError describes a single row that failed validation or insertion.
type IngestError struct {
	Row     int    `json:"row"`
	Text    string `json:"text,omitempty"`
	Message string `json:"message"`
}

type IngestService struct {
	uow          *uow.UnitOfWork
	bankRepo     repository.BankRepository
	categoryRepo repository.CategoryRepository
	questionRepo repository.QuestionRepository
	passageRepo  repository.PassageRepository
}

func NewIngestService(
	u *uow.UnitOfWork,
	bankRepo repository.BankRepository,
	categoryRepo repository.CategoryRepository,
	questionRepo repository.QuestionRepository,
	passageRepo repository.PassageRepository,
) *IngestService {
	return &IngestService{
		uow:          u,
		bankRepo:     bankRepo,
		categoryRepo: categoryRepo,
		questionRepo: questionRepo,
		passageRepo:  passageRepo,
	}
}

// parsed holds the two kinds of items we support.
type parsed struct {
	question *IngestRow
	passage  *IngestPassageRow
	rowNum   int
}

// Ingest parses a file and bulk-inserts questions (and passages) into the given bank.
func (s *IngestService) Ingest(bankID string, r io.Reader, ext string) (*IngestResult, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}

	items, parseErrors := parseItems(r, ext)
	if len(parseErrors) > 0 {
		return &IngestResult{Failed: len(parseErrors), Errors: parseErrors}, nil
	}

	// Validate all items up-front
	var validationErrors []IngestError
	for _, item := range items {
		var err error
		if item.question != nil {
			err = validateRow(*item.question)
		} else {
			if item.passage.Difficulty == "" {
				item.passage.Difficulty = "medium"
			}
			err = validatePassage(*item.passage)
		}
		if err != nil {
			text := ""
			if item.question != nil {
				text = item.question.Text
			} else {
				text = item.passage.Title
			}
			validationErrors = append(validationErrors, IngestError{Row: item.rowNum, Text: text, Message: err.Error()})
		}
	}
	if len(validationErrors) > 0 {
		return &IngestResult{Failed: len(validationErrors), Errors: validationErrors}, nil
	}

	tx := s.uow.Begin()
	defer tx.Rollback()

	categoryCache := map[string]string{}
	created := 0

	for _, item := range items {
		if item.question != nil {
			catID, err := s.resolveCategory(tx, bankID, item.question.CategoryName, categoryCache)
			if err != nil {
				return nil, fmt.Errorf("row %d: category %q: %w", item.rowNum, item.question.CategoryName, err)
			}
			q := &model.Question{
				BankID:        bankID,
				CategoryID:    catID,
				Text:          item.question.Text,
				Type:          item.question.Type,
				Difficulty:    item.question.Difficulty,
				Options:       item.question.Options,
				CorrectAnswer: item.question.CorrectAnswer,
				Tags:          item.question.Tags,
			}
			if err := tx.Questions.Create(q); err != nil {
				return nil, fmt.Errorf("row %d: %w", item.rowNum, err)
			}
			created++
		} else {
			p := item.passage
			catID, err := s.resolveCategory(tx, bankID, p.CategoryName, categoryCache)
			if err != nil {
				return nil, fmt.Errorf("row %d: category %q: %w", item.rowNum, p.CategoryName, err)
			}
			passage := &model.Passage{
				BankID:     bankID,
				CategoryID: catID,
				Title:      p.Title,
				Body:       p.Body,
				Difficulty: p.Difficulty,
			}
			if err := tx.Passages.Create(passage); err != nil {
				return nil, fmt.Errorf("row %d: create passage: %w", item.rowNum, err)
			}
			for _, sq := range p.Questions {
				q := &model.Question{
					BankID:        bankID,
					CategoryID:    catID,
					PassageID:     &passage.ID,
					Text:          sq.Text,
					Type:          sq.Type,
					Difficulty:    p.Difficulty,
					Options:       sq.Options,
					CorrectAnswer: sq.CorrectAnswer,
					Tags:          sq.Tags,
				}
				if err := tx.Questions.Create(q); err != nil {
					return nil, fmt.Errorf("row %d sub-question: %w", item.rowNum, err)
				}
			}
			created++ // count the passage as one created unit
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &IngestResult{Created: created}, nil
}

// resolveCategory returns an existing category ID or creates it.
func (s *IngestService) resolveCategory(
	tx *uow.Transaction,
	bankID, name string,
	cache map[string]string,
) (string, error) {
	if id, ok := cache[name]; ok {
		return id, nil
	}
	categories, err := s.categoryRepo.FindByBank(bankID)
	if err != nil {
		return "", err
	}
	for _, c := range categories {
		if strings.EqualFold(c.Name, name) {
			cache[name] = c.ID
			return c.ID, nil
		}
	}
	cat := &model.Category{BankID: bankID, Name: name}
	if err := tx.Categories.Create(cat); err != nil {
		return "", err
	}
	cache[name] = cat.ID
	return cat.ID, nil
}

// ── Parsers ────────────────────────────────────────────────────────────────

func parseItems(r io.Reader, ext string) ([]parsed, []IngestError) {
	switch strings.ToLower(ext) {
	case ".json":
		return parseJSONItems(r)
	case ".yaml", ".yml":
		return parseYAMLItems(r)
	case ".csv":
		return parseCSVItems(r)
	default:
		return nil, []IngestError{{Row: 0, Message: "unsupported file format: " + ext}}
	}
}

func parseJSONItems(r io.Reader) ([]parsed, []IngestError) {
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, []IngestError{{Row: 0, Message: "cannot read file: " + err.Error()}}
	}
	// Accept a single root object as a one-element array.
	if trimmed := bytes.TrimSpace(data); len(trimmed) > 0 && trimmed[0] == '{' {
		data = append([]byte{'['}, append(data, ']')...)
	}

	var raw []json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, []IngestError{{Row: 0, Message: "invalid JSON: " + err.Error()}}
	}

	var items []parsed
	for i, msg := range raw {
		rowNum := i + 1
		var probe struct {
			Type      string            `json:"type"`
			Body      string            `json:"body"`
			Questions []json.RawMessage `json:"questions"`
		}
		if err := json.Unmarshal(msg, &probe); err != nil {
			return nil, []IngestError{{Row: rowNum, Message: "cannot read type field: " + err.Error()}}
		}
		isPassage := probe.Type == "passage" || (probe.Body != "" && len(probe.Questions) > 0)
		if isPassage {
			var p IngestPassageRow
			if err := json.Unmarshal(msg, &p); err != nil {
				return nil, []IngestError{{Row: rowNum, Message: "invalid passage: " + err.Error()}}
			}
			items = append(items, parsed{passage: &p, rowNum: rowNum})
		} else {
			var q IngestRow
			if err := json.Unmarshal(msg, &q); err != nil {
				return nil, []IngestError{{Row: rowNum, Message: "invalid question: " + err.Error()}}
			}
			items = append(items, parsed{question: &q, rowNum: rowNum})
		}
	}
	return items, nil
}

func parseYAMLItems(r io.Reader) ([]parsed, []IngestError) {
	// Decode into a slice of raw maps to allow type-based routing.
	var rawItems []map[string]interface{}
	if err := yaml.NewDecoder(r).Decode(&rawItems); err != nil {
		return nil, []IngestError{{Row: 0, Message: "invalid YAML: " + err.Error()}}
	}

	var items []parsed
	for i, raw := range rawItems {
		rowNum := i + 1
		// Re-encode to YAML bytes then decode into the target struct.
		b, err := yaml.Marshal(raw)
		if err != nil {
			return nil, []IngestError{{Row: rowNum, Message: "cannot re-encode: " + err.Error()}}
		}
		typeVal, _ := raw["type"].(string)
		if typeVal == "passage" {
			var p IngestPassageRow
			if err := yaml.Unmarshal(b, &p); err != nil {
				return nil, []IngestError{{Row: rowNum, Message: "invalid passage: " + err.Error()}}
			}
			items = append(items, parsed{passage: &p, rowNum: rowNum})
		} else {
			var q IngestRow
			if err := yaml.Unmarshal(b, &q); err != nil {
				return nil, []IngestError{{Row: rowNum, Message: "invalid question: " + err.Error()}}
			}
			items = append(items, parsed{question: &q, rowNum: rowNum})
		}
	}
	return items, nil
}

func parseCSVItems(r io.Reader) ([]parsed, []IngestError) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true

	headers, err := reader.Read()
	if err != nil {
		return nil, []IngestError{{Row: 0, Message: "cannot read CSV headers: " + err.Error()}}
	}
	idx := headerIndex(headers)

	var items []parsed
	var errs []IngestError
	rowNum := 1

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		rowNum++
		if err != nil {
			errs = append(errs, IngestError{Row: rowNum, Message: err.Error()})
			continue
		}
		row, err := csvRecordToRow(record, idx)
		if err != nil {
			errs = append(errs, IngestError{Row: rowNum, Message: err.Error()})
			continue
		}
		items = append(items, parsed{question: &row, rowNum: rowNum})
	}
	return items, errs
}

func headerIndex(headers []string) map[string]int {
	m := map[string]int{}
	for i, h := range headers {
		m[strings.TrimSpace(strings.ToLower(h))] = i
	}
	return m
}

func csvRecordToRow(record []string, idx map[string]int) (IngestRow, error) {
	get := func(col string) string {
		i, ok := idx[col]
		if !ok || i >= len(record) {
			return ""
		}
		return strings.TrimSpace(record[i])
	}
	splitPipe := func(s string) []string {
		if s == "" {
			return nil
		}
		parts := strings.Split(s, "|")
		for i := range parts {
			parts[i] = strings.TrimSpace(parts[i])
		}
		return parts
	}
	return IngestRow{
		Text:          get("text"),
		Type:          get("type"),
		Difficulty:    get("difficulty"),
		CategoryName:  get("category_name"),
		Options:       splitPipe(get("options")),
		CorrectAnswer: get("correct_answer"),
		Tags:          splitPipe(get("tags")),
	}, nil
}

// ── Validation ─────────────────────────────────────────────────────────────

var validTypes        = map[string]bool{"mcq": true, "true_false": true, "open": true, "tf_ng": true, "sentence_completion": true}
var validDifficulties = map[string]bool{"easy": true, "medium": true, "hard": true}

func validateRow(row IngestRow) error {
	if strings.TrimSpace(row.Text) == "" {
		return fmt.Errorf("text is required")
	}
	if !validTypes[row.Type] {
		return fmt.Errorf("invalid type %q: must be mcq, true_false, open, tf_ng, or sentence_completion", row.Type)
	}
	if !validDifficulties[row.Difficulty] {
		return fmt.Errorf("invalid difficulty %q: must be easy, medium, or hard", row.Difficulty)
	}
	if strings.TrimSpace(row.CategoryName) == "" {
		return fmt.Errorf("category_name is required")
	}
	if row.Type == "mcq" && len(row.Options) < 2 {
		return fmt.Errorf("mcq questions require at least 2 options")
	}
	if row.Type == "sentence_completion" {
		if !strings.Contains(row.Text, "___") {
			return fmt.Errorf("sentence_completion question text must contain ___ to mark the blank")
		}
		if strings.TrimSpace(row.CorrectAnswer) == "" {
			return fmt.Errorf("sentence_completion question requires a correct_answer")
		}
	}
	return nil
}

func validatePassage(p IngestPassageRow) error {
	if strings.TrimSpace(p.Title) == "" {
		return fmt.Errorf("title is required")
	}
	if !validDifficulties[p.Difficulty] {
		return fmt.Errorf("invalid difficulty %q: must be easy, medium, or hard", p.Difficulty)
	}
	if strings.TrimSpace(p.CategoryName) == "" {
		return fmt.Errorf("category_name is required")
	}
	if len(p.Questions) == 0 {
		return fmt.Errorf("passage must have at least one question")
	}
	for i, sq := range p.Questions {
		if strings.TrimSpace(sq.Text) == "" {
			return fmt.Errorf("question %d: text is required", i+1)
		}
		if !validTypes[sq.Type] {
			return fmt.Errorf("question %d: invalid type %q", i+1, sq.Type)
		}
		if sq.Type == "mcq" && len(sq.Options) < 2 {
			return fmt.Errorf("question %d: mcq requires at least 2 options", i+1)
		}
	}
	return nil
}
