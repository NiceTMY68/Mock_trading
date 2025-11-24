# Migration Review Checklist

This document provides a checklist for reviewing database migrations before merging to production.

## Pre-Merge Checklist

### 1. Migration Naming
- [ ] Migration follows naming convention: `V{number}__{description}.sql`
- [ ] Version number is sequential (no gaps, no duplicates)
- [ ] Description is clear and concise

### 2. SQL Best Practices
- [ ] Uses `IF NOT EXISTS` for table/column creation where appropriate
- [ ] Uses `IF EXISTS` for drops where appropriate
- [ ] Includes proper indexes for foreign keys and frequently queried columns
- [ ] Uses appropriate data types (UUID, TIMESTAMPTZ, VARCHAR with appropriate length)
- [ ] Includes comments for complex migrations

### 3. Data Safety
- [ ] No `DROP TABLE` or `DROP COLUMN` without data migration plan
- [ ] Backward-compatible changes (if possible)
- [ ] Handles existing data appropriately (defaults, migrations, etc.)
- [ ] No hardcoded values that should be configurable

### 4. Foreign Keys & Constraints
- [ ] Foreign keys have proper `ON DELETE` clauses (CASCADE, SET NULL, RESTRICT)
- [ ] Unique constraints are properly defined
- [ ] NOT NULL constraints are added after setting defaults for existing rows
- [ ] Check constraints are validated

### 5. Indexes
- [ ] Indexes created for foreign keys
- [ ] Indexes created for frequently queried columns
- [ ] Unique indexes for unique constraints
- [ ] Composite indexes where appropriate

### 6. Performance Considerations
- [ ] Large table modifications (ALTER TABLE) are tested for performance impact
- [ ] Index creation on large tables is considered
- [ ] Migration can run during maintenance window if needed

### 7. Rollback Considerations
- [ ] Migration can be reversed if needed (document rollback steps)
- [ ] Data loss is acceptable or migration plan is documented
- [ ] Breaking changes are documented

### 8. Testing
- [ ] Migration tested on local database
- [ ] Migration tested on staging environment
- [ ] Application code tested with new schema
- [ ] Integration tests pass with new migration

## Current Migrations Review

### V1__init.sql
- ✅ Initial schema with users, subscriptions, request_logs
- ✅ Proper indexes and foreign keys
- ✅ Uses UUID primary keys

### V2__add_status_code_to_request_logs.sql
- ✅ Simple column addition
- ✅ Uses `IF NOT EXISTS` for safety

### V3__add_password_reset_and_email_verification.sql
- ✅ Creates password_resets table
- ✅ Adds email_verified column
- ✅ Proper indexes

### V4__add_refresh_tokens.sql
- ✅ Creates refresh_tokens table
- ✅ Token column size 512 (for hashed tokens)
- ✅ Proper indexes and foreign keys

### V5__add_idempotency_keys.sql
- ✅ Creates idempotency_keys table
- ✅ Proper indexes for key and user_id

### V6__add_webhook_events.sql
- ✅ Creates webhook_events table
- ✅ Unique constraint on event_id
- ✅ Proper indexes

### V7__add_version_to_holdings_and_portfolios.sql
- ✅ Adds version columns for optimistic locking
- ✅ Sets defaults before NOT NULL constraint
- ✅ Proper migration order

### V8__create_shedlock_table.sql
- ✅ Creates shedlock table for distributed locking
- ✅ Proper primary key

### V9__hash_password_reset_tokens.sql
- ✅ Increases token column size to 512
- ✅ Documents that existing tokens become invalid (acceptable for security)
- ⚠️ Note: If production has active tokens, they will become invalid

## Migration Best Practices

1. **Always test migrations** on a copy of production data
2. **Never modify existing migrations** - create new ones instead
3. **Document breaking changes** in migration comments
4. **Consider rollback strategy** for critical migrations
5. **Use transactions** where possible (Flyway wraps each migration in a transaction)
6. **Keep migrations small** - one logical change per migration
7. **Review with team** before merging to main branch

## Common Issues to Avoid

- ❌ Modifying existing migrations after they've been applied
- ❌ Hardcoding values that should be configurable
- ❌ Missing indexes on foreign keys
- ❌ Adding NOT NULL without defaults for existing rows
- ❌ Dropping columns/tables without migration plan
- ❌ Creating migrations that can't be rolled back

