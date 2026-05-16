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
