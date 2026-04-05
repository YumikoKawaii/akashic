ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_type_check
    CHECK (type IN ('mcq', 'true_false', 'open'));

ALTER TABLE questions DROP COLUMN IF EXISTS passage_id;

DROP TABLE IF EXISTS passages;
