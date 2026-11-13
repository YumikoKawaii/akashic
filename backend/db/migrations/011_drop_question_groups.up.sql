DELETE FROM questions WHERE group_id IS NOT NULL;
ALTER TABLE questions DROP COLUMN IF EXISTS group_id;
ALTER TABLE questions DROP COLUMN IF EXISTS position;
DROP TABLE IF EXISTS question_groups;
UPDATE banks SET default_config = default_config - 'standalone_only';
UPDATE tests SET config = config - 'standalone_only';
