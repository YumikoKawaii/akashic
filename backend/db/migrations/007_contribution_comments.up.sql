-- Free-form discussion on a contribution (no decision), separate from
-- contribution_reviews. Any viewer with access to the bank may post; the
-- contributor uses it to defend or clarify a proposal.
CREATE TABLE contribution_comments (
    id              SERIAL      PRIMARY KEY,
    contribution_id INTEGER     NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
    author_id       INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body            TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_contribution_comments_contribution ON contribution_comments(contribution_id) WHERE deleted_at IS NULL;
