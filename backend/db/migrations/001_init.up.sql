CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE banks (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL UNIQUE,
    description   TEXT NOT NULL DEFAULT '',
    default_config JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id     UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bank_id, name)
);

CREATE TABLE questions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id        UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    category_id    UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    text           TEXT NOT NULL,
    type           TEXT NOT NULL CHECK (type IN ('mcq', 'true_false', 'open')),
    difficulty     TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    options        TEXT[] NOT NULL DEFAULT '{}',
    correct_answer TEXT NOT NULL DEFAULT '',
    tags           TEXT[] NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_bank_id   ON questions(bank_id);
CREATE INDEX idx_questions_category  ON questions(category_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_type      ON questions(type);

CREATE TABLE tests (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id     UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    config      JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE test_questions (
    test_id     UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    PRIMARY KEY (test_id, question_id)
);

CREATE TABLE test_attempts (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id      UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    answers      JSONB NOT NULL DEFAULT '{}',
    score        INTEGER,
    total        INTEGER,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_test_attempts_test_id ON test_attempts(test_id);
