DROP TABLE IF EXISTS contribution_comments;
DROP TABLE IF EXISTS contribution_events;
DROP TABLE IF EXISTS contributions;
ALTER TABLE question_groups DROP COLUMN IF EXISTS passage_id;
DROP TABLE IF EXISTS passages;
UPDATE banks SET default_config = default_config - 'passage_ids';
UPDATE tests SET config = config - 'passage_ids';
