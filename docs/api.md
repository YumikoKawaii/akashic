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
| `type` | `mcq`, `true_false`, `open`, `tf_ng`, or `sentence_completion` |
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
**Types:** `mcq` | `true_false` | `open` | `tf_ng` | `sentence_completion`
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
      { "row": 3, "text": "Some question text", "message": "invalid type \"quiz\": must be mcq, true_false, open, tf_ng, or sentence_completion" },
      { "row": 7, "text": "", "message": "text is required" }
    ]
  }
}
```

### File Formats

#### JSON
Array of question objects. `options` and `tags` are JSON arrays.
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
  }
]
```

#### YAML
Array of question objects. `options` and `tags` are YAML sequences.
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
```

#### CSV
Headers: `text, type, difficulty, category_name, options, correct_answer, tags`

`options` and `tags` are pipe-separated (`|`) within a single cell.

```csv
text,type,difficulty,category_name,options,correct_answer,tags
"What is the capital of Japan?",mcq,easy,Geography,Tokyo|Osaka|Kyoto|Hiroshima,Tokyo,japan|cities
```

**Sample files** are available in the `samples/` directory.

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

Scoring applies to `mcq`, `true_false`, `tf_ng`, and `sentence_completion` questions. `sentence_completion` matching is case-insensitive and whitespace-trimmed. `open` questions are excluded from scoring (self-graded).

Submitting an already-completed attempt returns **409 Conflict**.
