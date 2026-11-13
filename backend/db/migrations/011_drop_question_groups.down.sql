CREATE TABLE question_groups (
    id          SERIAL      PRIMARY KEY,
    bank_id     INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    category_id INTEGER     NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    type        TEXT        NOT NULL,
    difficulty  TEXT        NOT NULL,
    context     JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_question_groups_bank       ON question_groups(bank_id);
CREATE INDEX idx_question_groups_category   ON question_groups(category_id);
CREATE INDEX idx_question_groups_type       ON question_groups(type);
CREATE INDEX idx_question_groups_difficulty ON question_groups(difficulty);

ALTER TABLE questions ADD COLUMN group_id INTEGER REFERENCES question_groups(id) ON DELETE CASCADE;
ALTER TABLE questions ADD COLUMN position SMALLINT;
CREATE INDEX idx_questions_group ON questions(group_id);
