package service

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"gopkg.in/yaml.v3"

	"github.com/lib/pq"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/repository"
	"github.com/yumikokawaii/akashic/internal/uow"
)

// IngestStandaloneRow is a single standalone question in the import file.
type IngestStandaloneRow struct {
	Type         string            `json:"type"          yaml:"type"`
	Difficulty   string            `json:"difficulty"    yaml:"difficulty"`
	CategoryName string            `json:"category_name" yaml:"category_name"`
	Content      string            `json:"content"       yaml:"content"`
	Answer       string            `json:"answer"        yaml:"answer"`
	Options      []model.MCQOption `json:"options"       yaml:"options"`
	Answers      []string          `json:"answers"       yaml:"answers"`
	Tags         []string          `json:"tags"          yaml:"tags"`
	// alias detection — populated when the sender uses wrong field names
	Text          string `json:"text"           yaml:"text"`
	CorrectAnswer string `json:"correct_answer" yaml:"correct_answer"`
}

// IngestPassageQuestion is a question embedded within a passage row.
type IngestPassageQuestion struct {
	Type       string            `json:"type"       yaml:"type"`
	Difficulty string            `json:"difficulty" yaml:"difficulty"`
	Content    string            `json:"content"    yaml:"content"`
	Answer     string            `json:"answer"     yaml:"answer"`
	Options    []model.MCQOption `json:"options"    yaml:"options"`
	Answers    []string          `json:"answers"    yaml:"answers"`
	Tags       []string          `json:"tags"       yaml:"tags"`
	// alias detection
	Text          string `json:"text"           yaml:"text"`
	CorrectAnswer string `json:"correct_answer" yaml:"correct_answer"`
}

// IngestPassageGroup is a question group embedded within a passage row.
type IngestPassageGroup struct {
	Type       string                `json:"type"       yaml:"type"`
	Difficulty string                `json:"difficulty" yaml:"difficulty"`
	Context    model.GroupContext    `json:"context"    yaml:"context"`
	Questions  []IngestGroupQuestion `json:"questions"  yaml:"questions"`
}

// IngestPassageRow is a passage with its questions embedded.
// Detected by "type": "passage" in JSON/YAML.
type IngestPassageRow struct {
	Type         string                     `json:"type"          yaml:"type"`
	Title        string                     `json:"title"         yaml:"title"`
	Body         string                     `json:"body"          yaml:"body"`
	Paragraphs   []model.PassageParagraph   `json:"paragraphs"    yaml:"paragraphs"`
	Difficulty   string                     `json:"difficulty"    yaml:"difficulty"`
	CategoryName string                     `json:"category_name" yaml:"category_name"`
	Tags         []string                   `json:"tags"          yaml:"tags"`
	Questions    []IngestPassageQuestion    `json:"questions"     yaml:"questions"`
	Groups       []IngestPassageGroup       `json:"groups"        yaml:"groups"`
}

// IngestGroupQuestion is a question within a group.
type IngestGroupQuestion struct {
	Content string            `json:"content" yaml:"content"`
	Answer  string            `json:"answer"  yaml:"answer"`
	Options []model.MCQOption `json:"options" yaml:"options"`
	Answers []string          `json:"answers" yaml:"answers"`
	Tags    []string          `json:"tags"    yaml:"tags"`
}

// IngestGroupRow is a question group with embedded questions.
// Detected by the presence of "kind": "group" in JSON/YAML.
type IngestGroupRow struct {
	Type         string                `json:"type"          yaml:"type"`
	Difficulty   string                `json:"difficulty"    yaml:"difficulty"`
	CategoryName string                `json:"category_name" yaml:"category_name"`
	Context      model.GroupContext    `json:"context"       yaml:"context"`
	Questions    []IngestGroupQuestion `json:"questions"     yaml:"questions"`
}

// IngestResult is returned after an import.
type IngestResult struct {
	Created int           `json:"created"`
	Failed  int           `json:"failed"`
	Errors  []IngestError `json:"errors,omitempty"`
}

// IngestError describes a single item that failed.
type IngestError struct {
	Row     int    `json:"row"`
	Label   string `json:"label,omitempty"`
	Message string `json:"message"`
}

type ingestItem struct {
	standalone *IngestStandaloneRow
	group      *IngestGroupRow
	passage    *IngestPassageRow
	rowNum     int
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
	return &IngestService{uow: u, bankRepo: bankRepo, categoryRepo: categoryRepo, questionRepo: questionRepo}
}

func (s *IngestService) Ingest(bankID int, r io.Reader, ext string) (*IngestResult, error) {
	if _, err := s.bankRepo.FindByID(bankID); err != nil {
		return nil, err
	}

	items, parseErrors := parseIngestItems(r, ext)
	if len(parseErrors) > 0 {
		return &IngestResult{Failed: len(parseErrors), Errors: parseErrors}, nil
	}

	var validationErrors []IngestError
	for _, item := range items {
		var (
			err   error
			label string
		)
		switch {
		case item.standalone != nil:
			err = validateStandalone(*item.standalone)
			label = item.standalone.Content
		case item.group != nil:
			err = validateGroup(*item.group)
			label = item.group.Type
		case item.passage != nil:
			err = validatePassage(*item.passage)
			label = item.passage.Title
		}
		if err != nil {
			validationErrors = append(validationErrors, IngestError{Row: item.rowNum, Label: label, Message: err.Error()})
		}
	}
	if len(validationErrors) > 0 {
		return &IngestResult{Failed: len(validationErrors), Errors: validationErrors}, nil
	}

	tx := s.uow.Begin()
	defer tx.Rollback()

	catCache := map[string]int{}
	created := 0

	for _, item := range items {
		if item.standalone != nil {
			row := item.standalone
			catID, err := s.resolveCategory(tx, bankID, row.CategoryName, catCache)
			if err != nil {
				return nil, fmt.Errorf("row %d: category %q: %w", item.rowNum, row.CategoryName, err)
			}
			q := &model.Question{
				BankID:     bankID,
				CategoryID: catID,
				Type:       row.Type,
				Difficulty: row.Difficulty,
				Tags:       pq.StringArray(nonNilSlice(row.Tags)),
			}
			if err := tx.Questions.Create(q); err != nil {
				return nil, fmt.Errorf("row %d: %w", item.rowNum, err)
			}
			if row.Type == "mcq" {
				if err := tx.Questions.CreateChoice(&model.QMultipleChoice{
					QuestionID: q.ID,
					Content:    row.Content,
					Options:    row.Options,
					Answers:    pq.StringArray(nonNilSlice(row.Answers)),
				}); err != nil {
					return nil, fmt.Errorf("row %d: choice: %w", item.rowNum, err)
				}
			} else {
				if err := tx.Questions.CreateItem(&model.QQuestionItem{
					QuestionID: q.ID,
					Content:    row.Content,
					Answer:     row.Answer,
				}); err != nil {
					return nil, fmt.Errorf("row %d: item: %w", item.rowNum, err)
				}
			}
			created++
		} else if item.group != nil {
			row := item.group
			catID, err := s.resolveCategory(tx, bankID, row.CategoryName, catCache)
			if err != nil {
				return nil, fmt.Errorf("row %d: category %q: %w", item.rowNum, row.CategoryName, err)
			}
			g := &model.QuestionGroup{
				BankID:     bankID,
				CategoryID: catID,
				Type:       row.Type,
				Difficulty: row.Difficulty,
				Context:    row.Context,
			}
			if err := tx.QuestionGroups.Create(g); err != nil {
				return nil, fmt.Errorf("row %d: group: %w", item.rowNum, err)
			}
			isMCQ := row.Type == "mcq"
			for i, gq := range row.Questions {
				pos := int16(i + 1)
				q := &model.Question{
					BankID:     bankID,
					CategoryID: catID,
					GroupID:    &g.ID,
					Type:       row.Type,
					Difficulty: row.Difficulty,
					Tags:       pq.StringArray(nonNilSlice(gq.Tags)),
					Position:   &pos,
				}
				if err := tx.Questions.Create(q); err != nil {
					return nil, fmt.Errorf("row %d group q%d: %w", item.rowNum, i+1, err)
				}
				if isMCQ {
					if err := tx.Questions.CreateChoice(&model.QMultipleChoice{
						QuestionID: q.ID,
						Content:    gq.Content,
						Options:    gq.Options,
						Answers:    pq.StringArray(nonNilSlice(gq.Answers)),
					}); err != nil {
						return nil, fmt.Errorf("row %d group q%d choice: %w", item.rowNum, i+1, err)
					}
				} else {
					if err := tx.Questions.CreateItem(&model.QQuestionItem{
						QuestionID: q.ID,
						Content:    gq.Content,
						Answer:     gq.Answer,
					}); err != nil {
						return nil, fmt.Errorf("row %d group q%d item: %w", item.rowNum, i+1, err)
					}
				}
			}
			created++
		} else if item.passage != nil {
			row := item.passage
			catID, err := s.resolveCategory(tx, bankID, row.CategoryName, catCache)
			if err != nil {
				return nil, fmt.Errorf("row %d: category %q: %w", item.rowNum, row.CategoryName, err)
			}
			p := &model.Passage{
				BankID:     bankID,
				CategoryID: catID,
				Title:      row.Title,
				Body:       row.Body,
				Paragraphs: row.Paragraphs,
				Difficulty: row.Difficulty,
			}
			if err := tx.Passages.Create(p); err != nil {
				return nil, fmt.Errorf("row %d: passage: %w", item.rowNum, err)
			}

			for gi, ig := range row.Groups {
				groupDifficulty := row.Difficulty
				if ig.Difficulty != "" {
					groupDifficulty = ig.Difficulty
				}
				g := &model.QuestionGroup{
					BankID:     bankID,
					CategoryID: catID,
					PassageID:  &p.ID,
					Type:       ig.Type,
					Difficulty: groupDifficulty,
					Context:    ig.Context,
				}
				if err := tx.QuestionGroups.Create(g); err != nil {
					return nil, fmt.Errorf("row %d passage group %d: %w", item.rowNum, gi+1, err)
				}
				isMCQ := ig.Type == "mcq"
				for qi, gq := range ig.Questions {
					pos := int16(qi + 1)
					q := &model.Question{
						BankID:     bankID,
						CategoryID: catID,
						GroupID:    &g.ID,
						Type:       ig.Type,
						Difficulty: groupDifficulty,
						Tags:       pq.StringArray(mergeTags(row.Tags, gq.Tags)),
						Position:   &pos,
					}
					if err := tx.Questions.Create(q); err != nil {
						return nil, fmt.Errorf("row %d passage group %d q%d: %w", item.rowNum, gi+1, qi+1, err)
					}
					if isMCQ {
						if err := tx.Questions.CreateChoice(&model.QMultipleChoice{
							QuestionID: q.ID,
							Content:    gq.Content,
							Options:    gq.Options,
							Answers:    pq.StringArray(nonNilSlice(gq.Answers)),
						}); err != nil {
							return nil, fmt.Errorf("row %d passage group %d q%d choice: %w", item.rowNum, gi+1, qi+1, err)
						}
					} else {
						if err := tx.Questions.CreateItem(&model.QQuestionItem{
							QuestionID: q.ID,
							Content:    gq.Content,
							Answer:     gq.Answer,
						}); err != nil {
							return nil, fmt.Errorf("row %d passage group %d q%d item: %w", item.rowNum, gi+1, qi+1, err)
						}
					}
				}
			}

			// Flat passage questions are grouped by type + difficulty, preserving order within each bucket.
			type groupKey struct {
				typ        string
				difficulty string
			}
			groupIDByKey := map[groupKey]int{}
			positionByKey := map[groupKey]int16{}
			for qi, iq := range row.Questions {
				questionDifficulty := row.Difficulty
				if iq.Difficulty != "" {
					questionDifficulty = iq.Difficulty
				}
				key := groupKey{typ: iq.Type, difficulty: questionDifficulty}
				gID, exists := groupIDByKey[key]
				if !exists {
					g := &model.QuestionGroup{
						BankID:     bankID,
						CategoryID: catID,
						PassageID:  &p.ID,
						Type:       iq.Type,
						Difficulty: questionDifficulty,
					}
					if err := tx.QuestionGroups.Create(g); err != nil {
						return nil, fmt.Errorf("row %d passage q%d: group: %w", item.rowNum, qi+1, err)
					}
					gID = g.ID
					groupIDByKey[key] = gID
					positionByKey[key] = 1
				}
				pos := positionByKey[key]
				positionByKey[key]++
				q := &model.Question{
					BankID:     bankID,
					CategoryID: catID,
					GroupID:    &gID,
					Type:       iq.Type,
					Difficulty: questionDifficulty,
					Tags:       pq.StringArray(mergeTags(row.Tags, iq.Tags)),
					Position:   &pos,
				}
				if err := tx.Questions.Create(q); err != nil {
					return nil, fmt.Errorf("row %d passage q%d: %w", item.rowNum, qi+1, err)
				}
				if iq.Type == "mcq" {
					if err := tx.Questions.CreateChoice(&model.QMultipleChoice{
						QuestionID: q.ID,
						Content:    iq.Content,
						Options:    iq.Options,
						Answers:    pq.StringArray(nonNilSlice(iq.Answers)),
					}); err != nil {
						return nil, fmt.Errorf("row %d passage q%d: choice: %w", item.rowNum, qi+1, err)
					}
				} else {
					if err := tx.Questions.CreateItem(&model.QQuestionItem{
						QuestionID: q.ID,
						Content:    iq.Content,
						Answer:     iq.Answer,
					}); err != nil {
						return nil, fmt.Errorf("row %d passage q%d: item: %w", item.rowNum, qi+1, err)
					}
				}
			}
			created++
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &IngestResult{Created: created}, nil
}

func (s *IngestService) resolveCategory(tx *uow.Transaction, bankID int, name string, cache map[string]int) (int, error) {
	if id, ok := cache[name]; ok {
		return id, nil
	}
	cat, err := s.categoryRepo.FindByBankAndName(bankID, name)
	if err == nil {
		cache[name] = cat.ID
		return cat.ID, nil
	}
	if err != repository.ErrNotFound {
		return 0, err
	}
	newCat := &model.Category{BankID: bankID, Name: name}
	if err := tx.Categories.Create(newCat); err != nil {
		return 0, err
	}
	cache[name] = newCat.ID
	return newCat.ID, nil
}

func nonNilSlice(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

func mergeTags(parent, child []string) []string {
	if len(parent) == 0 && len(child) == 0 {
		return []string{}
	}
	seen := map[string]bool{}
	merged := make([]string, 0, len(parent)+len(child))
	for _, tag := range append(parent, child...) {
		tag = strings.TrimSpace(tag)
		if tag == "" || seen[tag] {
			continue
		}
		seen[tag] = true
		merged = append(merged, tag)
	}
	return merged
}

// ── Parsers ────────────────────────────────────────────────────────────────

func parseIngestItems(r io.Reader, ext string) ([]ingestItem, []IngestError) {
	switch strings.ToLower(ext) {
	case ".json":
		return parseJSONIngest(r)
	case ".yaml", ".yml":
		return parseYAMLIngest(r)
	case ".csv":
		return parseCSVIngest(r)
	default:
		return nil, []IngestError{{Row: 0, Message: "unsupported file format: " + ext}}
	}
}

func parseJSONIngest(r io.Reader) ([]ingestItem, []IngestError) {
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, []IngestError{{Row: 0, Message: "cannot read file: " + err.Error()}}
	}
	if trimmed := bytes.TrimSpace(data); len(trimmed) > 0 && trimmed[0] == '{' {
		data = append([]byte{'['}, append(data, ']')...)
	}
	var raw []json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, []IngestError{{Row: 0, Message: "invalid JSON: " + err.Error()}}
	}

	var items []ingestItem
	for i, msg := range raw {
		rowNum := i + 1
		var probe struct {
			Kind string `json:"kind"`
			Type string `json:"type"`
		}
		_ = json.Unmarshal(msg, &probe)
		if probe.Kind == "group" {
			var g IngestGroupRow
			if err := json.Unmarshal(msg, &g); err != nil {
				return nil, []IngestError{{Row: rowNum, Message: "invalid group: " + err.Error()}}
			}
			items = append(items, ingestItem{group: &g, rowNum: rowNum})
		} else if probe.Type == "passage" {
			var p IngestPassageRow
			if err := json.Unmarshal(msg, &p); err != nil {
				return nil, []IngestError{{Row: rowNum, Message: "invalid passage: " + err.Error()}}
			}
			items = append(items, ingestItem{passage: &p, rowNum: rowNum})
		} else {
			var q IngestStandaloneRow
			if err := json.Unmarshal(msg, &q); err != nil {
				return nil, []IngestError{{Row: rowNum, Message: "invalid question: " + err.Error()}}
			}
			items = append(items, ingestItem{standalone: &q, rowNum: rowNum})
		}
	}
	return items, nil
}

func parseYAMLIngest(r io.Reader) ([]ingestItem, []IngestError) {
	var decoded interface{}
	if err := yaml.NewDecoder(r).Decode(&decoded); err != nil {
		return nil, []IngestError{{Row: 0, Message: "invalid YAML: " + err.Error()}}
	}
	rawItems, ok := decoded.([]interface{})
	if !ok {
		rawItems = []interface{}{decoded}
	}

	var items []ingestItem
	for i, rawItem := range rawItems {
		rowNum := i + 1
		raw, ok := rawItem.(map[string]interface{})
		if !ok {
			return nil, []IngestError{{Row: rowNum, Message: "item must be an object"}}
		}
		b, err := yaml.Marshal(raw)
		if err != nil {
			return nil, []IngestError{{Row: rowNum, Message: "cannot re-encode: " + err.Error()}}
		}
		kind, _ := raw["kind"].(string)
		typ, _ := raw["type"].(string)
		if kind == "group" {
			var g IngestGroupRow
			if err := yaml.Unmarshal(b, &g); err != nil {
				return nil, []IngestError{{Row: rowNum, Message: "invalid group: " + err.Error()}}
			}
			items = append(items, ingestItem{group: &g, rowNum: rowNum})
		} else if typ == "passage" {
			var p IngestPassageRow
			if err := yaml.Unmarshal(b, &p); err != nil {
				return nil, []IngestError{{Row: rowNum, Message: "invalid passage: " + err.Error()}}
			}
			items = append(items, ingestItem{passage: &p, rowNum: rowNum})
		} else {
			var q IngestStandaloneRow
			if err := yaml.Unmarshal(b, &q); err != nil {
				return nil, []IngestError{{Row: rowNum, Message: "invalid question: " + err.Error()}}
			}
			items = append(items, ingestItem{standalone: &q, rowNum: rowNum})
		}
	}
	return items, nil
}

func parseCSVIngest(r io.Reader) ([]ingestItem, []IngestError) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true

	headers, err := reader.Read()
	if err != nil {
		return nil, []IngestError{{Row: 0, Message: "cannot read CSV headers: " + err.Error()}}
	}
	idx := csvHeaderIndex(headers)

	var items []ingestItem
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
		row := csvToStandalone(record, idx)
		items = append(items, ingestItem{standalone: &row, rowNum: rowNum})
	}
	return items, errs
}

func csvHeaderIndex(headers []string) map[string]int {
	m := map[string]int{}
	for i, h := range headers {
		m[strings.TrimSpace(strings.ToLower(h))] = i
	}
	return m
}

var csvOptionKeys = []string{"A", "B", "C", "D", "E", "F", "G", "H"}

func csvToStandalone(record []string, idx map[string]int) IngestStandaloneRow {
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

	row := IngestStandaloneRow{
		Type:         get("type"),
		Difficulty:   get("difficulty"),
		CategoryName: get("category_name"),
		Content:      get("content"),
		Answer:       get("answer"),
		Tags:         splitPipe(get("tags")),
	}

	// For MCQ: build MCQOption slice from pipe-separated texts; answers are keys (A, B, …)
	if optStr := get("options"); optStr != "" {
		texts := splitPipe(optStr)
		for i, text := range texts {
			if i >= len(csvOptionKeys) {
				break
			}
			row.Options = append(row.Options, model.MCQOption{Key: csvOptionKeys[i], Text: text})
		}
	}
	if ansStr := get("answers"); ansStr != "" {
		row.Answers = splitPipe(ansStr)
	}

	return row
}

// ── Validation ─────────────────────────────────────────────────────────────

var validQuestionTypes = map[string]bool{
	"tf_ng": true, "yn_ng": true, "mcq": true,
	"matching_headings": true, "matching_information": true, "matching_features": true,
	"sentence_completion": true, "form_completion": true, "short_answer": true,
}
var validDifficultyLevels = map[string]bool{"easy": true, "medium": true, "hard": true}

func validateStandalone(row IngestStandaloneRow) error {
	// type checks first — gives context for all other errors
	switch row.Type {
	case "":
		return fmt.Errorf("field 'type' is required")
	case "matching":
		return fmt.Errorf("type 'matching' is not valid — use 'matching_headings', 'matching_information', or 'matching_features'")
	case "multi_select":
		return fmt.Errorf("type 'multi_select' is not valid — use 'mcq' with 'answers' as an array of correct option keys, e.g. [\"B\", \"F\"]")
	default:
		if !validQuestionTypes[row.Type] {
			return fmt.Errorf("unknown type %q — valid types: mcq, tf_ng, yn_ng, matching_headings, matching_information, matching_features, sentence_completion, form_completion, short_answer", row.Type)
		}
	}

	if strings.TrimSpace(row.Content) == "" {
		if strings.TrimSpace(row.Text) != "" {
			return fmt.Errorf("field 'text' is not recognized — use 'content' for the question stem")
		}
		return fmt.Errorf("field 'content' is required")
	}

	if !validDifficultyLevels[row.Difficulty] {
		if row.Difficulty == "" {
			return fmt.Errorf("field 'difficulty' is required — valid values: easy, medium, hard")
		}
		return fmt.Errorf("invalid difficulty %q — valid values: easy, medium, hard", row.Difficulty)
	}

	if strings.TrimSpace(row.CategoryName) == "" {
		return fmt.Errorf("field 'category_name' is required")
	}

	if row.Type == "mcq" {
		if len(row.Options) < 2 {
			return fmt.Errorf("mcq requires at least 2 options as objects: [{\"key\":\"A\",\"text\":\"...\"}]")
		}
		if len(row.Answers) == 0 {
			if row.CorrectAnswer != "" {
				return fmt.Errorf("field 'correct_answer' is not recognized — use 'answers' as an array of correct option keys, e.g. [\"B\"]")
			}
			return fmt.Errorf("mcq requires field 'answers' — an array of correct option keys, e.g. [\"B\"]")
		}
	} else {
		if strings.TrimSpace(row.Answer) == "" {
			if row.CorrectAnswer != "" {
				return fmt.Errorf("field 'correct_answer' is not recognized — use 'answer' for the correct answer string")
			}
			return fmt.Errorf("field 'answer' is required for type %q", row.Type)
		}
	}
	return nil
}

func validatePassage(row IngestPassageRow) error {
	if row.Type != "" && row.Type != "passage" {
		return fmt.Errorf("passage: field 'type' must be \"passage\"")
	}
	if strings.TrimSpace(row.Title) == "" {
		return fmt.Errorf("passage: field 'title' is required")
	}
	if strings.TrimSpace(row.CategoryName) == "" {
		return fmt.Errorf("passage: field 'category_name' is required")
	}
	if !validDifficultyLevels[row.Difficulty] {
		if row.Difficulty == "" {
			return fmt.Errorf("passage: field 'difficulty' is required — valid values: easy, medium, hard")
		}
		return fmt.Errorf("passage: invalid difficulty %q — valid values: easy, medium, hard", row.Difficulty)
	}
	if len(row.Questions) == 0 && len(row.Groups) == 0 {
		return fmt.Errorf("passage: at least one of 'questions' or 'groups' must be provided")
	}
	for i, q := range row.Questions {
		n := i + 1
		if q.Difficulty != "" && !validDifficultyLevels[q.Difficulty] {
			return fmt.Errorf("passage question %d: invalid difficulty %q — valid values: easy, medium, hard", n, q.Difficulty)
		}
		if !validQuestionTypes[q.Type] {
			if q.Type == "" {
				return fmt.Errorf("passage question %d: field 'type' is required", n)
			}
			return fmt.Errorf("passage question %d: unknown type %q", n, q.Type)
		}
		if strings.TrimSpace(q.Content) == "" {
			if strings.TrimSpace(q.Text) != "" {
				return fmt.Errorf("passage question %d: field 'text' is not recognized — use 'content'", n)
			}
			return fmt.Errorf("passage question %d: field 'content' is required", n)
		}
		if q.Type == "mcq" {
			if len(q.Options) < 2 {
				return fmt.Errorf("passage question %d: mcq requires at least 2 options", n)
			}
			if len(q.Answers) == 0 {
				return fmt.Errorf("passage question %d: mcq requires field 'answers'", n)
			}
		} else if strings.TrimSpace(q.Answer) == "" {
			if q.CorrectAnswer != "" {
				return fmt.Errorf("passage question %d: field 'correct_answer' is not recognized — use 'answer'", n)
			}
			return fmt.Errorf("passage question %d: field 'answer' is required for type %q", n, q.Type)
		}
	}
	for i, g := range row.Groups {
		n := i + 1
		if !validQuestionTypes[g.Type] {
			if g.Type == "" {
				return fmt.Errorf("passage group %d: field 'type' is required", n)
			}
			return fmt.Errorf("passage group %d: unknown type %q", n, g.Type)
		}
		if g.Difficulty != "" && !validDifficultyLevels[g.Difficulty] {
			return fmt.Errorf("passage group %d: invalid difficulty %q — valid values: easy, medium, hard", n, g.Difficulty)
		}
		if len(g.Questions) == 0 {
			return fmt.Errorf("passage group %d: 'questions' array must not be empty", n)
		}
		isMCQ := g.Type == "mcq"
		for qi, q := range g.Questions {
			if strings.TrimSpace(q.Content) == "" {
				return fmt.Errorf("passage group %d question %d: content is required", n, qi+1)
			}
			if isMCQ {
				if len(q.Options) < 2 {
					return fmt.Errorf("passage group %d question %d: mcq requires at least 2 options", n, qi+1)
				}
				if len(q.Answers) == 0 {
					return fmt.Errorf("passage group %d question %d: mcq requires at least one answer", n, qi+1)
				}
			} else if strings.TrimSpace(q.Answer) == "" {
				return fmt.Errorf("passage group %d question %d: answer is required", n, qi+1)
			}
		}
	}
	return nil
}

func validateGroup(row IngestGroupRow) error {
	if !validQuestionTypes[row.Type] {
		return fmt.Errorf("invalid type %q", row.Type)
	}
	if !validDifficultyLevels[row.Difficulty] {
		return fmt.Errorf("invalid difficulty %q", row.Difficulty)
	}
	if strings.TrimSpace(row.CategoryName) == "" {
		return fmt.Errorf("category_name is required")
	}
	if len(row.Questions) == 0 {
		return fmt.Errorf("group must have at least one question")
	}
	isMCQ := row.Type == "mcq"
	for i, q := range row.Questions {
		if strings.TrimSpace(q.Content) == "" {
			return fmt.Errorf("question %d: content is required", i+1)
		}
		if isMCQ {
			if len(q.Options) < 2 {
				return fmt.Errorf("question %d: mcq requires at least 2 options", i+1)
			}
			if len(q.Answers) == 0 {
				return fmt.Errorf("question %d: mcq requires at least one answer", i+1)
			}
		} else if strings.TrimSpace(q.Answer) == "" {
			return fmt.Errorf("question %d: answer is required", i+1)
		}
	}
	return nil
}
