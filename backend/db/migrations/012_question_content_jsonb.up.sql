ALTER TABLE questions ADD COLUMN content JSONB NOT NULL DEFAULT '{}';

UPDATE questions q
    SET content = jsonb_build_object('text', i.content, 'answer', i.answer)
    FROM q_question_items i
    WHERE i.question_id = q.id;

UPDATE questions q
    SET content = jsonb_build_object('text', c.content, 'options', c.options, 'answers', to_jsonb(c.answers))
    FROM q_multiple_choices c
    WHERE c.question_id = q.id;

DROP TABLE q_question_items;
DROP TABLE q_multiple_choices;
