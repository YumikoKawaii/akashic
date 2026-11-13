# Akashic — Technical Design

How Akashic stores data, generates tests, and grades attempts, as built today. Contract details live in `proto/akashic/v1/*.proto`; conventions and the authorization model live in `CLAUDE.md`.

## Shape

```
browser ── nginx (TLS) ── app :8080 ──┬── PostgreSQL 16  (system of record)
                                      └── Redis 7        (caches)
```

- **app** — one Go binary: Connect RPC over h2c plus the built SPA (`/assets/`, `/favicon/`, everything else → `index.html`). Migrations run at startup.
- **PostgreSQL** — schema `akashic` (`DB_SCHEMA`), created by the compose init config.
- **Redis** — role cache, public-bank visibility cache, generation pool and per-user draw history. Every Redis read has a fallback (DB read-through or in-memory), so Redis being down slows things but never breaks them.

## Schema

All tables carry `id SERIAL`, `created_at`, `updated_at`, and a nullable `deleted_at` (soft delete via GORM).

| Table | Columns | Notes |
|---|---|---|
| `users` | `google_id`, `email`, `name`, `avatar_url` | `email` and `google_id` unique. Google is the only sign-in. |
| `banks` | `name`, `description`, `owner_id`, `default_config` JSONB, `visibility` | `name` is unique per owner among live banks (`idx_banks_owner_name_active`); a clash returns AlreadyExists. Shown as "Record" in the UI. |
| `bank_members` | `bank_id`, `user_id`, `role` | One live row per `(bank_id, user_id)`. Roles: `owner` / `editor` / `viewer`. Source of truth for authorization. |
| `question_groups` | `bank_id`, `title`, `content` JSONB, `difficulty`, `tags[]` | `content` = `{instructions, passage, options[]}`. |
| `questions` | `bank_id`, `type`, `difficulty`, `tags[]`, `content` JSONB, `group_id`, `position` | `content` = `{content, answer}` or `{content, options[], answers[]}` (MCQ). `(group_id, position)` unique among live grouped questions. |
| `tests` | `bank_id`, `name`, `description`, `config` JSONB, `created_by`, `question_ids int[]` | Question order is the array order. |
| `test_attempts` | `test_id`, `user_id`, `answers` JSONB, `score`, `total`, `started_at`, `completed_at` | `answers` maps question id → answer string. |

### Question types

| Type | Content | Answer format |
|---|---|---|
| `mcq` | `choice` | option keys; several correct keys joined with `\|` |
| `tf_ng`, `yn_ng` | `item` | `True` / `False` / `Not Given` (or `Yes` / `No` / `Not Given`) |
| `sentence_completion`, `form_completion` | `item` | the missing word(s); `___` in the content marks the blank |
| `short_answer` | `item` | free text |
| `matching_headings`, `matching_information`, `matching_features` | `item` | an option key from the group's `options` |

### Config

`TestConfig` (bank default and per-test snapshot):

```json
{ "easy_count": 3, "medium_count": 5, "hard_count": 2,
  "types": ["mcq"], "tags": ["grammar"], "group_mode": "" }
```

`group_mode`: `""` mixed (default), `"standalone"` (no grouped questions), `"groups"` (grouped questions only).

## Test generation

`TestService.Generate` → `service/pool.go`:

1. **Pool.** The bank's questions are turned into **units**: each standalone question is a unit of one; each group is one unit holding all its questions. The pool is cached in Redis per bank (24h TTL) and rebuilt after question changes.
2. **Filter.** A unit is kept if it fits `group_mode`, every question type in it is in `types` (when set), and it carries every tag in `tags` (when set).
3. **Bucket.** Kept units are bucketed by difficulty.
4. **Fill.** Each difficulty is filled up to its count, in questions. Units are shuffled; units holding a question from the user's **last 3 generated tests in this bank** go after fresh ones (`UserCooldownAttempts`, set in `cmd/server/main.go`). A unit bigger than the remaining need is skipped, so a group is never split.
5. **Backfill.** Any shortfall is filled from the other difficulties (easy ← medium, hard; medium ← hard, easy; hard ← medium, easy).
6. **Record.** The picked question ids are saved on the test and written to the user's draw history for that bank (Redis, 90-day TTL, in-memory when Redis is down), which feeds step 4 next time. Redis runs without persistence, so a Redis restart clears this history.

When the request has no config, the bank's `default_config` is used. The saved config's counts are rewritten to what was actually picked. If no unit matches, nothing is saved and the RPC fails with FailedPrecondition (`ErrNoQuestions`); the client reports "no questions match".

## Attempts and grading

- `StartAttempt` creates an attempt for the caller; anyone with access to the bank may take any test.
- `SaveAttemptProgress` stores answers while the test is in progress (the client autosaves ~0.7s after each edit).
- `SubmitAttempt` (taker only, once) grades and completes:
  - `mcq` — the submitted key set must equal the correct key set.
  - every other type — trimmed, case-insensitive exact match against the stored answer (an option key for the matching types).
  - `total` is the number of questions in the test; unanswered questions score 0.
- The client also checks answers one by one during the test for a running score; `short_answer` is shown for reference there but not scored.

## Import

`IngestQuestions` accepts JSON, YAML or CSV (`samples/`). Each JSON/YAML item is either a standalone question or a group; CSV rows are always standalone.

Standalone question:

```json
{ "type": "mcq", "difficulty": "easy", "content": "What is the capital of Japan?",
  "options": [{"key": "A", "text": "Tokyo"}, {"key": "B", "text": "Kyoto"}],
  "answers": ["A"], "tags": ["japan"] }
```

Non-MCQ rows use `answer` instead of `options`/`answers`.

Group (any item with a `questions` array, full example in `samples/group_sample.json`):

```json
{ "title": "Urban Green Spaces", "instructions": "Choose the correct heading…",
  "passage": "A. …\n\nB. …", "difficulty": "medium", "tags": ["ielts"],
  "options": [{"key": "i", "text": "Cooler streets"}, {"key": "ii", "text": "A quieter city"}],
  "questions": [{"type": "matching_headings", "content": "Paragraph A", "answer": "i"}] }
```

Child questions take the group's difficulty unless they set their own, get the group's tags merged into theirs, and are numbered by their order (`position`). Matching-type children must answer with one of the group's option keys.

 The import is all-or-nothing: if any row fails parsing or validation, nothing is created and every failing row is returned with its row number. Otherwise all rows are created in one transaction.

## Groups

`ListQuestionGroups` returns each live group with its live question count. `UpdateQuestionGroup` (editor) replaces a group's title, instructions, passage, options, difficulty and tags, then drops the bank's cached pool so the next generation sees the change. A group's questions are edited individually; there is no way to add or reorder them after import.

## Soft delete and trash

Banks, questions and tests are soft-deleted and hidden from every list and lookup. Each has a restore RPC and a way to list what can be restored:

| What | List | Who |
|---|---|---|
| Banks | `ListDeletedBanks` | the caller's own (owner membership), newest first, up to 100 |
| Questions | `ListDeletedQuestions` | editors of the bank, up to 200 |
| Tests | `ListDeletedTests` | the test's creator or an editor+, up to 100 |

Restoring a bank re-registers it as public in the visibility cache if it was public, and fails with AlreadyExists if the owner has since made another live bank with the same name.
