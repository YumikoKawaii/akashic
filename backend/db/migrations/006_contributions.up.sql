-- Contributions: a viewer (member or public visitor) proposes a new question to
-- a bank. Editors review (1-n rounds); on approval the contributor merges, which
-- creates the question. Pending content lives here, never in the live questions
-- tables, so reads can't leak un-reviewed submissions.
CREATE TABLE contributions (
    id                 SERIAL      PRIMARY KEY,
    bank_id            INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    contributor_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payload            JSONB       NOT NULL,                  -- proposed question snapshot
    status             TEXT        NOT NULL DEFAULT 'pending', -- pending|changes_requested|approved|rejected|merged
    merged_question_id INTEGER     REFERENCES questions(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at         TIMESTAMPTZ
);
CREATE INDEX idx_contributions_bank_status  ON contributions(bank_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contributions_contributor  ON contributions(contributor_id) WHERE deleted_at IS NULL;

-- One row per review round (1-n). approve/reject are terminal decisions;
-- request_changes bounces the contribution back to the contributor to revise.
-- approve does NOT create a question — the contributor merges.
CREATE TABLE contribution_reviews (
    id              SERIAL      PRIMARY KEY,
    contribution_id INTEGER     NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
    reviewer_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision        TEXT        NOT NULL,                    -- approve|reject|request_changes
    note            TEXT        NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_contribution_reviews_contribution ON contribution_reviews(contribution_id) WHERE deleted_at IS NULL;
