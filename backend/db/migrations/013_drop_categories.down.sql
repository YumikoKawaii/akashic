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

INSERT INTO categories (bank_id, name) SELECT DISTINCT bank_id, 'Uncategorized' FROM questions;

ALTER TABLE questions ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT;
UPDATE questions q SET category_id = c.id FROM categories c WHERE c.bank_id = q.bank_id;
ALTER TABLE questions ALTER COLUMN category_id SET NOT NULL;
CREATE INDEX idx_questions_category ON questions(category_id);
