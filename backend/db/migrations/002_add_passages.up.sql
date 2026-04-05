CREATE TABLE passages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id     UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL DEFAULT '',
    difficulty  TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_passages_bank_id    ON passages(bank_id);
CREATE INDEX idx_passages_category   ON passages(category_id);
CREATE INDEX idx_passages_difficulty ON passages(difficulty);

ALTER TABLE questions
    ADD COLUMN passage_id UUID REFERENCES passages(id) ON DELETE SET NULL;

CREATE INDEX idx_questions_passage ON questions(passage_id);

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_type_check
    CHECK (type IN ('mcq', 'true_false', 'open', 'tf_ng'));
