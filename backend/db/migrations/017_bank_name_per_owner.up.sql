DROP INDEX IF EXISTS idx_banks_name_active;
CREATE UNIQUE INDEX idx_banks_owner_name_active ON banks(owner_id, name) WHERE deleted_at IS NULL;
