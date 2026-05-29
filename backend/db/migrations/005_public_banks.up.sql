-- Bank visibility: private (default) or public. Public banks grant implicit
-- viewer access to any authenticated user (enforced in the app layer).
ALTER TABLE banks ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private';

CREATE INDEX idx_banks_public
    ON banks (visibility)
    WHERE visibility = 'public' AND deleted_at IS NULL;

-- Tests become scoped to their creator so public visitors can generate their
-- own practice tests without flooding the owner's bank. Backfill existing tests
-- to their bank's owner.
ALTER TABLE tests ADD COLUMN created_by INTEGER REFERENCES users(id);

UPDATE tests t
    SET created_by = b.owner_id
    FROM banks b
    WHERE b.id = t.bank_id AND t.created_by IS NULL;

CREATE INDEX idx_tests_bank_creator
    ON tests (bank_id, created_by)
    WHERE deleted_at IS NULL;
