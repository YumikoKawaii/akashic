# Akashic — Technical Design

## 1. Goal

A personal tool to manage multiple question banks and generate tests from them. Each bank is an independent collection (e.g. English, Japanese, Go Programming). Tests are generated from a single bank with configurable difficulty distribution.

---

## 2. Tech Stack

| Layer      | Choice                         | Reason                                              |
|------------|--------------------------------|-----------------------------------------------------|
| Backend    | Go + Gin                       | Fast, ergonomic HTTP framework                      |
| Database   | PostgreSQL                     | Relational, great for filtered queries              |
| DB access  | GORM                           | Full-featured ORM, good fit with UoW pattern        |
| Migrations | golang-migrate                 | Version-controlled schema changes                   |
| Frontend   | React 18 + Vite + TypeScript   | (deferred — backend first)                          |
| Infra      | Docker Compose                 | One-command local setup                             |

---

## 3. Domain Model

The central concept is the **Bank** — an independent question bank with its own categories and a default test config. Tests are generated from one bank.

```
Bank
  ├── default_config (TestConfig)   ← default generation settings for this bank
  ├── Category (many)
  ├── Question (many)
  │     └── belongs to one Category
  └── Test (many)
        ├── config (TestConfig)     ← actual config used when this test was generated
        └── TestQuestion (many) → Question
              └── TestSession (many)
```

---

## 4. TestConfig

`TestConfig` is a reusable value type (stored as JSONB) that defines how a test is generated from a bank. It lives in two places:
- `banks.default_config` — the bank's default, used when no override is given
- `tests.config` — snapshot of the config used when the test was generated

```json
{
  "easy_count":   5,
  "medium_count": 10,
  "hard_count":   5,
  "category_id":  "uuid | null",
  "type":         "mcq | true_false | open | null",
  "tags":         ["tag1", "tag2"]
}
```

All fields except the counts are optional filters. Counts default to 0 if omitted (skip that difficulty).

---

## 5. Database Schema

### 5.1 banks
| Column         | Type        | Notes                                       |
|----------------|-------------|---------------------------------------------|
| id             | UUID        | Primary key                                 |
| name           | TEXT        | Unique (e.g. "English", "Japanese")         |
| description    | TEXT        | Optional                                    |
| default_config | JSONB       | TestConfig — default generation settings    |
| created_at     | TIMESTAMPTZ |                                             |
| updated_at     | TIMESTAMPTZ |                                             |

### 5.2 categories
| Column      | Type        | Notes                         |
|-------------|-------------|-------------------------------|
| id          | UUID        | Primary key                   |
| bank_id     | UUID        | FK → banks                    |
| name        | TEXT        | Unique within a bank          |
| description | TEXT        | Optional                      |
| created_at  | TIMESTAMPTZ |                               |
| updated_at  | TIMESTAMPTZ |                               |

### 5.3 questions
| Column         | Type        | Notes                                               |
|----------------|-------------|-----------------------------------------------------|
| id             | UUID        | Primary key                                         |
| bank_id        | UUID        | FK → banks                                          |
| category_id    | UUID        | FK → categories                                     |
| text           | TEXT        | The question body                                   |
| type           | TEXT        | `mcq` / `true_false` / `open`                       |
| difficulty     | TEXT        | `easy` / `medium` / `hard`                          |
| options        | JSONB       | Array of strings (mcq/true_false); null otherwise   |
| correct_answer | TEXT        | Option index (mcq), "true"/"false", or free text    |
| tags           | TEXT[]      | Optional labels                                     |
| created_at     | TIMESTAMPTZ |                                                     |
| updated_at     | TIMESTAMPTZ |                                                     |

### 5.4 tests
| Column      | Type        | Notes                                        |
|-------------|-------------|----------------------------------------------|
| id          | UUID        | Primary key                                  |
| bank_id     | UUID        | FK → banks                                   |
| name        | TEXT        |                                              |
| description | TEXT        | Optional                                     |
| config      | JSONB       | TestConfig snapshot used at generation time  |
| created_at  | TIMESTAMPTZ |                                              |
| updated_at  | TIMESTAMPTZ |                                              |

### 5.5 test_questions
| Column      | Type    | Notes                          |
|-------------|---------|--------------------------------|
| test_id     | UUID    | FK → tests                     |
| question_id | UUID    | FK → questions                 |
| position    | INTEGER | Display order within the test  |

Primary key: `(test_id, question_id)`

### 5.6 test_sessions
| Column       | Type        | Notes                                           |
|--------------|-------------|-------------------------------------------------|
| id           | UUID        | Primary key                                     |
| test_id      | UUID        | FK → tests                                      |
| answers      | JSONB       | Map of `question_id → submitted_answer`         |
| score        | INTEGER     | Null until submitted                            |
| total        | INTEGER     | Total auto-gradable questions                   |
| started_at   | TIMESTAMPTZ |                                                 |
| completed_at | TIMESTAMPTZ | Null until submitted                            |

---

## 6. API Design

Base path: `/api/v1`

### Banks
```
GET    /banks                     List all banks
POST   /banks                     Create bank (with optional default_config)
GET    /banks/:id                 Get bank (with stats)
PUT    /banks/:id                 Update bank name/description
PUT    /banks/:id/default-config  Update bank's default TestConfig
DELETE /banks/:id                 Delete bank (cascades)
```

### Categories (scoped to bank)
```
GET    /banks/:bankId/categories          List categories
POST   /banks/:bankId/categories          Create category
PUT    /banks/:bankId/categories/:id      Update category
DELETE /banks/:bankId/categories/:id      Delete category
```

### Questions (scoped to bank)
```
GET    /banks/:bankId/questions           List (filter: category, difficulty, type, tags)
POST   /banks/:bankId/questions           Create question
GET    /banks/:bankId/questions/:id       Get question
PUT    /banks/:bankId/questions/:id       Update question
DELETE /banks/:bankId/questions/:id       Delete question
```

### Tests (scoped to bank)
```
GET    /banks/:bankId/tests               List tests
POST   /banks/:bankId/tests/generate      Generate test (config optional → falls back to bank default)
GET    /banks/:bankId/tests/:id           Get test with questions
DELETE /banks/:bankId/tests/:id           Delete test
```

**Generate request — all fields optional, missing counts default to 0:**
```json
{
  "name": "JLPT N3 Practice",
  "config": {
    "easy_count":   5,
    "medium_count": 10,
    "hard_count":   5,
    "category_id":  "uuid",
    "type":         "mcq",
    "tags":         ["grammar"]
  }
}
```
If `config` is omitted entirely, the bank's `default_config` is used.

### Sessions
```
POST   /sessions              Start session (supply test_id)
GET    /sessions/:id          Get session state
PUT    /sessions/:id/submit   Submit answers + receive score
```

---

## 7. Backend Architecture

### 7.1 Directory Layout
```
backend/
├── cmd/
│   └── server/
│       └── main.go             Entry point, wiring
├── internal/
│   ├── handler/                Gin handlers (HTTP layer)
│   │   ├── bank.go
│   │   ├── category.go
│   │   ├── question.go
│   │   ├── test.go
│   │   └── session.go
│   ├── service/                Business logic
│   │   ├── bank.go
│   │   ├── question.go
│   │   ├── test.go
│   │   └── session.go
│   ├── repository/             GORM repositories
│   │   ├── bank.go
│   │   ├── category.go
│   │   ├── question.go
│   │   ├── test.go
│   │   └── session.go
│   ├── uow/                    Unit of Work
│   │   └── uow.go
│   ├── model/                  GORM models + domain types
│   │   └── models.go
│   └── config/                 App config (env/yaml)
│       └── config.go
├── db/
│   └── migrations/
├── go.mod
└── Makefile
```

### 7.2 Request Flow
```
HTTP Request
  → Gin Router
    → Middleware (CORS, logging, recovery)
      → Handler (bind & validate input)
        → Service (business logic)
          → Unit of Work (opens transaction)
            → Repository A
            → Repository B
          → Commit / Rollback
```

### 7.3 Unit of Work Pattern

UoW wraps a `*gorm.DB` transaction and vends typed repositories. Services call it for any operation touching multiple tables. Single-table reads use a repository directly without UoW.

```go
// uow/uow.go

type UnitOfWork struct {
    db *gorm.DB
}

func New(db *gorm.DB) *UnitOfWork {
    return &UnitOfWork{db: db}
}

func (u *UnitOfWork) Begin() *Transaction {
    tx := u.db.Begin()
    return &Transaction{
        tx:         tx,
        Banks:      repository.NewBankRepo(tx),
        Categories: repository.NewCategoryRepo(tx),
        Questions:  repository.NewQuestionRepo(tx),
        Tests:      repository.NewTestRepo(tx),
        Sessions:   repository.NewSessionRepo(tx),
    }
}

type Transaction struct {
    tx         *gorm.DB
    Banks      *repository.BankRepo
    Categories *repository.CategoryRepo
    Questions  *repository.QuestionRepo
    Tests      *repository.TestRepo
    Sessions   *repository.SessionRepo
}

func (t *Transaction) Commit() error { return t.tx.Commit().Error }
func (t *Transaction) Rollback()     { t.tx.Rollback() }
```

---

## 8. Test Generation Algorithm

```
1. Resolve config: use request config if provided, else bank's default_config
2. For each difficulty (easy, medium, hard) where count > 0:
   a. Query questions in bank matching difficulty + optional filters
   b. Shuffle in-memory
   c. Pick min(count, available) questions
3. Merge all picked questions, assign sequential positions
4. UoW: insert test + test_questions in one transaction
5. Return test with resolved question list
```

---

## 9. Scoring

Only `mcq` and `true_false` are auto-scored. `open` questions are excluded from score/total.

```
score = count where submitted_answer == correct_answer
total = count of mcq + true_false questions in the test
```

---

## 10. Local Development

```bash
docker compose up       # Postgres + backend
make migrate-up         # Run DB migrations
make dev                # Run backend with hot reload (air)
```

Ports:
- Backend: `http://localhost:8080`
- Postgres: `localhost:5432`

---

## 11. Out of Scope (for now)

- User authentication / multi-user
- Cross-bank test generation
- File/image attachments on questions
- Timer on test sessions
- Export to PDF
- Frontend (deferred)
