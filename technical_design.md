# Akashic — Schema Revamp Draft (v3)

---

## Design Philosophy

`questions` is a **metadata / routing table** — it holds only the fields used for filtering, indexing, and test generation. Type-specific detail lives in one of two child tables.

For types where multiple items share a common context (a heading pool, a paragraph list, a word limit), those items form a **question group**. Each individual item is its own `questions` row — one row = one scoreable point.

```
passages         (optional reading text — owns its question groups)
  │
question_groups  (one question set per type per passage, or standalone with no passage)
  │
questions        (metadata: type, difficulty, tags, group_id)
  ├── q_question_items   (all types except mcq)
  └── q_multiple_choices (mcq only — needs options array)
```

**Standalone types** (tf_ng, yn_ng, mcq) have no group; `group_id` is NULL.  
**Grouped types** (matching_*, sentence_completion, form_completion, short_answer) always belong to a group. Test generation picks a whole group, not individual items.  
**Passage-based groups** set `passage_id` on `question_groups`; standalone groups leave it NULL.

CHECK constraints on `type` and answer values are omitted — the application layer enforces these.

---

## IDs

All tables use `INTEGER GENERATED ALWAYS AS IDENTITY`. No UUIDs — this is a single-node personal tool and integer PKs are smaller, faster on joins, and simpler everywhere.

---

## Audit Columns

Every entity table carries the same three audit columns:

| Column | Type | Behaviour |
|---|---|---|
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | Set on insert, never changed |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | Updated by application on every write |
| `deleted_at` | `TIMESTAMPTZ` | NULL = active; non-NULL = soft-deleted |

**Soft delete rules:**
- All queries must filter `WHERE deleted_at IS NULL` unless explicitly auditing.
- Deleting a parent (e.g. a bank) cascades soft deletes to its children in the application layer — DB-level `ON DELETE CASCADE` is kept only for truly dependent child tables that have no independent lifecycle (e.g. `q_question_items`, `test_questions`).
- `UNIQUE` constraints that include soft-deleted rows can cause conflicts when re-creating deleted records — handle by filtering `WHERE deleted_at IS NULL` in unique indexes where needed.

Child tables with no independent lifecycle (`q_question_items`, `q_multiple_choices`, `test_questions`) do **not** carry audit columns — they share their parent's.

---

## Core Tables

### `users`
```sql
CREATE TABLE users (
    id         INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    google_id  TEXT        NOT NULL UNIQUE,
    email      TEXT        NOT NULL UNIQUE,
    name       TEXT        NOT NULL,
    avatar_url TEXT        NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

### `banks`
```sql
CREATE TABLE banks (
    id             INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           TEXT        NOT NULL,
    description    TEXT        NOT NULL DEFAULT '',
    owner_id       INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    default_config JSONB       NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX ON banks(name) WHERE deleted_at IS NULL;
```

`UNIQUE` on `name` is a partial index so deleted banks don't block reuse of the same name.

### `bank_members`
```sql
CREATE TABLE bank_members (
    bank_id    INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT        NOT NULL,  -- owner | editor | viewer
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (bank_id, user_id)
);
```

### `categories`
```sql
CREATE TABLE categories (
    id          INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bank_id     INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX ON categories(bank_id, name) WHERE deleted_at IS NULL;
```

### `passages`
```sql
CREATE TABLE passages (
    id          INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bank_id     INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    category_id INTEGER     NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    title       TEXT        NOT NULL,
    body        TEXT        NOT NULL DEFAULT '',
    difficulty  TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX ON passages(bank_id);
CREATE INDEX ON passages(category_id);
```

---

## Question Groups

Holds the shared context for grouped question types. Standalone questions (tf_ng, yn_ng, mcq) do not have a group.

```sql
CREATE TABLE question_groups (
    id          INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bank_id     INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    category_id INTEGER     NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    passage_id  INTEGER     REFERENCES passages(id) ON DELETE CASCADE,
    type        TEXT        NOT NULL,
    context     JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX ON question_groups(bank_id);
CREATE INDEX ON question_groups(passage_id);
```

**`context` shape per type:**

| Type | `context` |
|---|---|
| `matching_headings` | `{"sections":[{"key":"A","label":"Paragraph A"},...],"headings":[{"key":"i","text":"..."},...]}`|
| `matching_information` | `{"paragraphs":[{"key":"A"},{"key":"B"},...]}`|
| `matching_features` | `{"options":[{"key":"A","text":"Charles Darwin"},...]}`|
| `sentence_completion` | `{"word_limit":2}` or `{"word_limit":2,"word_bank":["steel","coal","demand",...]}` |
| `form_completion` | `{"form_type":"summary","title":"...","template":"...{1}...{2}...","word_limit":2}` or with `"word_bank":[...]` |
| `short_answer` | `{"word_limit":3}`|

---

## Questions Metadata Table

```sql
CREATE TABLE questions (
    id          INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bank_id     INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    category_id INTEGER     NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    group_id    INTEGER     REFERENCES question_groups(id) ON DELETE CASCADE,
    type        TEXT        NOT NULL,
    difficulty  TEXT        NOT NULL,
    tags        TEXT[]      NOT NULL DEFAULT '{}',
    position    SMALLINT,   -- ordering within a group
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX ON questions(bank_id);
CREATE INDEX ON questions(category_id);
CREATE INDEX ON questions(group_id);
CREATE INDEX ON questions(type);
CREATE INDEX ON questions(difficulty);
```

---

## Child Tables

### `q_question_items` — all types except `mcq`

All non-MCQ types share the same `(content, answer)` shape. No audit columns — lifecycle is owned by the parent `questions` row.

```sql
CREATE TABLE q_question_items (
    question_id INTEGER PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
    content     TEXT    NOT NULL,
    answer      TEXT    NOT NULL
);
```

**`content` meaning per type:**

| Type | `content` | `answer` |
|---|---|---|
| `tf_ng` · `yn_ng` | The statement to judge | `"True"` / `"False"` / `"Not Given"` / `"Yes"` / `"No"` |
| `matching_headings` | Section key — `"A"`, `"B"` … | Heading key from group pool — `"iii"` |
| `matching_information` | The detail to locate | Paragraph key — `"C"` |
| `matching_features` | The statement to match | Option key from group pool — `"B"` |
| `sentence_completion` | Sentence template with `___` | The word/phrase to fill (chosen from `word_bank` if present) |
| `form_completion` | Placeholder key — `"1"`, `"2"` … | The word/phrase for that blank (chosen from `word_bank` if present) |
| `short_answer` | The question stem | The factual answer |

---

### `q_multiple_choices` — `mcq` only

MCQ is the only type with a structured options list that doesn't fit the `(content, answer)` shape. No audit columns — lifecycle is owned by the parent `questions` row.

```sql
CREATE TABLE q_multiple_choices (
    question_id INTEGER  PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
    content     TEXT     NOT NULL,   -- the question prompt shown to the student
    options     JSONB    NOT NULL,   -- [{"key":"A","text":"..."},{"key":"B","text":"..."},...]
    answers     TEXT[]   NOT NULL    -- ["B"] for single-answer, ["A","C"] for multi-answer
);
```

Frontend renders radio buttons when `len(answers) == 1`, checkboxes when `len(answers) > 1`.  
**Student answer:** `"B"` (single) or `"A|C"` pipe-joined, evaluated as a set (multi).

---

## Rendering: How Grouped Types Work

For grouped types the frontend needs two things: the group context and the individual items.

**Matching Headings example:**
1. Fetch the group → `context.sections` gives the list of paragraphs (key + label), `context.headings` gives the pool of heading options (including extras).
2. Fetch all `questions` rows where `group_id = X AND deleted_at IS NULL`, ordered by `position`.
3. Each row has `content = "A"` (section key) and `answer = "iii"` (correct heading key, hidden during attempt).
4. Render: for each section show the label and a dropdown of all headings. Student picks one heading per section.
5. Student answer per question: one heading key string — `"iii"`.

The same pattern applies to all grouped types — the group provides the shared pool/template, the individual question rows provide the items and answers.

---

## Tests & Attempts

### `tests`
```sql
CREATE TABLE tests (
    id          INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bank_id     INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    config      JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
```

### `test_questions`

No audit columns — lifecycle is owned by the parent `tests` row.

```sql
CREATE TABLE test_questions (
    test_id     INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    PRIMARY KEY (test_id, question_id)
);
```

### `test_attempts`

`started_at` and `completed_at` are semantic timestamps, not audit. The audit trio is separate.

```sql
CREATE TABLE test_attempts (
    id           INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    test_id      INTEGER     NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    answers      JSONB       NOT NULL DEFAULT '{}',
    -- { "42": "True", "57": "B", "61": "iii", "78": "steel pipes" }
    score        INTEGER,
    total        INTEGER,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);
```

---

## Grading Contract

| Type | Match method |
|---|---|
| `tf_ng` · `yn_ng` | Exact string |
| `mcq` single | Exact key |
| `mcq` multi | Set equality of pipe-split keys |
| `matching_headings` · `matching_information` · `matching_features` | Exact key |
| `sentence_completion` · `short_answer` | Case-insensitive, within word limit |
| `form_completion` | Case-insensitive per placeholder, within word limit |

Score = count of correct `questions` rows in the attempt. For grouped types this gives natural partial credit.

---

## Test Generation

- **Standalone types** (tf_ng, yn_ng, mcq): pick individual `questions` rows (`WHERE deleted_at IS NULL`).
- **Grouped types**: pick a `question_group`, include all its `questions` rows — splitting a group makes no pedagogical sense.

`TestConfig` JSONB filters by difficulty, category, type, and tags.

---

## API Design

Base path: `/api/v1`. All endpoints require auth except `/auth/*`.  
Soft-deleted resources return `404` on direct access and are invisible in list responses.

### Auth
```
GET  /auth/google           Redirect to Google OAuth
GET  /auth/google/callback  OAuth callback, set session cookie
GET  /auth/me               Current user profile
POST /auth/logout           Clear session
```

### Banks
```
GET    /banks                      List my banks (owned + member)
POST   /banks                      Create bank
GET    /banks/:id                  Get bank
PUT    /banks/:id                  Update name / description
PUT    /banks/:id/default-config   Update default TestConfig
DELETE /banks/:id                  Soft delete bank (cascades to all children)
PUT    /banks/:id/restore          Restore soft-deleted bank
```

### Bank Members
```
GET    /banks/:id/members          List members
POST   /banks/:id/members          Add member        { user_id, role }
PUT    /banks/:id/members/:userId  Change role       { role }
DELETE /banks/:id/members/:userId  Remove member     (soft delete)
```

### Categories
```
GET    /banks/:id/categories          List categories
POST   /banks/:id/categories          Create category
PUT    /banks/:id/categories/:catId   Update category
DELETE /banks/:id/categories/:catId   Soft delete (cascades to questions in category)
PUT    /banks/:id/categories/:catId/restore
```

### Passages
```
GET    /banks/:id/passages            List passages (filter: category, difficulty)
POST   /banks/:id/passages            Create passage + its question groups
GET    /banks/:id/passages/:pid       Get passage with groups and questions
PUT    /banks/:id/passages/:pid       Update passage metadata / body
DELETE /banks/:id/passages/:pid       Soft delete (cascades to groups and questions)
PUT    /banks/:id/passages/:pid/restore
```

### Question Groups
```
GET    /banks/:id/groups              List groups (filter: type, category, passage, difficulty)
POST   /banks/:id/groups              Create group + its question items
GET    /banks/:id/groups/:gid         Get group with all question items
PUT    /banks/:id/groups/:gid         Update group context (word bank, headings, template…)
DELETE /banks/:id/groups/:gid         Soft delete (cascades to all question items)
PUT    /banks/:id/groups/:gid/restore
```

### Questions
```
GET    /banks/:id/questions           List questions (filter: type, difficulty, category, group, tags)
POST   /banks/:id/questions           Create standalone question (tf_ng · yn_ng · mcq)
POST   /banks/:id/questions/ingest    Bulk import via JSON / YAML / CSV
GET    /banks/:id/questions/:qid      Get question with child detail
PUT    /banks/:id/questions/:qid      Update question metadata + child detail
DELETE /banks/:id/questions/:qid      Soft delete
PUT    /banks/:id/questions/:qid/restore
```

### Tests
```
GET    /banks/:id/tests               List tests
POST   /banks/:id/tests/generate      Generate test from TestConfig
GET    /banks/:id/tests/:tid          Get test with question list
DELETE /banks/:id/tests/:tid          Soft delete
PUT    /banks/:id/tests/:tid/restore
```

### Attempts
```
POST   /banks/:id/attempts            Start attempt          { test_id }
GET    /attempts/:aid                 Get attempt state
PUT    /attempts/:aid/submit          Submit answers + receive score  { answers: {...} }
GET    /banks/:id/tests/:tid/attempts List attempts for a test
DELETE /attempts/:aid                 Soft delete attempt
```

### Soft Delete Behaviour Summary
| Action | HTTP | Body |
|---|---|---|
| Delete any resource | `DELETE /:id` | — → `204 No Content` |
| Restore any resource | `PUT /:id/restore` | — → `200` with restored record |
| Access deleted resource | `GET /:id` | — → `404 Not Found` |
| List endpoints | `GET /...` | deleted records silently excluded |

---

## Migration Path from Current Schema

1. **Migration 006** — create `question_groups`, `q_question_items`, `q_multiple_choices` with integer PKs and audit columns
2. **Migration 007** — backfill from existing `(text, options, correct_answer)` columns
   - Old `matching` rows: **manual re-entry required** — existing encoding is unrecoverable
3. **Migration 008** — drop `text`, `options`, `correct_answer` from `questions`; switch to integer PKs throughout
4. Update Go models, service layer, ingest, grader, frontend types + renderers

---

## Open Questions

1. **Word limit enforcement** — at grade time (warn but don't block) or submit time (hard block)?  
   Recommend: grade time.

2. **Partial credit display** — show per-item score breakdown in results, or just total?  
   Recommend: show breakdown from day one since the data is already per-item.
