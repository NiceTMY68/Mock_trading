-- Migration to support hashed password reset tokens
-- Note: This migration assumes no production data exists yet
-- If production data exists, tokens need to be migrated separately

-- Increase token column size to accommodate SHA-256 hash (base64 encoded = 44 chars, but using 512 for consistency with refresh_tokens)
ALTER TABLE password_resets 
    ALTER COLUMN token TYPE VARCHAR(512);

-- Note: Existing raw tokens in database will become invalid after this migration
-- This is acceptable for security reasons (tokens should be short-lived anyway)

