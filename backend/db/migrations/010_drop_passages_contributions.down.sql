CREATE TABLE passages (
    id          SERIAL      PRIMARY KEY,
    bank_id     INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    category_id INTEGER     NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    title       TEXT        NOT NULL,
    difficulty  TEXT        NOT NULL,
    paragraphs  JSONB       NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_passages_bank       ON passages(bank_id);
CREATE INDEX idx_passages_category   ON passages(category_id);
CREATE INDEX idx_passages_difficulty ON passages(difficulty);

ALTER TABLE question_groups ADD COLUMN passage_id INTEGER REFERENCES passages(id) ON DELETE CASCADE;
CREATE INDEX idx_question_groups_passage ON question_groups(passage_id);

CREATE TABLE contributions (
    id             SERIAL      PRIMARY KEY,
    bank_id        INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    contributor_id INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payload        JSONB       NOT NULL,
    status         TEXT        NOT NULL DEFAULT 'pending',
    question_id    INTEGER     REFERENCES questions(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);
CREATE INDEX idx_contributions_bank_status ON contributions(bank_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contributions_contributor ON contributions(contributor_id) WHERE deleted_at IS NULL;

CREATE TABLE contribution_events (
    id              SERIAL      PRIMARY KEY,
    contribution_id INTEGER     NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
    actor_id        INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event           TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_contribution_events_contribution ON contribution_events(contribution_id) WHERE deleted_at IS NULL;

CREATE TABLE contribution_comments (
    id              SERIAL      PRIMARY KEY,
    contribution_id INTEGER     NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
    author_id       INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body            TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_contribution_comments_contribution ON contribution_comments(contribution_id) WHERE deleted_at IS NULL;
