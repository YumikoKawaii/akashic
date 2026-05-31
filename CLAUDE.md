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
- Auth (authentication): JWT Bearer token in `Authorization` header, validated by a Connect unary interceptor (`internal/rpchandler/interceptor.go`). The frontend stores the token in `localStorage` and attaches it via a transport interceptor (`frontend/src/api/connect.ts`).
- Authorization (bank roles): a second interceptor (`internal/rpchandler/authz_interceptor.go`) runs after authentication and enforces per-procedure bank-role requirements centrally — handlers and services do NOT re-check roles. See [Authorization Model](#authorization-model) below.
- Google OAuth is client-initiated: SPA calls `GetGoogleAuthURL`, redirects to Google, then the `/auth/callback` page calls `ExchangeGoogleCode` to receive the JWT. `GetGoogleAuthURL` + `ExchangeGoogleCode` are the only unauthenticated procedures (skipped in the interceptor).
- `GOOGLE_CALLBACK_URL` is the frontend callback page (`<origin>/auth/callback`), and must match both the SPA's exchange `redirect_uri` and the Google Console authorized redirect URI exactly.
- Frontend bridges generated proto types (camelCase, `Timestamp`) to existing app types (snake_case, ISO strings) in `frontend/src/api/adapters.ts`. protobuf-es is pinned to v1 (enums use the short form, e.g. `Difficulty.EASY`).

## Authorization Model
All banks are private: a user reaches a bank's data only through a membership. Roles are ordered `viewer < editor < owner` (`internal/membership`). Ownership is also mirrored on `banks.owner_id`, but **authorization reads the `bank_members` row, not `owner_id`** (owner_id is currently decorative).

- **Single enforcement point.** The `MembershipAuthorizer` interceptor (`internal/rpchandler/authz_interceptor.go`) is the *only* place bank roles are checked. Handlers stay thin and services assume the caller is already authorized — do not re-add role checks in the service layer.
- **Every bank-scoped request carries `bank_id`.** The interceptor reads it generically via the `GetBankId() int32` getter. When adding a bank-scoped RPC, the request message MUST include `int32 bank_id`, and the procedure MUST be registered in `procedureMinRole` with its minimum role. A bank-scoped request whose procedure is unregistered is **denied** (fail-closed) — so forgetting to register a new procedure fails safe, it does not leak.
- **Role floors:** reads (`List*`/`Get*`, including attempts) → `viewer`; content mutations (`Create`/`Update`/`Delete`/`Restore`/`Ingest`/`GenerateTest`) and `UpdateBank*` → `editor`; bank deletion and all membership management (`AddBankMember`/`RemoveBankMember`/`UpdateBankMemberRole`/`DeleteBank`/`RestoreBank`) → `owner`.
- **Contributions** (`ContributionService`): a viewer (member or public visitor) proposes a new question; editors review it; once approved the **contributor merges**, which creates the question. **State machine** (`pending`/`changes_requested`/`approved`/`rejected`/`merged`/`withdrawn`/`closed`) lives in one place — `service.nextStatus(current, event)` — the single source of truth for which transition is legal; the rest of the layer only enforces *who* may invoke an event (interceptor floor + contributor ownership). Reviewer events `approve`/`reject`/`request_changes` (`ReviewContribution`, editor floor); contributor events `revise` (`UpdateContribution`), `merge` (`MergeContribution`), and `resubmit`/`withdraw`/`reopen`/`close` (`TransitionContribution`) — all viewer floor. Terminal: `merged`, `closed`; `rejected`/`withdrawn` are reopenable. Withdraw is a *status*, not a delete (the contribution stays visible). Floors: all contributor RPCs + `Submit`/`ListMyContributions` → `viewer`; `ListContributions`/`ReviewContribution` → `editor`. **State vs prose are separate.** Every transition is recorded in a **prose-free event log** (`contribution_events`, model `ContributionEvent`); reviews carry no note. Free-form discussion is a separate **comment** thread (`contribution_comments`); `AddContributionComment` → `viewer` (any member/visitor may join — the service only binds the comment to the bank). The frontend interleaves events + comments on one chronological timeline. **Merge is the deliberate exception** to "content creation is editor-only": it is viewer-floor (the contributor may be a public visitor) but creates a `Question` — safe because `nextStatus` only allows merge from `status == approved`, which only an editor's review can produce, and a `revise` resets `approved → pending` to dismiss a stale approval. The role floor authorizes *who acts on the bank*; the `approved` gate authorizes *what gets created*.
- **Entity↔bank binding still belongs to services.** The interceptor authorizes the *bank*; services must verify the target entity actually belongs to that `bank_id` (e.g. `attempt.Test.BankID == bankID`) so a member of bank A cannot reach bank B's entity by passing A's id.
- **Role cache + dual-write.** Roles are served from a `membership.RoleCache` (no DB hit on the hot path), warmed at startup (`warmupMembershipCache` in `cmd/server/main.go`) and kept current by dual-writes in `BankService` on every membership change (`Create`/`AddMember`/`UpdateMemberRole`/`RemoveMember`). On a miss the interceptor reads through to the DB and repopulates. Two backends mirror the `GenerateCache` pattern, selected by the startup Redis ping: **Redis is primary** (`NewRedisRoleCache`) — a shared store, so it also keeps multiple backend instances consistent with no extra invalidation, with a 24h TTL as a staleness backstop — and an **in-memory map is the fallback** (`NewMemRoleCache`) when Redis is down. Any Redis error degrades to a cache miss → DB read-through, so authorization stays correct (just slower) when Redis is degraded.

## Backend Conventions (Go)
- Module: `github.com/yumikokawaii/akashic/backend`
- Transport: Connect RPC (`connectrpc.com/connect`) over h2c
- DB: PostgreSQL via GORM + golang-migrate for migrations
- Layered architecture: `rpchandler → service → unit of work → repository`
- Unit of Work: `uow.UnitOfWork` is an **interface** with two methods. `Store() *uow.Store` returns repositories bound to the base connection (non-transactional) — use for reads and single-table writes. `Do(ctx, func(tx *uow.Store) error)` runs the closure in one transaction, committing on `nil` and rolling back on error or panic; the `tx *uow.Store` it passes is bound to that transaction. `uow.Store` is a struct of all repository interfaces. Keep non-transactional side effects (cache writes, the post-commit re-read) **after** `Do` returns — anything inside the closure is rolled back on failure. Do NOT hand-manage `Begin/Commit/Rollback`.
- Transactional services depend on `uow.UnitOfWork` alone and reach every repository through it (`s.uow.Store().Banks…` for reads, the `tx *uow.Store` inside `Do` for writes) rather than injecting individual repositories. Purely single-table services (category, passage, attempt, bank, auth) still inject the specific repository(ies) they need.
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
│   ├── rpchandler/   # Connect service handlers, auth + authz interceptors, error/proto mapping
│   ├── service/      # Business logic
│   ├── repository/   # GORM repositories
│   ├── uow/          # Unit of Work
│   ├── membership/   # Bank-role vocabulary + authz role cache (Redis primary, in-memory fallback)
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
- Follow OOP best practices, adapted to Go — Go is not Java, so don't force the classical principles (deep inheritance, ceremony, interface-everything). Favor the Go-idiomatic expression of the good ideas: encapsulation via unexported fields + constructor functions, composition over inheritance (struct embedding), program to small interfaces defined at the consumer, depend on abstractions via constructor injection (no global state), and keep types cohesive with a single clear responsibility. Skip the dogma, keep the substance.
