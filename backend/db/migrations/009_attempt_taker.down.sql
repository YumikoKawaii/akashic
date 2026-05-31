DROP INDEX IF EXISTS idx_test_attempts_user;
ALTER TABLE test_attempts DROP COLUMN IF EXISTS user_id;
