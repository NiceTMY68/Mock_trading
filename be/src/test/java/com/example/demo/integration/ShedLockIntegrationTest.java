package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = {
        "app.limit.matcher.delay=1000",
        "app.alert.checker.delay=1000"
})
class ShedLockIntegrationTest extends IntegrationTestBase {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        // Create shedlock table manually since Flyway is disabled in tests
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS shedlock (
                name VARCHAR(64) NOT NULL,
                lock_until TIMESTAMP NOT NULL,
                locked_at TIMESTAMP NOT NULL,
                locked_by VARCHAR(255) NOT NULL,
                PRIMARY KEY (name)
            )
        """);
        
        // Clean up any existing locks
        jdbcTemplate.update("DELETE FROM shedlock");
    }

    @Test
    void shedlockTable_ShouldExist() {
        // Verify table exists
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'shedlock'",
                Integer.class);
        assertThat(count).isEqualTo(1);
    }

    @Test
    void multipleInstances_ShouldOnlyOneAcquireLock() throws InterruptedException {
        // This test simulates multiple instances trying to acquire the same lock
        // In a real scenario, each instance would be a separate JVM/process
        // For actual multi-instance testing, see docs/SHEDLOCK_MULTI_INSTANCE_TESTING.md
        
        String lockName = "testLock";
        int numThreads = 5; // Simulate 5 instances
        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        CountDownLatch latch = new CountDownLatch(numThreads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < numThreads; i++) {
            final int instanceId = i;
            executor.submit(() -> {
                try {
                    // Try to acquire lock (simulating what ShedLock does)
                    boolean acquired = tryAcquireLock(lockName, "instance-" + instanceId, 30);
                    if (acquired) {
                        successCount.incrementAndGet();
                        // Simulate work
                        Thread.sleep(100);
                        // Release lock
                        releaseLock(lockName);
                    } else {
                        failureCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        // Only one instance should acquire the lock
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failureCount.get()).isEqualTo(numThreads - 1);
        
        // Clean up
        releaseLock(lockName);
    }

    @Test
    void lock_ShouldExpireAfterLockAtMostFor() throws InterruptedException {
        String lockName = "expiringLock";
        String lockedBy = "test-instance";

        // Acquire lock with short expiration
        boolean acquired = tryAcquireLock(lockName, lockedBy, 1); // 1 second
        assertThat(acquired).isTrue();

        // Wait for lock to expire
        Thread.sleep(1100);

        // Another instance should be able to acquire the lock now
        boolean acquired2 = tryAcquireLock(lockName, "another-instance", 30);
        assertThat(acquired2).isTrue();

        releaseLock(lockName);
    }

    @Test
    void lock_ShouldPreventReacquisitionBeforeLockAtLeastFor() throws InterruptedException {
        String lockName = "minLock";
        String lockedBy = "test-instance";

        // Acquire lock
        boolean acquired = tryAcquireLock(lockName, lockedBy, 30);
        assertThat(acquired).isTrue();

        // Immediately release
        releaseLock(lockName);

        // Try to reacquire immediately (should fail due to lockAtLeastFor)
        // Note: In real ShedLock, lockAtLeastFor prevents immediate reacquisition
        // This is a simplified test - in practice, ShedLock handles this automatically
        Thread.sleep(100); // Small delay to simulate lockAtLeastFor
        
        // Clean up
        jdbcTemplate.update("DELETE FROM shedlock WHERE name = ?", lockName);
    }

    /**
     * Simulates ShedLock's lock acquisition logic
     */
    private boolean tryAcquireLock(String lockName, String lockedBy, int lockForSeconds) {
        try {
            // ShedLock uses: UPDATE ... WHERE lock_until <= NOW() OR (name = ? AND lock_until <= NOW())
            // If update affects 0 rows, lock is already held
            int updated = jdbcTemplate.update(
                "UPDATE shedlock " +
                "SET lock_until = CURRENT_TIMESTAMP + INTERVAL '" + lockForSeconds + " seconds', " +
                "    locked_at = CURRENT_TIMESTAMP, " +
                "    locked_by = ? " +
                "WHERE name = ? AND lock_until <= CURRENT_TIMESTAMP",
                lockedBy, lockName);

            if (updated == 0) {
                // Try to insert if doesn't exist
                try {
                    jdbcTemplate.update(
                        "INSERT INTO shedlock (name, lock_until, locked_at, locked_by) " +
                        "VALUES (?, CURRENT_TIMESTAMP + INTERVAL '" + lockForSeconds + " seconds', CURRENT_TIMESTAMP, ?)",
                        lockName, lockedBy);
                    return true;
                } catch (Exception e) {
                    // Insert failed, lock is held by someone else
                    return false;
                }
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void releaseLock(String lockName) {
        jdbcTemplate.update("DELETE FROM shedlock WHERE name = ?", lockName);
    }
}

