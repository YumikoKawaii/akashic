package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"gopkg.in/yaml.v3"

	"github.com/lib/pq"
	"github.com/yumikokawaii/akashic/internal/model"
	"github.com/yumikokawaii/akashic/internal/uow"
)

// IngestStandaloneRow is a single standalone question in the import file.
type IngestStandaloneRow struct {
	Type       string            `json:"type"          yaml:"type"`
	Difficulty string            `json:"difficulty"    yaml:"difficulty"`
	Content    string            `json:"content"       yaml:"content"`
	Answer     string            `json:"answer"        yaml:"answer"`
	Options    []model.MCQOption `json:"options"       yaml:"options"`
	Answers    []string          `json:"answers"       yaml:"answers"`
	Tags       []string          `json:"tags"          yaml:"tags"`
	// alias detection — populated when the sender uses wrong field names
	Text          string `json:"text"           yaml:"text"`
	CorrectAnswer string `json:"correct_answer" yaml:"correct_answer"`
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

// IngestGroup is a set of questions sharing a passage, instructions and options.
// A child question without a difficulty inherits the group's.
type IngestGroup struct {
	Title        string                `json:"title"        yaml:"title"`
	Instructions string                `json:"instructions" yaml:"instructions"`
	Passage      string                `json:"passage"      yaml:"passage"`
	Options      []model.MCQOption     `json:"options"      yaml:"options"`
	Difficulty   string                `json:"difficulty"   yaml:"difficulty"`
	Tags         []string              `json:"tags"         yaml:"tags"`
	Questions    []IngestStandaloneRow `json:"questions"    yaml:"questions"`
}

type ingestItem struct {
	standalone *IngestStandaloneRow
	group      *IngestGroup
	rowNum     int
}

type IngestService struct {
	uow  uow.UnitOfWork
	pool GenerateCache
}

func NewIngestService(u uow.UnitOfWork, pool GenerateCache) *IngestService {
	return &IngestService{uow: u, pool: pool}
}

func (s *IngestService) Ingest(ctx context.Context, bankID int, r io.Reader, ext string) (*IngestResult, error) {
	if _, err := s.uow.Store().Banks.FindByID(bankID); err != nil {
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
			err = validateGroup(item.group)
			label = item.group.Title
		}
		if err != nil {
			validationErrors = append(validationErrors, IngestError{Row: item.rowNum, Label: label, Message: err.Error()})
		}
	}
	if len(validationErrors) > 0 {
		return &IngestResult{Failed: len(validationErrors), Errors: validationErrors}, nil
	}

	created := 0

	if err := s.uow.Do(ctx, func(tx *uow.Store) error {
		for _, item := range items {
			if item.standalone != nil {
				row := item.standalone
				q := &model.Question{
					BankID:     bankID,
					Type:       row.Type,
					Difficulty: row.Difficulty,
					Tags:       pq.StringArray(nonNilSlice(row.Tags)),
					Content:    model.NewQuestionContent(row.Type, row.Content, row.Answer, row.Options, row.Answers),
				}
				if err := tx.Questions.Create(q); err != nil {
					return fmt.Errorf("row %d: %w", item.rowNum, err)
				}
				created++
			}
			if item.group != nil {
				n, err := createGroup(tx, bankID, item.group)
				if err != nil {
					return fmt.Errorf("row %d: %w", item.rowNum, err)
				}
				created += n
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}
	s.pool.InvalidatePool(bankID)
	return &IngestResult{Created: created}, nil
}

func createGroup(tx *uow.Store, bankID int, g *IngestGroup) (int, error) {
	group := &model.QuestionGroup{
		BankID: bankID,
		Title:  strings.TrimSpace(g.Title),
		Content: model.GroupContent{
			Instructions: strings.TrimSpace(g.Instructions),
			Passage:      strings.TrimSpace(g.Passage),
			Options:      g.Options,
		},
		Difficulty: g.Difficulty,
		Tags:       pq.StringArray(nonNilSlice(g.Tags)),
	}
	if err := tx.Groups.Create(group); err != nil {
		return 0, err
	}
	for i, row := range g.Questions {
		groupID, position := group.ID, i+1
		difficulty := row.Difficulty
		if difficulty == "" {
			difficulty = g.Difficulty
		}
		q := &model.Question{
			BankID:     bankID,
			Type:       row.Type,
			Difficulty: difficulty,
			Tags:       pq.StringArray(mergeTags(g.Tags, row.Tags)),
			Content:    model.NewQuestionContent(row.Type, row.Content, row.Answer, row.Options, row.Answers),
			GroupID:    &groupID,
			Position:   &position,
		}
		if err := tx.Questions.Create(q); err != nil {
			return 0, fmt.Errorf("question %d: %w", position, err)
		}
	}
	return len(g.Questions), nil
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
			Questions json.RawMessage `json:"questions"`
		}
		if err := json.Unmarshal(msg, &probe); err != nil {
			return nil, []IngestError{{Row: rowNum, Message: "item must be an object: " + err.Error()}}
		}
		if len(probe.Questions) > 0 {
			var g IngestGroup
			if err := json.Unmarshal(msg, &g); err != nil {
				return nil, []IngestError{{Row: rowNum, Message: "invalid group: " + err.Error()}}
			}
			items = append(items, ingestItem{group: &g, rowNum: rowNum})
			continue
		}
		var q IngestStandaloneRow
		if err := json.Unmarshal(msg, &q); err != nil {
			return nil, []IngestError{{Row: rowNum, Message: "invalid question: " + err.Error()}}
		}
		items = append(items, ingestItem{standalone: &q, rowNum: rowNum})
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
		if _, isGroup := raw["questions"]; isGroup {
			var g IngestGroup
			if err := yaml.Unmarshal(b, &g); err != nil {
				return nil, []IngestError{{Row: rowNum, Message: "invalid group: " + err.Error()}}
			}
			items = append(items, ingestItem{group: &g, rowNum: rowNum})
			continue
		}
		var q IngestStandaloneRow
		if err := yaml.Unmarshal(b, &q); err != nil {
			return nil, []IngestError{{Row: rowNum, Message: "invalid question: " + err.Error()}}
		}
		items = append(items, ingestItem{standalone: &q, rowNum: rowNum})
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
		Type:       get("type"),
		Difficulty: get("difficulty"),
		Content:    get("content"),
		Answer:     get("answer"),
		Tags:       splitPipe(get("tags")),
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

var matchingTypes = map[string]bool{
	"matching_headings": true, "matching_information": true, "matching_features": true,
}

func validateGroup(g *IngestGroup) error {
	if !validDifficultyLevels[g.Difficulty] {
		if g.Difficulty == "" {
			return fmt.Errorf("group field 'difficulty' is required — valid values: easy, medium, hard")
		}
		return fmt.Errorf("invalid group difficulty %q — valid values: easy, medium, hard", g.Difficulty)
	}
	if len(g.Questions) == 0 {
		return fmt.Errorf("group field 'questions' must contain at least one question")
	}
	keys := make(map[string]bool, len(g.Options))
	for _, o := range g.Options {
		if strings.TrimSpace(o.Key) == "" || strings.TrimSpace(o.Text) == "" {
			return fmt.Errorf("group options need both 'key' and 'text'")
		}
		keys[strings.ToLower(strings.TrimSpace(o.Key))] = true
	}
	for i, row := range g.Questions {
		if row.Difficulty == "" {
			row.Difficulty = g.Difficulty
		}
		if err := validateStandalone(row); err != nil {
			return fmt.Errorf("question %d: %w", i+1, err)
		}
		if !matchingTypes[row.Type] {
			continue
		}
		if len(keys) == 0 {
			return fmt.Errorf("question %d: type %q needs the group's 'options' to choose from", i+1, row.Type)
		}
		if !keys[strings.ToLower(strings.TrimSpace(row.Answer))] {
			return fmt.Errorf("question %d: answer %q is not one of the group's option keys", i+1, row.Answer)
		}
	}
	return nil
}
