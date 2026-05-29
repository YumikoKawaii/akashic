DROP INDEX IF EXISTS idx_tests_bank_creator;
ALTER TABLE tests DROP COLUMN IF EXISTS created_by;

DROP INDEX IF EXISTS idx_banks_public;
ALTER TABLE banks DROP COLUMN IF EXISTS visibility;
