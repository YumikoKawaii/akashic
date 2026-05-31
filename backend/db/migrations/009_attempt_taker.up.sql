-- Tests are now bank-wide visible, so any member can take any test. Record who
-- took each attempt. Backfill existing attempts to their test's creator (the
-- only person who could take a test under the old creator-scoped model).
ALTER TABLE test_attempts ADD COLUMN user_id INTEGER REFERENCES users(id);

UPDATE test_attempts a
    SET user_id = t.created_by
    FROM tests t
    WHERE t.id = a.test_id AND a.user_id IS NULL;

CREATE INDEX idx_test_attempts_user ON test_attempts(user_id) WHERE deleted_at IS NULL;
