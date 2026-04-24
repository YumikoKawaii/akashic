# Question Format

Questions can be imported as standalone items or grouped under a passage. Both forms use the same file (JSON / YAML / CSV).

---

## Standalone question fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | string | yes | The question stem |
| `type` | string | yes | See type reference below |
| `difficulty` | string | yes | `easy` / `medium` / `hard` |
| `category_name` | string | yes | Created automatically if new |
| `options` | string[] | see type | Choices, word bank, or match targets depending on type |
| `correct_answer` | string | see type | See per-type notes; ignored for `open` |
| `tags` | string[] | no | Free labels |

---

## Type reference

| Type | `options` | `correct_answer` | Scored? |
|---|---|---|---|
| `mcq` | ≥ 2 choices (required) | Exact text of the correct choice | Yes — exact match |
| `true_false` | `["True","False"]` | `"True"` or `"False"` | Yes — exact match |
| `tf_ng` | leave empty | `"True"`, `"False"`, or `"Not Given"` | Yes — exact match |
| `open` | leave empty | Model answer (not auto-graded) | No |
| `sentence_completion` | leave empty | Word/phrase that fills `___` | Yes — case-insensitive |
| `word_bank_completion` | Word bank list (required) | Word/phrase from the bank that fills `___` | Yes — case-insensitive |
| `matching` | Items to match to (required) | The matched item | Yes — exact match |
| `multi_select` | ≥ 2 choices (required) | Pipe-separated correct choices, e.g. `A\|C\|E` | Yes — set match (order-insensitive) |

---

## IELTS Reading question type map

| IELTS format | System type |
|---|---|
| Summary / Notes / Flow Chart / Table Completion (from a word box) | `word_bank_completion` |
| Summary / Table Completion (free recall, no box) | `sentence_completion` |
| Matching (descriptions → items, cause–effect, people → opinions, sentence endings, heading matching, classification, paragraph locating) | `matching` |
| Multiple selection from a list (choose N) | `multi_select` |
| True / False / Not Given | `tf_ng` |
| Yes / No / Not Given | `tf_ng` |
| Multiple choice (single answer) | `mcq` |
| Short answer questions | `open` |
| Diagram labelling (from a box) | `word_bank_completion` |
| Diagram labelling (free recall) | `open` |

---

## Examples

### mcq
```json
{
  "text": "Which particle marks the subject in Japanese?",
  "type": "mcq",
  "difficulty": "medium",
  "category_name": "Grammar",
  "options": ["は", "が", "を", "に"],
  "correct_answer": "が",
  "tags": ["particles"]
}
```

### true_false
```json
{
  "text": "The sun rises in the west.",
  "type": "true_false",
  "difficulty": "easy",
  "category_name": "General",
  "options": ["True", "False"],
  "correct_answer": "False"
}
```

### tf_ng
```json
{
  "text": "The author implies that technology always improves quality of life.",
  "type": "tf_ng",
  "difficulty": "medium",
  "category_name": "Reading",
  "correct_answer": "Not Given",
  "tags": ["inference"]
}
```

### open
```json
{
  "text": "Explain the difference between 'affect' and 'effect'.",
  "type": "open",
  "difficulty": "hard",
  "category_name": "Vocabulary",
  "tags": ["writing"]
}
```

### sentence_completion
Use `___` in `text` to mark the blank. Grading is case-insensitive.
```json
{
  "text": "The ___ was a period of rapid industrial growth in 18th-century Britain.",
  "type": "sentence_completion",
  "difficulty": "medium",
  "category_name": "History",
  "correct_answer": "Industrial Revolution",
  "tags": ["history"]
}
```

### word_bank_completion
Use `___` in `text`. `options` is the shared word bank. Grading is case-insensitive. When multiple questions share the same word bank (e.g. Q1–8 of a passage), repeat the same `options` list on each sub-question.
```json
{
  "text": "Forests act as carbon ___, slowing the accumulation of greenhouse gases.",
  "type": "word_bank_completion",
  "difficulty": "medium",
  "category_name": "Reading",
  "options": ["sinks", "sources", "filters", "pumps", "regulators"],
  "correct_answer": "sinks",
  "tags": ["environment"]
}
```

### matching
`text` is the prompt (description, statement, or paragraph label). `options` is the list of items to match to. When multiple questions share the same option list (e.g. Q9–15 matching to the same 7 researchers), repeat the same `options` on each sub-question or passage question.
```json
{
  "text": "Argued that economic growth inevitably leads to greater inequality.",
  "type": "matching",
  "difficulty": "hard",
  "category_name": "Reading",
  "options": ["A. Piketty", "B. Keynes", "C. Friedman", "D. Sen", "E. Stiglitz"],
  "correct_answer": "A. Piketty",
  "tags": ["economics"]
}
```

### multi_select
`correct_answer` is the pipe-separated list of all correct choices. Grading compares as a set — order does not matter. All-or-nothing per question.
```json
{
  "text": "Which THREE of the following are mentioned as benefits of urban green spaces?",
  "type": "multi_select",
  "difficulty": "medium",
  "category_name": "Reading",
  "options": [
    "A. Reduced air pollution",
    "B. Higher property taxes",
    "C. Improved mental health",
    "D. Decreased biodiversity",
    "E. Lower urban temperatures"
  ],
  "correct_answer": "A. Reduced air pollution|C. Improved mental health|E. Lower urban temperatures",
  "tags": ["environment", "urban"]
}
```

---

## Passage format

A passage groups related questions under a shared reading text. The passage itself carries `difficulty` and `category_name`; sub-questions inherit both. Sub-questions use the same fields as standalone questions except `difficulty` and `category_name` (ignored if provided).

```json
{
  "type": "passage",
  "title": "The Role of Forests in Climate Regulation",
  "body": "Forests cover approximately 31% of the Earth's land surface...",
  "difficulty": "medium",
  "category_name": "Reading",
  "questions": [
    {
      "text": "Forests absorb oxygen and release carbon dioxide through photosynthesis.",
      "type": "tf_ng",
      "correct_answer": "False"
    },
    {
      "text": "Forests act as carbon ___, slowing the build-up of greenhouse gases.",
      "type": "word_bank_completion",
      "options": ["sinks", "sources", "filters", "pumps"],
      "correct_answer": "sinks"
    },
    {
      "text": "Match each process to the correct description.",
      "type": "matching",
      "options": ["A. Transpiration", "B. Photosynthesis", "C. Deforestation"],
      "correct_answer": "B. Photosynthesis"
    }
  ]
}
```

---

## CSV notes

CSV supports standalone questions only (no passages). `options`, `tags`, and `correct_answer` for `multi_select` all use `|` as the separator within a single cell.

```csv
text,type,difficulty,category_name,options,correct_answer,tags
"Forests act as carbon ___, slowing greenhouse gas build-up.",word_bank_completion,medium,Reading,sinks|sources|filters|pumps,sinks,environment
"Argued that economic growth leads to inequality.",matching,hard,Reading,"A. Piketty|B. Keynes|C. Friedman","A. Piketty",economics
"Which TWO are benefits of forests?",multi_select,medium,Reading,"A. Carbon storage|B. Oxygen production|C. Soil erosion|D. Flooding","A. Carbon storage|B. Oxygen production",environment
```
