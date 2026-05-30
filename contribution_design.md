# Akashic — Community Contributions (Phase 1: Question Proposals)

> Design draft. Builds on the public-bank model (`public_bank_design.md`). This
> phase adds **contributions**: a public visitor (or any viewer) proposes a new
> question to a bank; an **editor+** reviews and accepts it into the bank.
> Discovery/Explore (Phase 2 of public banks) remains deferred — contributions
> work against banks reached by direct link today.

---

## 1. Goal & Scope

Public banks today grant any authenticated user **viewer** access (read content,
generate/take their own tests) but no way to give back. Contributions let a
viewer **propose a new question**; the bank's editors/owners review it.

### Locked decisions
- **Scope (v1):** propose a **new standalone question** only. Edits/deletes of
  existing questions, and group/passage proposals, are **deferred**.
- **Reviewer:** **editor+** (consistent with the `content mutations → editor`
  floor; accepting a contribution *creates a question*, which editors already do).
- **Multiple review rounds:** a contribution can be reviewed more than once. A
  reviewer may **request changes**; the contributor **revises** and resubmits;
  a reviewer looks again. Reviews are therefore a **1-n** child of a
  contribution, not flattened onto it.
- **Approve ≠ merge.** A reviewer (editor+) **approves**, but only the
  **contributor merges** — landing the approved question into the bank. Approval
  authorizes the *content*; the contributor decides *when* to land it. This is
  the GitHub model and gives merge a clean safety property (see §5).
- **Discovery:** still deferred — no Explore list. Contributions target a bank
  the contributor already reached (direct link / public).

### Deferred
- Edit/delete proposals (PR-style diffs against existing questions).
- Group/passage contributions.
- **Per-round payload snapshots** — v1 edits the payload *in place* on revise, so
  the review history shows decisions + notes but not a versioned diff of the
  question across rounds.
- Notifications, contributor reputation, comment threads on a proposal.

---

## 2. Guiding principle — reuse the authorization seam

Like public banks, contributions layer onto the single enforcement point
(`MembershipAuthorizer`). Every contribution RPC carries `bank_id` and is
registered in `procedureMinRole`. Because **`SubmitContribution` is a viewer-floor
procedure**, the existing public-viewer grant (`public_bank_design.md` §5.2)
already lets public visitors submit — *no contribution-specific public branch*.
This mirrors how `GenerateTest` became a viewer capability.

---

## 3. Data Model

A **snapshot proposal queue** with a **1-n review history**. Pending content lives
entirely outside the live `questions` tables, so no `List/GetQuestions` query
needs a status filter and the "viewer reads all content" grant can never leak
un-reviewed submissions.

```sql
CREATE TABLE contributions (
    id                   SERIAL PRIMARY KEY,
    bank_id              INTEGER NOT NULL REFERENCES banks(id),
    contributor_id       INTEGER NOT NULL REFERENCES users(id),
    payload              JSONB   NOT NULL,                  -- proposed question snapshot
    status               TEXT    NOT NULL DEFAULT 'pending', -- pending|changes_requested|approved|rejected|merged
    question_id          INTEGER REFERENCES questions(id),  -- the question created on merge
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ
);

-- One row per review round (1-n). approve / reject are terminal; request_changes
-- bounces the contribution back to the contributor to revise.
CREATE TABLE contribution_reviews (
    id              SERIAL PRIMARY KEY,
    contribution_id INTEGER NOT NULL REFERENCES contributions(id),
    reviewer_id     INTEGER NOT NULL REFERENCES users(id),
    decision        TEXT    NOT NULL,                       -- approve|reject|request_changes
                                                            -- (approve does NOT merge; contributor merges)
    note            TEXT    NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_contributions_bank_status
    ON contributions (bank_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contributions_contributor
    ON contributions (contributor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contribution_reviews_contribution
    ON contribution_reviews (contribution_id) WHERE deleted_at IS NULL;
```

- `status` / `decision` validated in the app layer (no DB `CHECK`), consistent
  with `bank_members.role` / `banks.visibility`.
- `status` is the **materialized current state** (derived from the latest review
  + revisions) so the review queue filters cheaply without aggregating reviews.
- **Withdraw = soft delete** (`deleted_at`), per the project's soft-delete rule.
- `payload` JSONB mirrors `CreateQuestionInput` (category, type, difficulty,
  tags, content/answer/options/answers) — same approach as `TestConfig`.

Model (`internal/model/models.go`):

```go
type Contribution struct {
    ID                 int                  `gorm:"primaryKey;autoIncrement"`
    BankID             int                  `gorm:"not null;index"`
    ContributorID      int                  `gorm:"not null;index"`
    Contributor        *User                `gorm:"foreignKey:ContributorID"`
    Payload            ContributionPayload  `gorm:"serializer:json"`
    Status             string               `gorm:"not null;default:'pending'"`
    QuestionID         *int                 // the question created on merge
    Reviews            []ContributionReview `gorm:"foreignKey:ContributionID"` // 1-n history
    CreatedAt          time.Time
    UpdatedAt          time.Time
    DeletedAt          gorm.DeletedAt       `gorm:"index"`
}

type ContributionReview struct {
    ID             int            `gorm:"primaryKey;autoIncrement"`
    ContributionID int            `gorm:"not null;index"`
    ReviewerID     int            `gorm:"not null"`
    Reviewer       *User          `gorm:"foreignKey:ReviewerID"`
    Decision       string         `gorm:"not null"`
    Note           string         `gorm:"not null;default:''"`
    CreatedAt      time.Time
    DeletedAt      gorm.DeletedAt `gorm:"index"`
}

// ContributionPayload is the proposed new question (mirrors CreateQuestionInput).
type ContributionPayload struct {
    CategoryID int         `json:"category_id"`
    Type       string      `json:"type"`
    Difficulty string      `json:"difficulty"`
    Tags       []string    `json:"tags"`
    Content    string      `json:"content"`
    Answer     string      `json:"answer,omitempty"`  // non-mcq
    Options    []MCQOption `json:"options,omitempty"` // mcq
    Answers    []string    `json:"answers,omitempty"` // mcq
}

const (
    ContributionPending          = "pending"
    ContributionChangesRequested = "changes_requested"
    ContributionApproved         = "approved"  // ≥1 approve, awaiting contributor merge
    ContributionRejected         = "rejected"  // terminal
    ContributionMerged           = "merged"    // terminal — question created

    ReviewApprove        = "approve"
    ReviewReject         = "reject"
    ReviewRequestChanges = "request_changes"
)
```

---

## 4. Proto Changes

New `proto/akashic/v1/contribution.proto` (one service per file, per repo
convention). Regenerate with `buf generate`.

```proto
service ContributionService {
  rpc SubmitContribution   (SubmitContributionRequest)   returns (SubmitContributionResponse);
  rpc UpdateContribution   (UpdateContributionRequest)   returns (UpdateContributionResponse);  // contributor revises
  rpc ListMyContributions  (ListMyContributionsRequest)  returns (ListMyContributionsResponse);
  rpc WithdrawContribution (WithdrawContributionRequest) returns (WithdrawContributionResponse);
  rpc MergeContribution    (MergeContributionRequest)    returns (MergeContributionResponse);    // contributor lands an approved one
  rpc ListContributions    (ListContributionsRequest)    returns (ListContributionsResponse);
  rpc ReviewContribution   (ReviewContributionRequest)   returns (ReviewContributionResponse);   // adds a review round
}

enum ContributionStatus {
  CONTRIBUTION_STATUS_UNSPECIFIED       = 0;
  CONTRIBUTION_STATUS_PENDING           = 1;
  CONTRIBUTION_STATUS_CHANGES_REQUESTED = 2;
  CONTRIBUTION_STATUS_APPROVED          = 3;  // ≥1 approve, awaiting contributor merge
  CONTRIBUTION_STATUS_REJECTED          = 4;  // terminal
  CONTRIBUTION_STATUS_MERGED            = 5;  // terminal — question created
}

enum ReviewDecision {
  REVIEW_DECISION_UNSPECIFIED     = 0;
  REVIEW_DECISION_APPROVE         = 1;  // → approved (does NOT create a question; contributor merges)
  REVIEW_DECISION_REJECT          = 2;  // → rejected (terminal)
  REVIEW_DECISION_REQUEST_CHANGES = 3;  // → changes_requested (bounces back to contributor)
}

// Proposed new question — mirrors CreateQuestionRequest content.
message ProposedQuestion {
  int32           category_id = 1;
  QuestionType    type = 2;
  Difficulty      difficulty = 3;
  repeated string tags = 4;
  oneof content {
    QuestionItem   item = 5;
    MultipleChoice choice = 6;
  }
}

message ContributionReview {
  int32                     id = 1;
  int32                     reviewer_id = 2;
  ReviewDecision            decision = 3;
  string                    note = 4;
  google.protobuf.Timestamp created_at = 5;
  optional User             reviewer = 6;
}

message Contribution {
  int32                       id = 1;
  int32                       bank_id = 2;
  int32                       contributor_id = 3;
  ProposedQuestion            proposed = 4;
  ContributionStatus          status = 5;
  optional int32              question_id = 6;          // the question created on merge
  repeated ContributionReview reviews = 7;              // 1-n history, oldest→newest
  google.protobuf.Timestamp   created_at = 8;
  google.protobuf.Timestamp   updated_at = 9;
  optional User               contributor = 10;
}

message SubmitContributionRequest  { int32 bank_id = 1; ProposedQuestion proposed = 2; }
message SubmitContributionResponse { Contribution contribution = 1; }

// Contributor revises a pending/changes_requested contribution → reopens to pending.
message UpdateContributionRequest  { int32 bank_id = 1; int32 id = 2; ProposedQuestion proposed = 3; }
message UpdateContributionResponse { Contribution contribution = 1; }

message ListMyContributionsRequest  { int32 bank_id = 1; }  // caller's own, this bank
message ListMyContributionsResponse { repeated Contribution contributions = 1; }

message WithdrawContributionRequest  { int32 bank_id = 1; int32 id = 2; }
message WithdrawContributionResponse {}

// Contributor-only; allowed only when status == approved. Creates the question.
message MergeContributionRequest  { int32 bank_id = 1; int32 id = 2; }
message MergeContributionResponse { Contribution contribution = 1; }

message ListContributionsRequest  { int32 bank_id = 1; ContributionStatus status = 2; } // status optional filter
message ListContributionsResponse { repeated Contribution contributions = 1; }

// Adds one review round. APPROVE moves to approved (no question yet — contributor
// merges); REQUEST_CHANGES reopens for revision; REJECT is terminal.
message ReviewContributionRequest {
  int32          bank_id = 1;
  int32          id = 2;
  ReviewDecision decision = 3;
  string         note = 4;
}
message ReviewContributionResponse { Contribution contribution = 1; }
```

Proto ↔ domain mapping lives in `internal/rpchandler/proto.go`.

---

## 5. Authorization

Register in `procedureMinRole` (`authz_interceptor.go`). Every request carries
`bank_id`; an unregistered bank-scoped procedure fails closed.

| Procedure | Floor | Rationale |
|---|---|---|
| `SubmitContribution`   | **viewer** | public visitors may propose (grant covers it) |
| `UpdateContribution`   | **viewer** | contributor revises own non-terminal contribution |
| `ListMyContributions`  | **viewer** | caller's own submissions + review history |
| `WithdrawContribution` | **viewer** | own non-terminal only (service ownership check) |
| `MergeContribution`    | **viewer** | contributor lands an *approved* contribution (see safety note) |
| `ListContributions`    | **editor** | the review queue |
| `ReviewContribution`   | **editor** | approve/reject/request_changes (editor capability) |

No public-specific branch — viewer-floor procedures inherit the §5.2 grant.

> **Safety note — merge is viewer-floor but creates content.** `MergeContribution`
> is performed by the contributor, who may hold only an *implicit viewer* grant,
> yet it creates a `Question` (normally editor-only). This is safe because the
> service gates merge on `status == approved`, and `approved` is reachable **only**
> via an editor's `ReviewContribution` (editor-floor). The editor approval *is* the
> content authorization; the merge just lands it. `UpdateContribution` resets
> `approved → pending` (dismissing the stale approval), so a contributor can never
> merge a payload an editor didn't approve. The role floor authorizes *who can act
> on the bank*; the `status==approved` gate authorizes *what gets created*.

---

## 6. Service / Handler Flow

A contribution is **non-terminal** while `status ∈ {pending, changes_requested,
approved}` and **terminal** once `rejected`/`merged`.

```
SubmitContribution (viewer)               single table → repo directly
  validate payload: category∈bank, type/difficulty valid, content matches type
  persist Contribution{status:pending, contributor_id: caller}

UpdateContribution (viewer)               contributor revises (in place)
  find; verify BankID==bankID && contributor==caller && non-terminal
  validate payload; overwrite payload; status → pending   (dismisses any approval)

ListMyContributions (viewer)              repo.FindByBankAndContributor(bankID, caller), reviews preloaded
WithdrawContribution (viewer)             find; verify BankID==bankID && contributor==caller
                                          && non-terminal; soft delete

MergeContribution (viewer)                UoW (questions + contributions)
  find; verify BankID==bankID && contributor==caller && status==approved
  create Question from payload (reuse CreateQuestion logic)
  set question_id, status=merged

ListContributions (editor)                repo.FindByBank(bankID, statusFilter), reviews preloaded
ReviewContribution (editor)               UoW (contribution_reviews + contributions)
  find; verify BankID==bankID && status is non-terminal
  append ContributionReview{reviewer_id: caller, decision, note}
  approve         → status=approved
  reject          → status=rejected
  request_changes → status=changes_requested
```

**Entity↔bank binding** stays in the service: verify `contribution.BankID ==
bankID` (a member of bank A can't review/withdraw bank B's contribution by
passing A's id). **Creator binding**: update/withdraw/**merge** require
`contributor_id == caller`. A terminal contribution rejects further
review/revision/withdraw/merge.

Both `MergeContribution` (question + contribution) and `ReviewContribution`
(review row + contribution status) write more than one table, so each runs in a
**Unit of Work** per the project's multi-table rule.

---

## 7. Files to Touch (Phase 1)

| Area | Change |
|---|---|
| `db/migrations/` | `contributions` + `contribution_reviews` tables + partial indexes |
| `internal/model/models.go` | `Contribution`, `ContributionReview`, `ContributionPayload`, status/decision consts |
| `proto/akashic/v1/contribution.proto` | new service/messages → `buf generate` |
| `internal/repository/contribution.go` | `Create`, `FindByID` (reviews preloaded), `FindByBankAndContributor`, `FindByBank`, `Save`, `AddReview`, soft `Delete` |
| `internal/uow/` | add `Contributions` + `Questions` to the tx; **merge** path: create question + update contribution in one tx |
| `internal/service/contribution.go` | submit/update/list/withdraw/**merge**/review + payload validation + bindings + status transitions |
| `internal/rpchandler/contribution.go` + `proto.go` | handler + enum/message mapping (incl. `ContributionReview`, `ReviewDecision`) |
| `internal/rpchandler/authz_interceptor.go` | register 7 procedures |
| `cmd/server/main.go` | wire repo/service/handler; mount on the Connect mux |
| `frontend/` | proto regen + adapters; "Suggest a question" form (viewer), "Contributions" review tab (editor+) with approve/reject/request-changes, "My contributions" view showing review history + revise + **Merge** button (enabled when approved) |
| docs | CLAUDE.md: contribution model + new viewer/editor procedures |

---

## 8. Verification

- Migration up/down; `buf generate` clean; `go build/vet/test ./...`; `tsc --noEmit`.
- Unit: payload validation; `ReviewContribution` approve → status `approved` +
  appends a review but creates **no** question; `MergeContribution` by the
  contributor on an `approved` one creates the bank-bound question + status
  `merged`; merge is **denied** unless `status==approved && caller==contributor`;
  `UpdateContribution` on an approved one resets to `pending` (stale approval
  dismissed) so merge is then denied; reject is terminal; request_changes →
  revise → re-review → approve → merge (multi-round); terminal contributions
  reject further review/revise/withdraw/merge; withdraw soft-deletes own
  non-terminal only; bank-binding rejects cross-bank ids.
- Manual: from a second account, open a public bank by link → "Suggest a
  question" → submit; as owner see it in the review queue → **request changes**
  with a note; contributor sees the note, revises, resubmits; owner **approves**
  (question not yet in bank); contributor clicks **Merge** → it appears in the
  bank's questions; reject another → contributor sees status; withdraw a pending one.
