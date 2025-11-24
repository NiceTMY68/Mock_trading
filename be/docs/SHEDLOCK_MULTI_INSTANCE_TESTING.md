# ShedLock Multi-Instance Testing Guide

This guide explains how to test ShedLock behavior with multiple application instances in a development environment.

## Overview

ShedLock ensures that scheduled jobs (like limit order matcher and alert checker) run on only one instance in a distributed deployment. The integration test (`ShedLockIntegrationTest`) simulates this with threads, but for real-world verification, you should test with multiple JVM instances.

## Prerequisites

- Docker & Docker Compose
- PostgreSQL database (shared across instances)
- Two or more terminal windows

## Testing with Multiple Instances

### Step 1: Start Infrastructure

```bash
docker-compose up -d postgres redis
```

### Step 2: Run First Instance

Terminal 1:
```bash
./mvnw spring-boot:run -Dspring-boot.run.arguments="--server.port=8080"
```

### Step 3: Run Second Instance

Terminal 2:
```bash
./mvnw spring-boot:run -Dspring-boot.run.arguments="--server.port=8081"
```

### Step 4: Verify Lock Behavior

1. **Check ShedLock table**:
   ```sql
   SELECT * FROM shedlock;
   ```

2. **Monitor logs** from both instances:
   - Only ONE instance should execute scheduled jobs
   - The other instance should skip execution (no errors, just skipped)

3. **Verify job execution**:
   - Check application logs for `LimitOrderMatcherScheduler` and `AlertCheckerScheduler`
   - Only one instance should log job execution
   - The other should have no execution logs

### Step 5: Test Lock Expiration

1. Stop the instance that holds the lock
2. Wait for lock expiration (default: 30 seconds)
3. The other instance should acquire the lock and start executing jobs

## Expected Behavior

- ✅ Only one instance executes scheduled jobs at a time
- ✅ When the lock holder stops, another instance acquires the lock
- ✅ No errors or exceptions when lock cannot be acquired
- ✅ Jobs execute reliably without duplication

## Troubleshooting

### Issue: Both instances execute jobs

**Cause**: ShedLock table not created or database connection issues

**Solution**:
```sql
-- Verify table exists
SELECT * FROM information_schema.tables WHERE table_name = 'shedlock';

-- If missing, run migration
-- Migration V8 should create it automatically
```

### Issue: Jobs not executing at all

**Cause**: Lock not being released or lock duration too long

**Solution**:
- Check `shedlock` table for stale locks
- Manually delete stale locks if needed:
  ```sql
  DELETE FROM shedlock WHERE lock_until < NOW();
  ```

### Issue: Lock acquisition errors

**Cause**: Database connection issues or transaction problems

**Solution**:
- Verify database connectivity from both instances
- Check database connection pool settings
- Ensure transactions are properly configured

## Automated Testing

The integration test (`ShedLockIntegrationTest`) simulates multi-instance behavior using threads:

```bash
./mvnw test -Dtest=ShedLockIntegrationTest
```

This test verifies:
- Lock acquisition logic
- Only one thread can acquire lock
- Lock expiration behavior
- Lock reacquisition prevention

## Production Considerations

1. **Database Connection**: Ensure all instances can connect to the same PostgreSQL database
2. **Network Latency**: Consider network latency when setting `lockAtMostFor` and `lockAtLeastFor`
3. **Lock Cleanup**: Stale locks are automatically cleaned up when they expire
4. **Monitoring**: Monitor the `shedlock` table to ensure locks are being acquired and released correctly

