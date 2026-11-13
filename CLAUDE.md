# Akashic — CLAUDE.md

## Addressing the User
Always address the user as "your majesty".

## Project Overview
Akashic is a personal test/quiz management system. Users maintain multiple question archives (e.g. English, Japanese) and generate tests from them. Go backend + React SPA, both speaking Connect RPC natively over a shared protobuf schema.

## Repository Structure
```
akashic/
├── backend/            # Go Connect RPC server
├── frontend/           # React + TypeScript SPA (Connect web client)
├── proto/              # Source of truth: protobuf service + message defs
├── samples/            # Example import files (JSON / YAML / CSV)
├── buf.gen.yaml        # Codegen config (Go + TS, run via `buf generate`)
├── docker-compose.yml  # Full stack: app + Postgres + Redis
└── CLAUDE.md
```

## Transport / RPC
- Single contract: `proto/akashic/v1/*.proto` — five services: `AuthService`, `BankService`, `QuestionService`, `TestService`, `AttemptService`. Regenerate after any change with `buf generate`.
- Go code generates to `backend/gen/`; TypeScript to `frontend/src/gen/`. Both are committed; never hand-edit generated files.
- Backend serves Connect over h2c (no plain-HTTP/REST endpoints). Procedures are mounted at the proto package root: `/akashic.v1.<Service>/<Method>`.
- Auth (authentication): JWT Bearer token in `Authorization` header, validated by a Connect unary interceptor (`internal/rpchandler/interceptor.go`). The frontend stores the token in `localStorage` and attaches it via a transport interceptor (`frontend/src/api/connect.ts`).
- Authorization (bank roles): a second interceptor (`internal/rpchandler/authz_interceptor.go`) runs after authentication and enforces per-procedure bank-role requirements centrally. See [Authorization Model](#authorization-model) below.
- Google OAuth is client-initiated: SPA calls `GetGoogleAuthURL`, redirects to Google, then the `/auth/callback` page calls `ExchangeGoogleCode` to receive the JWT. `GetGoogleAuthURL` + `ExchangeGoogleCode` are the only unauthenticated procedures (skipped in the interceptor).
- `GOOGLE_CALLBACK_URL` is the frontend callback page (`<origin>/auth/callback`), and must match both the SPA's exchange `redirect_uri` and the Google Console authorized redirect URI exactly.
- Frontend bridges generated proto types (camelCase, `Timestamp`) to app types (snake_case, ISO strings) in `frontend/src/api/adapters.ts`, which also owns `toProtoConfig` (app `TestConfig` → proto). protobuf-es is pinned to v1 (enums use the short form, e.g. `Difficulty.EASY`).

## Authorization Model
All banks are private unless made public: a user reaches a bank's data only through a membership. Roles are ordered `viewer < editor < owner` (`internal/membership`). Ownership is also mirrored on `banks.owner_id`, but **authorization reads the `bank_members` row, not `owner_id`** (owner_id is currently decorative).

- **Single enforcement point.** The `MembershipAuthorizer` interceptor is the *only* place bank roles are checked. Handlers stay thin and services assume the caller is already authorized — do not re-add role checks in the service layer.
- **Every bank-scoped request carries `bank_id`.** The interceptor reads it generically via the `GetBankId() int32` getter. When adding a bank-scoped RPC, the request message MUST include `int32 bank_id`, and the procedure MUST be registered in `procedureMinRole` with its minimum role. A bank-scoped request whose procedure is unregistered is **denied** (fail-closed).
- **Role floors** (`procedureMinRole`):
  - `viewer` — `GetBank`, `ListBankMembers`, question reads (`ListQuestions`, `GetQuestion`, `ListTags`), every `TestService` RPC (including `GenerateTest`, `DeleteTest`, `RestoreTest`), and every `AttemptService` RPC.
  - `editor` — `UpdateBank`, `UpdateBankDefaultConfig`, and question mutations (`Create`/`Update`/`Delete`/`Restore`/`IngestQuestions`).
  - `owner` — `DeleteBank`, `RestoreBank`, `SetBankVisibility`, and membership management (`AddBankMember`/`RemoveBankMember`/`UpdateBankMemberRole`).
- **Test delete/restore** pass the interceptor at `viewer`; the service then allows only the test's **creator or an editor+** (the caller's role comes from `roleFromContext`, stashed by the interceptor).
- **Entity↔bank binding still belongs to services.** The interceptor authorizes the *bank*; services must verify the target entity actually belongs to that `bank_id` (e.g. `attempt.Test.BankID == bankID`) so a member of bank A cannot reach bank B's entity by passing A's id.
- **Role cache + dual-write.** Roles are served from a `membership.RoleCache` (no DB hit on the hot path), warmed at startup (`warmupMembershipCache` in `cmd/server/main.go`) and kept current by dual-writes in `BankService` on every membership change. On a miss the interceptor reads through to the DB and repopulates. **Redis is primary** (`NewRedisRoleCache`, 24h TTL) and an **in-memory map is the fallback** (`NewMemRoleCache`) when Redis is down. Any Redis error degrades to a cache miss → DB read-through, so authorization stays correct (just slower).

## Backend Conventions (Go)
- Module: `github.com/yumikokawaii/akashic/backend`
- Transport: Connect RPC (`connectrpc.com/connect`) over h2c
- DB: PostgreSQL via GORM + golang-migrate for migrations (run at startup from `db/migrations/`, schema from `DB_SCHEMA`, default `akashic`)
- Layered architecture: `rpchandler → service → unit of work → repository`
- Unit of Work: `uow.UnitOfWork` is an **interface** with two methods. `Store() *uow.Store` returns repositories bound to the base connection (non-transactional) — use for reads and single-table writes. `Do(ctx, func(tx *uow.Store) error)` runs the closure in one transaction, committing on `nil` and rolling back on error or panic; the `tx *uow.Store` it passes is bound to that transaction. Keep non-transactional side effects (cache writes, the post-commit re-read) **after** `Do` returns. Do NOT hand-manage `Begin/Commit/Rollback`.
- `QuestionService`, `IngestService` and `TestService` depend on `uow.UnitOfWork` plus the `GenerateCache`, and reach every repository through the unit of work. Single-table services (`AttemptService`, `BankService`, `AuthService`) inject the specific repositories they need.
- Errors: return domain errors from service, translate to Connect codes in `internal/rpchandler/errors.go`
- Proto ↔ domain mapping lives in `internal/rpchandler/proto.go`; keep RPC handlers thin (decode → call service → encode)
- No global state; inject dependencies via constructor functions

### Backend Directory Layout
```
backend/
├── cmd/server/         # main.go (wiring, migrations, cache warmup) + static.go (SPA serving)
├── gen/                # Generated Go proto + Connect handlers (do not edit)
├── internal/
│   ├── rpchandler/     # Connect handlers, auth + authz interceptors, error/proto mapping
│   ├── service/        # Business logic, GenerateCache, pool selection
│   ├── repository/     # GORM repositories (user, bank, member, question, group, test, attempt)
│   ├── uow/            # Unit of Work
│   ├── membership/     # Bank-role vocabulary + role/visibility caches (Redis primary, in-memory fallback)
│   ├── model/          # GORM models + domain types
│   └── config/         # Env config
├── db/migrations/
└── Makefile
```

## Key Domain Concepts
- **Bank**: top-level question bank (e.g. "English", "Japanese"). Holds questions, groups, and a default `TestConfig`. **Displayed in the UI as a "Record"** — display-text only; all code/proto/routes/identifiers stay `bank`. Public banks are discoverable on the **community home** (`/`, `HomePage`) via `ListPublicBanks` — authenticated, **not** bank-scoped, backed by `bankRepo.FindPublicPaged`. The home shows them in a coverflow (`PublicRecordCarousel`).
- **Question**: belongs to a bank. Nine types: `mcq`, `tf_ng`, `yn_ng`, `short_answer`, `sentence_completion`, `form_completion`, `matching_headings`, `matching_information`, `matching_features`. Difficulties: easy / medium / hard. Free-form `tags`. Content is a oneof: `choice` (MCQ: content, options, answers) or `item` (content + answer). A question may belong to a group (`group_id` + `position`).
- **QuestionGroup**: a set of questions sharing context — `title`, `difficulty`, `tags`, and a JSONB `content` of `instructions`, `passage` (plain text, paragraphs split by blank lines) and `options` (the shared list for matching types). There is **no RPC to create or edit groups**, and `IngestQuestions` only creates standalone questions; groups reach the client only embedded in `Test.groups`.
- **TestConfig**: JSONB value type — per-difficulty counts (question counts, not units), optional `types` and `tags` filters, and `group_mode`: mixed (default) / `standalone` / `groups`. Stored as `banks.default_config` and snapshotted into `tests.config`.
- **Generation** (`service/pool.go`, `service/generate_cache.go`): the bank's questions are cached as **pool units** — a standalone question, or a whole group. Units are filtered by `group_mode`, types (every type in the unit must match) and tags (unit must carry all), then bucketed by difficulty. Each bucket is filled up to its count, never splitting a group and skipping any unit bigger than what's left; shortfalls backfill from neighbouring difficulties. Questions from the user's last 3 generated tests in the bank (`UserCooldownAttempts`; history in `GenerateCache`, 90-day TTL) are picked only after fresh ones. Redis has no persistence, so a Redis restart clears that history. Full walkthrough: `technical_design.md`.
- **Test**: generated from one bank. Stores its questions as an ordered `question_ids` array; questions and their groups are hydrated on read (`Test.questions`, `Test.groups`). Records its generator (`created_by` + `Creator`). Tests are **bank-wide shared** — every viewer sees and can take every test.
- **TestAttempt**: a run-through of a test. Stores answers (autosaved via `SaveAttemptProgress`), score, and the **taker** (`user_id` + `Taker`). Anyone may take any test; only the taker may submit their own attempt, but the attempt history (`ListAttemptsByTest`) is shared.

## Frontend Conventions
- Look: the **Lab Notebook** theme (Kurisu palette) — lab red `#A3222D`, rose `#F6D9DC`/`#FBECEE`, ink `#2B1D1F`, warm white `#F3ECE8`; easy/medium/hard = teal `#1F7A72` / orange `#B85A0A` / red. All tokens live on `:root` in `frontend/src/index.css`; use the variables, not raw hexes.
- Type: Newsreader for headings, IBM Plex Sans for text, IBM Plex Mono only for numbers, IDs and type tags — self-hosted via `@fontsource` in `main.tsx`. No spaced-out uppercase labels and no decorative glyphs (✦ ◈ …).
- Shared pieces: `OrnatePanel` (plain card), `OrnateDivider` (hairline), `Spinner`, `Tag`, `Select`/`MultiSelect`, `FormField`. Icons are inline stroke SVGs; the flask is the brand mark (`public/favicon/favicon.svg`).
- Server data goes through TanStack Query hooks in `src/hooks/`; RPC clients come from `src/api/connect.ts`.

## Infrastructure / Deploy
- `docker-compose.yml` runs the whole stack: `app` (bound to `127.0.0.1:${SERVER_PORT}`), `postgres` (postgres:16-alpine, tuned for a small disk: `max_wal_size=256MB`, lz4 WAL + TOAST compression, frequent autovacuum, `shared_buffers=64MB`; an inline init config creates the `DB_SCHEMA` schema), and `redis` (redis:7-alpine, cache-only: no persistence, 64MB, `allkeys-lru`). The app always reaches them as `postgres` / `redis`; `.env` supplies credentials, `JWT_SECRET` and the Google settings.
- Production: `akashic.io.vn` → nginx (TLS) → `127.0.0.1:9009` on the server; the compose project lives in `~/akashic` with its `.env` there.
- Pushing to `master` runs `.github/workflows/docker.yml`: build the image, copy it and `docker-compose.yml` to the server, `docker compose up -d`.

## Coding Rules
- No unused dependencies — add packages only when needed
- No speculative abstractions; implement what the current feature requires
- Validate only at system boundaries (RPC handlers)
- Keep handlers thin: decode request → call service → encode response
- Unit of Work wraps any operation that touches multiple tables
- Change the proto first, then `buf generate`; never edit generated code in `backend/gen/` or `frontend/src/gen/`
- Follow OOP best practices, adapted to Go — Go is not Java, so don't force the classical principles (deep inheritance, ceremony, interface-everything). Favor the Go-idiomatic expression of the good ideas: encapsulation via unexported fields + constructor functions, composition over inheritance (struct embedding), program to small interfaces defined at the consumer, depend on abstractions via constructor injection (no global state), and keep types cohesive with a single clear responsibility. Skip the dogma, keep the substance.
