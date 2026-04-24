# Akashic API Documentation

Base URL: `http://localhost:8080/api/v1`

All responses are JSON. Successful responses wrap data in a `data` field. Errors return `{ "error": "message" }`.

---

## Banks

A **bank** is a top-level container for questions (e.g. "Japanese", "English Grammar").

### List Banks
```
GET /banks
```
**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Japanese",
      "description": "JLPT study questions",
      "default_config": { "easy": 3, "medium": 4, "hard": 3 },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Bank
```
GET /banks/:id
```

### Create Bank
```
POST /banks
```
**Body**
```json
{
  "name": "Japanese",
  "description": "JLPT study questions"
}
```
**Response 201**

### Update Bank
```
PUT /banks/:id
```
**Body** — same fields as Create (all optional).

### Update Default Test Config
```
PUT /banks/:id/default-config
```
**Body**
```json
{ "easy": 3, "medium": 4, "hard": 3 }
```

### Delete Bank
```
DELETE /banks/:id
```
**Response 204**

---

## Categories

Categories belong to a bank and group questions within it.

### List Categories
```
GET /banks/:bankId/categories
```

### Create Category
```
POST /banks/:bankId/categories
```
**Body**
```json
{ "name": "Grammar" }
```
**Response 201**

### Update Category
```
PUT /banks/:bankId/categories/:id
```
**Body**
```json
{ "name": "Advanced Grammar" }
```

### Delete Category
```
DELETE /banks/:bankId/categories/:id
```
**Response 204**

---

## Questions

### List Questions
```
GET /banks/:bankId/questions
```
**Query params** (all optional)

| Param | Description |
|---|---|
| `category_id` | Filter by category UUID |
| `difficulty` | `easy`, `medium`, or `hard` |
| `type` | `mcq`, `true_false`, `open`, `tf_ng`, `sentence_completion`, `word_bank_completion`, `matching`, or `multi_select` |
| `tags` | Repeatable. `?tags=grammar&tags=verbs` |

### Get Question
```
GET /banks/:bankId/questions/:id
```

### Create Question
```
POST /banks/:bankId/questions
```
**Body**
```json
{
  "text": "What is the capital of Japan?",
  "type": "mcq",
  "difficulty": "easy",
  "category_id": "uuid",
  "options": ["Tokyo", "Osaka", "Kyoto", "Hiroshima"],
  "correct_answer": "Tokyo",
  "tags": ["japan", "geography"]
}
```
**Types:** `mcq` | `true_false` | `open` | `tf_ng` | `sentence_completion` | `word_bank_completion` | `matching` | `multi_select`
**Difficulties:** `easy` | `medium` | `hard`

**Response 201**

### Update Question
```
PUT /banks/:bankId/questions/:id
```
**Body** — same fields as Create (all optional).

### Delete Question
```
DELETE /banks/:bankId/questions/:id
```
**Response 204**

---

## Bulk Ingest Questions

Import questions in bulk from a file. The file is uploaded as `multipart/form-data`.

```
POST /banks/:bankId/questions/ingest
Content-Type: multipart/form-data
```

**Form field:** `file` — the question file (`.json`, `.yaml`, `.yml`, or `.csv`)

**Behavior:**
- All rows are validated before any DB writes. If any row fails validation, the entire request is rejected with the list of errors.
- Categories referenced by `category_name` are created automatically if they don't exist.
- The entire import is atomic (single transaction).

**Response 200** — all rows imported
```json
{
  "data": {
    "created": 5,
    "failed": 0
  }
}
```

**Response 422** — validation errors
```json
{
  "data": {
    "created": 0,
    "failed": 2,
    "errors": [
      { "row": 3, "text": "Some question text", "message": "invalid type \"quiz\": must be mcq, true_false, open, tf_ng, sentence_completion, word_bank_completion, matching, or multi_select" },
      { "row": 7, "text": "", "message": "text is required" }
    ]
  }
}
```

### File Formats

#### JSON
Array of question objects (or a single root object). `options` and `tags` are JSON arrays. A passage object uses `"type": "passage"` and wraps sub-questions in a `questions` array.

```json
[
  {
    "text": "What is the capital of Japan?",
    "type": "mcq",
    "difficulty": "easy",
    "category_name": "Geography",
    "options": ["Tokyo", "Osaka", "Kyoto", "Hiroshima"],
    "correct_answer": "Tokyo",
    "tags": ["japan", "cities"]
  },
  {
    "text": "Forests act as carbon ___, slowing greenhouse gas build-up.",
    "type": "word_bank_completion",
    "difficulty": "medium",
    "category_name": "Reading",
    "options": ["sinks", "sources", "filters", "pumps"],
    "correct_answer": "sinks"
  },
  {
    "text": "Argued that economic growth inevitably leads to greater inequality.",
    "type": "matching",
    "difficulty": "hard",
    "category_name": "Reading",
    "options": ["Piketty", "Keynes", "Friedman", "Sen"],
    "correct_answer": "Piketty"
  },
  {
    "text": "Which THREE are benefits of urban green spaces?",
    "type": "multi_select",
    "difficulty": "medium",
    "category_name": "Reading",
    "options": ["Reduced air pollution", "Higher taxes", "Improved mental health", "Lower urban temperatures"],
    "correct_answer": "Reduced air pollution|Improved mental health|Lower urban temperatures"
  },
  {
    "type": "passage",
    "title": "The Role of Forests",
    "body": "Forests cover approximately 31% of Earth's land...",
    "difficulty": "medium",
    "category_name": "Reading",
    "questions": [
      {
        "text": "Trees absorb carbon dioxide and release oxygen.",
        "type": "tf_ng",
        "correct_answer": "True"
      },
      {
        "text": "Forests act as carbon ___, slowing greenhouse gas build-up.",
        "type": "word_bank_completion",
        "options": ["sinks", "sources", "filters", "pumps"],
        "correct_answer": "sinks"
      }
    ]
  }
]
```

#### YAML
Array of question objects. `options` and `tags` are YAML sequences. Passages use `type: passage` with a nested `questions` list.

```yaml
- text: "What is the capital of Japan?"
  type: mcq
  difficulty: easy
  category_name: Geography
  options:
    - Tokyo
    - Osaka
    - Kyoto
    - Hiroshima
  correct_answer: Tokyo
  tags:
    - japan
    - cities

- text: "Forests act as carbon ___, slowing greenhouse gas build-up."
  type: word_bank_completion
  difficulty: medium
  category_name: Reading
  options:
    - sinks
    - sources
    - filters
    - pumps
  correct_answer: sinks

- text: "Argued that economic growth inevitably leads to greater inequality."
  type: matching
  difficulty: hard
  category_name: Reading
  options:
    - Piketty
    - Keynes
    - Friedman
    - Sen
  correct_answer: Piketty

- text: "Which THREE are benefits of urban green spaces?"
  type: multi_select
  difficulty: medium
  category_name: Reading
  options:
    - Reduced air pollution
    - Higher taxes
    - Improved mental health
    - Lower urban temperatures
  correct_answer: "Reduced air pollution|Improved mental health|Lower urban temperatures"
```

#### CSV
Headers: `text, type, difficulty, category_name, options, correct_answer, tags`

`options` and `tags` are pipe-separated (`|`) within a single cell. `correct_answer` for `multi_select` is also pipe-separated. **CSV does not support passages** — use JSON or YAML for passage-grouped questions.

```csv
text,type,difficulty,category_name,options,correct_answer,tags
"What is the capital of Japan?",mcq,easy,Geography,Tokyo|Osaka|Kyoto|Hiroshima,Tokyo,japan|cities
"Forests act as carbon ___.",word_bank_completion,medium,Reading,sinks|sources|filters|pumps,sinks,environment
"Argued that growth leads to inequality.",matching,hard,Reading,Piketty|Keynes|Friedman,Piketty,economics
"Which TWO are benefits of forests?",multi_select,medium,Reading,"Carbon storage|Oxygen production|Soil erosion","Carbon storage|Oxygen production",environment
```

**Sample files** are available in the `samples/` directory. See `docs/question_format.md` for full per-type field rules and the IELTS format map.

---

## Tests

A **test** is a generated snapshot of questions drawn from a bank.

### List Tests
```
GET /banks/:bankId/tests
```

### Generate Test
```
POST /banks/:bankId/tests/generate
```
**Body** — all fields optional; omitted fields fall back to the bank's `default_config`
```json
{
  "title": "JLPT N5 Practice",
  "config": { "easy": 3, "medium": 4, "hard": 3 }
}
```

**Response 201**
```json
{
  "data": {
    "id": "uuid",
    "bank_id": "uuid",
    "title": "JLPT N5 Practice",
    "config": { "easy": 3, "medium": 4, "hard": 3 },
    "questions": [ ... ],
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Get Test
```
GET /banks/:bankId/tests/:id
```

### Delete Test
```
DELETE /banks/:bankId/tests/:id
```
**Response 204**

---

## Attempts

An **attempt** is a test-taking run for a specific test.

### Start Attempt
```
POST /banks/:bankId/attempts
```
**Body**
```json
{ "test_id": "uuid" }
```
**Response 201**
```json
{
  "data": {
    "id": "uuid",
    "test_id": "uuid",
    "status": "in_progress",
    "started_at": "2024-01-01T00:00:00Z",
    "answers": {}
  }
}
```

### Get Attempt
```
GET /attempts/:id
```
Includes the test and its questions for rendering the attempt UI.

### Submit Attempt
```
PUT /attempts/:id/submit
```
**Body**
```json
{
  "answers": {
    "question-uuid-1": "Tokyo",
    "question-uuid-2": "True"
  }
}
```
**Response 200**
```json
{
  "data": {
    "id": "uuid",
    "status": "completed",
    "score": 8,
    "total": 10,
    "answers": { ... },
    "completed_at": "2024-01-01T00:01:30Z"
  }
}
```

Scoring applies to all types except `open`. Rules by type:

| Type | Rule |
|---|---|
| `mcq`, `true_false`, `tf_ng`, `matching` | Exact string match |
| `sentence_completion`, `word_bank_completion` | Case-insensitive, whitespace-trimmed |
| `multi_select` | Pipe-separated set match — order does not matter, all-or-nothing |
| `open` | Not scored (self-graded) |

Submitting an already-completed attempt returns **409 Conflict**.
