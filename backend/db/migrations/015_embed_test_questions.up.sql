ALTER TABLE tests ADD COLUMN question_ids INTEGER[] NOT NULL DEFAULT '{}';

UPDATE tests t
    SET question_ids = sub.ids
    FROM (
        SELECT test_id, array_agg(question_id ORDER BY position) AS ids
        FROM test_questions
        GROUP BY test_id
    ) sub
    WHERE sub.test_id = t.id;

DROP TABLE test_questions;
