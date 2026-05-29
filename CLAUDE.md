# Akashic — CLAUDE.md

## Project Overview
Akashic is a personal test/quiz management system. Users maintain multiple question archives (e.g. English, Japanese) and generate tests from them. Go backend + React SPA, both speaking Connect RPC natively over a shared protobuf schema.

## Repository Structure
```
akashic/
├── backend/          # Go Connect RPC server
├── frontend/         # React + TypeScript SPA (Connect web client)
├── proto/            # Source of truth: protobuf service + message defs
├── buf.gen.yaml      # Codegen config (Go + TS, run via `buf generate`)
├── docker-compose.yml
└── CLAUDE.md
```

## Transport / RPC
- Single contract: `proto/akashic/v1/*.proto`. Regenerate after any change with `buf generate`.
- Go code generates to `backend/gen/`; TypeScript to `frontend/src/gen/`. Both are committed; never hand-edit generated files.
- Backend serves Connect over h2c (no plain-HTTP/REST endpoints). Procedures are mounted at the proto package root: `/akashic.v1.<Service>/<Method>`.
- Auth: JWT Bearer token in `Authorization` header, validated by a Connect unary interceptor (`internal/rpchandler/interceptor.go`). The frontend stores the token in `localStorage` and attaches it via a transport interceptor (`frontend/src/api/connect.ts`).
- Google OAuth is client-initiated: SPA calls `GetGoogleAuthURL`, redirects to Google, then the `/auth/callback` page calls `ExchangeGoogleCode` to receive the JWT. `GetGoogleAuthURL` + `ExchangeGoogleCode` are the only unauthenticated procedures (skipped in the interceptor).
- `GOOGLE_CALLBACK_URL` is the frontend callback page (`<origin>/auth/callback`), and must match both the SPA's exchange `redirect_uri` and the Google Console authorized redirect URI exactly.
- Frontend bridges generated proto types (camelCase, `Timestamp`) to existing app types (snake_case, ISO strings) in `frontend/src/api/adapters.ts`. protobuf-es is pinned to v1 (enums use the short form, e.g. `Difficulty.EASY`).

## Backend Conventions (Go)
- Module: `github.com/yumikokawaii/akashic/backend`
- Transport: Connect RPC (`connectrpc.com/connect`) over h2c
- DB: PostgreSQL via GORM + golang-migrate for migrations
- Layered architecture: `rpchandler → service → unit of work → repository`
- Unit of Work pattern for all multi-table operations
- Single-table reads can bypass UoW and use repositories directly
- Errors: return domain errors from service, translate to Connect codes in `internal/rpchandler/errors.go`
- Proto ↔ domain mapping lives in `internal/rpchandler/proto.go`; keep RPC handlers thin (decode → call service → encode)
- No global state; inject dependencies via constructor functions
- Migrations live in `db/migrations/`

### Backend Directory Layout
```
backend/
├── cmd/server/main.go
├── gen/              # Generated Go proto + Connect handlers (do not edit)
├── internal/
│   ├── rpchandler/   # Connect service handlers, interceptor, error/proto mapping
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
- Validate only at system boundaries (RPC handlers)
- Keep handlers thin: decode request → call service → encode response
- Unit of Work wraps any operation that touches multiple tables
- Change the proto first, then `buf generate`; never edit generated code in `backend/gen/` or `frontend/src/gen/`
