CREATE TABLE users (
    id         SERIAL      PRIMARY KEY,
    google_id  TEXT        NOT NULL UNIQUE,
    email      TEXT        NOT NULL UNIQUE,
    name       TEXT        NOT NULL,
    avatar_url TEXT        NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE banks (
    id             SERIAL      PRIMARY KEY,
    name           TEXT        NOT NULL,
    description    TEXT        NOT NULL DEFAULT '',
    owner_id       INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    default_config JSONB       NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_banks_name_active ON banks(name) WHERE deleted_at IS NULL;

CREATE TABLE bank_members (
    id         SERIAL      PRIMARY KEY,
    bank_id    INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_bank_members_active ON bank_members(bank_id, user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bank_members_user   ON bank_members(user_id);
CREATE INDEX idx_bank_members_bank   ON bank_members(bank_id);

CREATE TABLE categories (
    id          SERIAL      PRIMARY KEY,
    bank_id     INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_categories_bank_name ON categories(bank_id, name) WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_bank ON categories(bank_id);

CREATE TABLE passages (
    id          SERIAL      PRIMARY KEY,
    bank_id     INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    category_id INTEGER     NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    title       TEXT        NOT NULL,
    body        TEXT        NOT NULL DEFAULT '',
    difficulty  TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_passages_bank      ON passages(bank_id);
CREATE INDEX idx_passages_category  ON passages(category_id);
CREATE INDEX idx_passages_difficulty ON passages(difficulty);

CREATE TABLE question_groups (
    id          SERIAL      PRIMARY KEY,
    bank_id     INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    category_id INTEGER     NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    passage_id  INTEGER     REFERENCES passages(id) ON DELETE CASCADE,
    type        TEXT        NOT NULL,
    difficulty  TEXT        NOT NULL,
    context     JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_question_groups_bank       ON question_groups(bank_id);
CREATE INDEX idx_question_groups_category   ON question_groups(category_id);
CREATE INDEX idx_question_groups_passage    ON question_groups(passage_id);
CREATE INDEX idx_question_groups_type       ON question_groups(type);
CREATE INDEX idx_question_groups_difficulty ON question_groups(difficulty);

CREATE TABLE questions (
    id          SERIAL      PRIMARY KEY,
    bank_id     INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    category_id INTEGER     NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    group_id    INTEGER     REFERENCES question_groups(id) ON DELETE CASCADE,
    type        TEXT        NOT NULL,
    difficulty  TEXT        NOT NULL,
    tags        TEXT[]      NOT NULL DEFAULT '{}',
    position    SMALLINT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_questions_bank       ON questions(bank_id);
CREATE INDEX idx_questions_category   ON questions(category_id);
CREATE INDEX idx_questions_group      ON questions(group_id);
CREATE INDEX idx_questions_type       ON questions(type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);

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

CREATE TABLE tests (
    id          SERIAL      PRIMARY KEY,
    bank_id     INTEGER     NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    config      JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_tests_bank ON tests(bank_id);

CREATE TABLE test_questions (
    test_id     INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    PRIMARY KEY (test_id, question_id)
);

CREATE TABLE test_attempts (
    id           SERIAL      PRIMARY KEY,
    test_id      INTEGER     NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    answers      JSONB       NOT NULL DEFAULT '{}',
    score        INTEGER,
    total        INTEGER,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);
CREATE INDEX idx_test_attempts_test ON test_attempts(test_id);
