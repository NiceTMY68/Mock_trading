-- Add version column for optimistic locking to holdings table
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- Add version column for optimistic locking to portfolios table
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- Set default value for existing rows
UPDATE holdings SET version = 0 WHERE version IS NULL;
UPDATE portfolios SET version = 0 WHERE version IS NULL;

-- Make version columns NOT NULL for optimistic locking to work correctly
ALTER TABLE holdings ALTER COLUMN version SET NOT NULL;
ALTER TABLE portfolios ALTER COLUMN version SET NOT NULL;

