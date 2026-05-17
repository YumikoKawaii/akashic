# Akashic API

Base URL: `http://localhost:8080/api/v1`  
Auth: all endpoints require an `auth_token` cookie (JWT). Set via Google OAuth or `POST /auth/login`.

All responses are JSON. Success returns the resource directly (no wrapper). Errors return `{ "error": "message" }`.

---

## Auth

```
POST /auth/register    { email, password (min 6), name }  → 201 + sets cookie
POST /auth/login       { email, password }                 → 200 + sets cookie
GET  /auth/google                                          → redirects to Google
GET  /auth/me                                              → 200 current user
POST /auth/logout                                          → 204
```

---

## Banks

```
GET    /banks                   → list banks accessible to the current user
POST   /banks                   → create bank
GET    /banks/:bankId           → get bank
PUT    /banks/:bankId           → update name / description
DELETE /banks/:bankId           → soft-delete
PUT    /banks/:bankId/restore   → restore
PUT    /banks/:bankId/default-config → replace default TestConfig
```

**Create/update body:**
```json
{ "name": "English IELTS", "description": "..." }
```

**Default config body:**
```json
{ "easy_count": 10, "medium_count": 10, "hard_count": 5, "category_ids": [1,2], "types": ["mcq","tf_ng"] }
```

---

## Members

```
GET    /banks/:bankId/members                    → list members
POST   /banks/:bankId/members                    → add member by email
DELETE /banks/:bankId/members/:userId            → remove member
PUT    /banks/:bankId/members/:userId/role        → change role
```

**Add member body:** `{ "email": "...", "role": "editor" | "viewer" }`  
**Change role body:** `{ "role": "editor" | "viewer" }`

---

## Categories

```
GET    /banks/:bankId/categories
POST   /banks/:bankId/categories        { "name": "...", "description": "..." }
PUT    /banks/:bankId/categories/:id
DELETE /banks/:bankId/categories/:id    → 204
PUT    /banks/:bankId/categories/:id/restore
```

---

## Questions

### List
```
GET /banks/:bankId/questions
```
Query params (all optional, `category_id` and `tag` are repeatable):

| Param | Values |
|---|---|
| `category_id` | integer |
| `difficulty` | `easy` / `medium` / `hard` |
| `type` | see types below |
| `tag` | string |
| `standalone` | `true` — exclude group questions |

### Create
```
POST /banks/:bankId/questions
```
**Non-MCQ:**
```json
{
  "category_id": 3,
  "type": "tf_ng",
  "difficulty": "medium",
  "content": "The author implies technology always improves life.",
  "answer": "not given",
  "tags": ["inference"]
}
```
**MCQ:**
```json
{
  "category_id": 3,
  "type": "mcq",
  "difficulty": "easy",
  "content": "What is the capital of France?",
  "options": [
    { "key": "A", "text": "Berlin" },
    { "key": "B", "text": "Paris" },
    { "key": "C", "text": "Rome" },
    { "key": "D", "text": "Madrid" }
  ],
  "answers": ["B"]
}
```

**Valid types:** `mcq`, `tf_ng`, `yn_ng`, `sentence_completion`, `form_completion`,
`short_answer`, `matching_headings`, `matching_information`, `matching_features`

```
GET    /banks/:bankId/questions/:id
PUT    /banks/:bankId/questions/:id     → same fields as create, all optional
DELETE /banks/:bankId/questions/:id     → 204
PUT    /banks/:bankId/questions/:id/restore
```

### Bulk import
```
POST /banks/:bankId/questions/ingest
Content-Type: multipart/form-data
field: file  (.json / .yaml / .csv)
```

JSON/YAML may include standalone questions, `kind: "group"` question groups, or
`type: "passage"` passage wrappers with embedded questions/groups. CSV supports
standalone questions only.

Response on success: `200 { "created": N, "failed": 0 }`
Response on error: `422 { "created": 0, "failed": N, "errors": [{ "row": 2, "message": "..." }] }`

See `docs/question_format.md` for the full import schema and examples.

---

## Passages

```
GET    /banks/:bankId/passages                  → list (query: category_id, difficulty)
POST   /banks/:bankId/passages                  → create
GET    /banks/:bankId/passages/:id              → get (includes groups + questions with item/choice)
PUT    /banks/:bankId/passages/:id              → update
DELETE /banks/:bankId/passages/:id              → soft-delete
PUT    /banks/:bankId/passages/:id/restore
```

**Create body:**
```json
{ "category_id": 1, "title": "The History of Rockets", "body": "...", "difficulty": "hard" }
```

**Update body** (all optional):
```json
{ "title": "...", "body": "...", "difficulty": "hard", "category_id": 1 }
```

---

## Question Groups

```
GET    /banks/:bankId/question-groups           → list (query: category_id, difficulty, type)
POST   /banks/:bankId/question-groups           → create
GET    /banks/:bankId/question-groups/:id       → get (includes questions with item/choice)
PUT    /banks/:bankId/question-groups/:id       → update difficulty / context
DELETE /banks/:bankId/question-groups/:id       → soft-delete
PUT    /banks/:bankId/question-groups/:id/restore
```

**Create body:**
```json
{
  "category_id": 1,
  "passage_id": 3,
  "type": "matching_headings",
  "difficulty": "hard",
  "context": {
    "sections": [{ "key": "B", "label": "Paragraph B" }],
    "headings": [{ "key": "i", "text": "Undeveloped for centuries" }]
  },
  "questions": [
    { "content": "Paragraph B", "answer": "i" }
  ]
}
```

`passage_id` is optional (omit for standalone groups). `context` shape depends on `type` — see `GroupContext` in `docs/question_format.md`.

**Update body** (all optional):
```json
{ "difficulty": "medium", "context": { ... } }
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
  "config": {
    "easy_count": 10,
    "medium_count": 10,
    "hard_count": 5,
    "category_ids": [1, 2],
    "types": ["mcq", "tf_ng"]
  }
}
```
`config` is optional — if omitted, falls back to the bank's `default_config`.

```
GET    /banks/:bankId/tests
GET    /banks/:bankId/tests/:id     → includes ordered questions
DELETE /banks/:bankId/tests/:id     → 204
PUT    /banks/:bankId/tests/:id/restore
```

---

## Attempts

```
POST /banks/:bankId/tests/:id/attempts   → start (no body) → 201
GET  /banks/:bankId/tests/:id/attempts   → list attempts for a test
GET  /attempts/:id                        → get attempt (includes test + questions)
PUT  /attempts/:id/submit                → submit answers → 200 with score
```

### Submit body
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

**Grading rules:**

| Type | Rule |
|---|---|
| `mcq` | Pipe-separated keys (`"A"` or `"A|C"`), sorted set match |
| `tf_ng` / `yn_ng` | Case-insensitive (`"True"`, `"NOT GIVEN"` all accepted) |
| `sentence_completion` / `form_completion` / `short_answer` | Case-insensitive exact match |
| `matching_headings` / `matching_information` / `matching_features` | Exact string match |

`short_answer` is not auto-scored in the UI (score shown as null).  
Submitting an already-completed attempt returns **409 Conflict**.
