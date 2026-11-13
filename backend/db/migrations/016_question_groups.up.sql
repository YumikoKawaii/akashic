CREATE TABLE question_groups (
    id         SERIAL PRIMARY KEY,
    bank_id    INTEGER NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    title      TEXT NOT NULL DEFAULT '',
    content    JSONB NOT NULL DEFAULT '{}',
    difficulty TEXT NOT NULL,
    tags       TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_question_groups_bank_id ON question_groups(bank_id);
CREATE INDEX idx_question_groups_difficulty ON question_groups(difficulty);
CREATE INDEX idx_question_groups_deleted_at ON question_groups(deleted_at);

ALTER TABLE questions
    ADD COLUMN group_id INTEGER REFERENCES question_groups(id) ON DELETE CASCADE,
    ADD COLUMN position INTEGER;

CREATE INDEX idx_questions_group_id ON questions(group_id);
CREATE UNIQUE INDEX uq_questions_group_position ON questions(group_id, position)
    WHERE group_id IS NOT NULL AND deleted_at IS NULL;
