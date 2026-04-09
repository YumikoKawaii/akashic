CREATE TABLE users (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_id  TEXT        NOT NULL UNIQUE,
  email      TEXT        NOT NULL UNIQUE,
  name       TEXT        NOT NULL,
  avatar_url TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE banks ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE bank_members (
  bank_id    UUID        NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bank_id, user_id)
);

CREATE INDEX idx_bank_members_user_id ON bank_members(user_id);
