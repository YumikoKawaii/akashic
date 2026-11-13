CREATE TABLE test_questions (
    test_id     INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    PRIMARY KEY (test_id, question_id)
);

INSERT INTO test_questions (test_id, question_id, position)
SELECT t.id, q.qid, q.pos
FROM tests t, unnest(t.question_ids) WITH ORDINALITY AS q(qid, pos)
WHERE EXISTS (SELECT 1 FROM questions WHERE id = q.qid);

ALTER TABLE tests DROP COLUMN question_ids;
