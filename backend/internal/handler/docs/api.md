# Akashic API Contract

Base URL: `/api/v1`  
Auth: all endpoints require an `auth_token` cookie (JWT, set by the Google OAuth flow).

---

## Question format

Questions have two shapes depending on `type`.

**Non-MCQ** (`tf_ng`, `yn_ng`, `sentence_completion`, `form_completion`, `short_answer`,
`matching_headings`, `matching_information`, `matching_features`):

```json
{
  "id": 42,
  "bank_id": 1,
  "category_id": 3,
  "group_id": null,
  "type": "tf_ng",
  "difficulty": "medium",
  "tags": ["reading"],
  "item": {
    "question_id": 42,
    "content": "The author believes climate change is reversible.",
    "answer": "false"
  }
}
```

**MCQ** (`mcq`):

```json
{
  "id": 43,
  "bank_id": 1,
  "category_id": 3,
  "group_id": null,
  "type": "mcq",
  "difficulty": "easy",
  "tags": [],
  "choice": {
    "question_id": 43,
    "content": "What is the capital of France?",
    "options": [
      { "key": "A", "text": "Berlin" },
      { "key": "B", "text": "Paris" },
      { "key": "C", "text": "Rome" },
      { "key": "D", "text": "Madrid" }
    ],
    "answers": ["B"]
  }
}
```

`difficulty`: `easy` | `medium` | `hard`  
`type` values: `mcq`, `tf_ng`, `yn_ng`, `sentence_completion`, `form_completion`,
`short_answer`, `matching_headings`, `matching_information`, `matching_features`

---

## Questions

### List
```
GET /banks/:bankId/questions
```
Query params (all optional, repeatable where noted):
- `category_id` — filter by category (repeat for multiple)
- `difficulty` — `easy` | `medium` | `hard`
- `type` — one of the type values above
- `tag` — filter by tag (repeat for multiple)
- `standalone=true` — exclude questions that belong to a group

Response: `{ "data": [ ...Question ] }`

### Get
```
GET /banks/:bankId/questions/:id
```
Response: `{ "data": Question }`

### Create
```
POST /banks/:bankId/questions
```
```json
{
  "category_id": 3,
  "type": "mcq",
  "difficulty": "easy",
  "tags": ["vocab"],
  "content": "Question stem text",
  "options": [{ "key": "A", "text": "..." }, ...],
  "answers": ["A"]
}
```
For non-MCQ omit `options`/`answers` and include `"answer": "..."` instead.  
Response: `201 { "data": Question }`

### Update
```
PUT /banks/:bankId/questions/:id
```
Same fields as create, all optional (partial update).

### Delete / Restore
```
DELETE /banks/:bankId/questions/:id        → 204
PUT    /banks/:bankId/questions/:id/restore → 200 { "data": Question }
```

### Bulk import
```
POST /banks/:bankId/questions/ingest
Content-Type: multipart/form-data
field: file  (.json / .yaml / .csv)
```
Response on full success: `200 { "data": { "created": N, "failed": 0 } }`  
Response on partial failure: `422 { "created": N, "failed": M, "errors": [{ "row": 2, "message": "..." }] }`

---

## Bulk import format

Every row is a **standalone question**. No passage wrappers.

### Required fields (all formats)

| Field | Type | Notes |
|---|---|---|
| `type` | string | See valid types below |
| `difficulty` | string | `easy` \| `medium` \| `hard` |
| `category_name` | string | Created automatically if it doesn't exist |
| `content` | string | The question stem |
| `answer` | string | Correct answer — **non-MCQ only** |
| `options` | array | MCQ only — see format below |
| `answers` | array | MCQ only — correct option keys, e.g. `["B"]` or `["A","C"]` |
| `tags` | array / pipe-string | Optional |

**Valid types:** `mcq`, `tf_ng`, `yn_ng`, `sentence_completion`, `form_completion`,
`short_answer`, `matching_headings`, `matching_information`, `matching_features`

**Common mistakes that will be rejected with a specific error:**
- `"text"` — use `"content"`
- `"correct_answer"` — use `"answer"` (non-MCQ) or `"answers"` (MCQ)
- `"true_false"` — use `"tf_ng"`
- `"open"` — use `"short_answer"`
- `"matching"` — use `"matching_headings"`, `"matching_information"`, or `"matching_features"`
- `"multi_select"` — use `"mcq"` with multiple keys in `"answers"`
- `"word_bank_completion"` — use `"sentence_completion"`
- Top-level `"type": "passage"` wrappers — flatten each question as its own row

---

### JSON / YAML

**Non-MCQ row:**
```json
{
  "type": "tf_ng",
  "difficulty": "medium",
  "category_name": "IELTS Reading",
  "content": "The author believes climate change is reversible.",
  "answer": "false",
  "tags": ["reading"]
}
```

`tf_ng` / `yn_ng` answers: `"true"` | `"false"` | `"not given"` (case-insensitive).

**MCQ row:**
```json
{
  "type": "mcq",
  "difficulty": "easy",
  "category_name": "Geography",
  "content": "What is the capital of France?",
  "options": [
    { "key": "A", "text": "Berlin" },
    { "key": "B", "text": "Paris" },
    { "key": "C", "text": "Rome" },
    { "key": "D", "text": "Madrid" }
  ],
  "answers": ["B"],
  "tags": ["europe"]
}
```

For **multi-answer MCQ** (e.g. "choose TWO"), list all correct keys: `"answers": ["A", "C"]`.

---

### CSV

Headers: `type, difficulty, category_name, content, answer, options, answers, tags`

- `options` — pipe-separated option texts; keys are auto-assigned A, B, C, D…
- `answers` — pipe-separated correct keys (e.g. `A` or `A|C`)
- `tags` — pipe-separated tag list
- `answer` — used for non-MCQ; leave blank for MCQ

```csv
type,difficulty,category_name,content,answer,options,answers,tags
tf_ng,easy,Reading,"Forests absorb CO₂ through photosynthesis.",true,,,climate
mcq,medium,Geography,"What is the capital of France?",,Berlin|Paris|Rome|Madrid,B,europe
mcq,hard,Reading,"Which TWO are benefits of urban green spaces?",,Cleaner air|Higher taxes|Better health|Less biodiversity,A|C,urban
```

---

## Tests

### Generate
```
POST /banks/:bankId/tests/generate
```
```json
{
  "name": "Practice Test 1",
  "description": "",
  "config": {
    "easy_count": 10,
    "medium_count": 10,
    "hard_count": 5,
    "category_ids": [1, 2],
    "types": ["mcq", "tf_ng"],
    "tags": []
  }
}
```
`config` is optional — omit to use the bank's `default_config`.  
Response: `201 { "data": Test }`

### List / Get / Delete / Restore
```
GET    /banks/:bankId/tests
GET    /banks/:bankId/tests/:id
DELETE /banks/:bankId/tests/:id
PUT    /banks/:bankId/tests/:id/restore
```

---

## Attempts

### Start
```
POST /banks/:bankId/tests/:id/attempts
```
No body. Returns an attempt with an empty `answers` map.  
Response: `201 { "data": TestAttempt }`

### Get (includes test + questions)
```
GET /attempts/:id
```
Response: `{ "data": TestAttempt }`

### Submit
```
PUT /attempts/:id/submit
```
```json
{
  "answers": {
    "42": "false",
    "43": "B",
    "44": "not given"
  }
}
```
Keys are `question_id` as a string.

**Grading:**
- MCQ: pipe-separated keys, e.g. `"A"` or `"A|C"` (order doesn't matter)
- `tf_ng` / `yn_ng`: case-insensitive (`"True"`, `"FALSE"` all accepted)
- `sentence_completion` / `form_completion` / `short_answer`: case-insensitive exact match
- `matching_*`: exact match on the option key

Response: `{ "data": TestAttempt }` with `score` and `total` populated.
