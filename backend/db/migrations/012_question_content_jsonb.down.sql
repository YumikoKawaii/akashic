CREATE TABLE q_question_items (
    question_id INTEGER PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
    content     TEXT    NOT NULL,
    answer      TEXT    NOT NULL
);

CREATE TABLE q_multiple_choices (
    question_id INTEGER  PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
    content     TEXT     NOT NULL,
    options     JSONB    NOT NULL DEFAULT '[]',
    answers     TEXT[]   NOT NULL DEFAULT '{}'
);

INSERT INTO q_multiple_choices (question_id, content, options, answers)
SELECT id, content->>'text', COALESCE(content->'options', '[]'),
       COALESCE(ARRAY(SELECT jsonb_array_elements_text(content->'answers')), '{}')
FROM questions WHERE type = 'mcq';

INSERT INTO q_question_items (question_id, content, answer)
SELECT id, COALESCE(content->>'text', ''), COALESCE(content->>'answer', '')
FROM questions WHERE type <> 'mcq';

ALTER TABLE questions DROP COLUMN content;
