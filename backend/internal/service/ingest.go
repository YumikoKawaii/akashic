package service

import (
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

// IngestRow is the common schema accepted by all file formats.
// category_name is resolved (or created) at import time.
type IngestRow struct {
	Text          string   `json:"text"           yaml:"text"`
	Type          string   `json:"type"           yaml:"type"`
	Difficulty    string   `json:"difficulty"     yaml:"difficulty"`
	CategoryName  string   `json:"category_name"  yaml:"category_name"`
	Options       []string `json:"options"        yaml:"options"`
	CorrectAnswer string   `json:"correct_answer" yaml:"correct_answer"`
	Tags          []string `json:"tags"           yaml:"tags"`
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
}

func NewIngestService(
	u *uow.UnitOfWork,
	bankRepo repository.BankRepository,
	categoryRepo repository.CategoryRepository,
	questionRepo repository.QuestionRepository,
) *IngestService {
	return &IngestService{
		uow:          u,
		bankRepo:     bankRepo,
		categoryRepo: categoryRepo,
		questionRepo: questionRepo,
	}
}

// Ingest parses a file and bulk-inserts questions into the given bank.
// ext must be ".json", ".csv", ".yaml", or ".yml".
func (s *IngestService) Ingest(bankID string, r io.Reader, ext string) (*IngestResult, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}

	rows, parseErrors := parse(r, ext)
	if len(parseErrors) > 0 {
		return &IngestResult{Failed: len(parseErrors), Errors: parseErrors}, nil
	}

	// Validate all rows before touching the DB
	var validationErrors []IngestError
	for i, row := range rows {
		if err := validateRow(row); err != nil {
			validationErrors = append(validationErrors, IngestError{
				Row:     i + 1,
				Text:    row.Text,
				Message: err.Error(),
			})
		}
	}
	if len(validationErrors) > 0 {
		return &IngestResult{Failed: len(validationErrors), Errors: validationErrors}, nil
	}

	// Resolve / create categories and build question models
	tx := s.uow.Begin()
	defer tx.Rollback()

	categoryCache := map[string]string{} // name → id

	var questions []*model.Question
	for _, row := range rows {
		catID, err := s.resolveCategory(tx, bankID, row.CategoryName, categoryCache)
		if err != nil {
			return nil, fmt.Errorf("category %q: %w", row.CategoryName, err)
		}
		questions = append(questions, &model.Question{
			BankID:        bankID,
			CategoryID:    catID,
			Text:          row.Text,
			Type:          row.Type,
			Difficulty:    row.Difficulty,
			Options:       row.Options,
			CorrectAnswer: row.CorrectAnswer,
			Tags:          row.Tags,
		})
	}

	if err := tx.Questions.BulkCreate(questions); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &IngestResult{Created: len(questions)}, nil
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
	// Create it
	cat := &model.Category{BankID: bankID, Name: name}
	if err := tx.Categories.Create(cat); err != nil {
		return "", err
	}
	cache[name] = cat.ID
	return cat.ID, nil
}

// ── Parsers ────────────────────────────────────────────────────

func parse(r io.Reader, ext string) ([]IngestRow, []IngestError) {
	switch strings.ToLower(ext) {
	case ".json":
		return parseJSON(r)
	case ".yaml", ".yml":
		return parseYAML(r)
	case ".csv":
		return parseCSV(r)
	default:
		return nil, []IngestError{{Row: 0, Message: "unsupported file format: " + ext}}
	}
}

func parseJSON(r io.Reader) ([]IngestRow, []IngestError) {
	var rows []IngestRow
	if err := json.NewDecoder(r).Decode(&rows); err != nil {
		return nil, []IngestError{{Row: 0, Message: "invalid JSON: " + err.Error()}}
	}
	return rows, nil
}

func parseYAML(r io.Reader) ([]IngestRow, []IngestError) {
	var rows []IngestRow
	if err := yaml.NewDecoder(r).Decode(&rows); err != nil {
		return nil, []IngestError{{Row: 0, Message: "invalid YAML: " + err.Error()}}
	}
	return rows, nil
}

func parseCSV(r io.Reader) ([]IngestRow, []IngestError) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true

	headers, err := reader.Read()
	if err != nil {
		return nil, []IngestError{{Row: 0, Message: "cannot read CSV headers: " + err.Error()}}
	}
	idx := headerIndex(headers)

	var rows []IngestRow
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
		rows = append(rows, row)
	}
	return rows, errs
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

// ── Validation ─────────────────────────────────────────────────

var validTypes       = map[string]bool{"mcq": true, "true_false": true, "open": true}
var validDifficulties = map[string]bool{"easy": true, "medium": true, "hard": true}

func validateRow(row IngestRow) error {
	if strings.TrimSpace(row.Text) == "" {
		return fmt.Errorf("text is required")
	}
	if !validTypes[row.Type] {
		return fmt.Errorf("invalid type %q: must be mcq, true_false, or open", row.Type)
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
	return nil
}
