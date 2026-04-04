# Akashic — CLAUDE.md

## Project Overview
Akashic is a personal test/quiz management system. Users maintain multiple question archives (e.g. English, Japanese) and generate tests from them. Go backend first, React frontend deferred.

## Repository Structure
```
akashic/
├── backend/          # Go API server
├── frontend/         # React + TypeScript SPA (deferred)
├── docker-compose.yml
└── CLAUDE.md
```

## Backend Conventions (Go)
- Module: `github.com/yumikokawaii/akashic/backend`
- Router: Gin
- DB: PostgreSQL via GORM + golang-migrate for migrations
- Layered architecture: `handler → service → unit of work → repository`
- Unit of Work pattern for all multi-table operations
- Single-table reads can bypass UoW and use repositories directly
- Errors: return domain errors from service, translate to HTTP status in handler
- No global state; inject dependencies via constructor functions
- Migrations live in `db/migrations/`

### Backend Directory Layout
```
backend/
├── cmd/server/main.go
├── internal/
│   ├── handler/      # Gin handlers
│   ├── service/      # Business logic
│   ├── repository/   # GORM repositories
│   ├── uow/          # Unit of Work
│   ├── model/        # GORM models + domain types
│   └── config/       # Config loading
├── db/
│   └── migrations/
└── Makefile
```

## Key Domain Concepts
- **Bank**: top-level question bank (e.g. "English", "Japanese"). Holds categories, questions, and a default TestConfig.
- **Category**: groups questions within a bank.
- **Question**: belongs to bank + category. Types: mcq / true_false / open. Difficulties: easy / medium / hard.
- **TestConfig**: JSONB value type — specifies per-difficulty counts + optional filters (category, type, tags). Stored as `banks.default_config` and snapshotted into `tests.config` at generation time.
- **Test**: generated from one bank using a TestConfig. Contains ordered questions.
- **TestSession**: a run-through of a test. Stores answers and score.

## Coding Rules
- No unused dependencies — add packages only when needed
- No speculative abstractions; implement what the current feature requires
- Validate only at system boundaries (Gin handlers)
- Keep handlers thin: bind → call service → respond
- Unit of Work wraps any operation that touches multiple tables
