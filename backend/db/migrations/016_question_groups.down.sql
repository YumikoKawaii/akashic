DELETE FROM questions WHERE group_id IS NOT NULL;
DROP INDEX IF EXISTS uq_questions_group_position;
DROP INDEX IF EXISTS idx_questions_group_id;
ALTER TABLE questions DROP COLUMN position, DROP COLUMN group_id;
DROP TABLE question_groups;
