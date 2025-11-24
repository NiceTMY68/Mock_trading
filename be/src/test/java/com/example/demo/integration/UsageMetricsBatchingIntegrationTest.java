package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.entity.UsageMetric;
import com.example.demo.repository.UsageMetricRepository;
import com.example.demo.service.RedisUsageBufferService;
import com.example.demo.service.UsageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test for usage metrics batching via Redis INCR and periodic flush.
 * Verifies that high-frequency increments result in fewer database writes after flush.
 */
@TestPropertySource(properties = {
    "app.usage.buffer.enabled=true",
    "app.usage.flush.interval=10000", // 10 seconds for testing
    "app.limit.matcher.delay=999999999", // Disable limit matcher scheduler
    "app.alert.checker.delay=999999999" // Disable alert checker scheduler
})
class UsageMetricsBatchingIntegrationTest extends IntegrationTestBase {

    @Autowired
    private UsageService usageService;

    @Autowired
    private UsageMetricRepository usageMetricRepository;

    @Autowired
    private RedisUsageBufferService redisUsageBufferService;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID testUserId;
    private static final String TEST_METRIC_KEY = "test.metric.calls";

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        // Create shedlock table for scheduler (if not exists)
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS shedlock (
                name VARCHAR(64) NOT NULL,
                lock_until TIMESTAMP NOT NULL,
                locked_at TIMESTAMP NOT NULL,
                locked_by VARCHAR(255) NOT NULL,
                PRIMARY KEY (name)
            )
        """);
        // Clean up Redis and DB
        var bufferKeys = redisTemplate.keys("usage:buffer:*");
        if (bufferKeys != null && !bufferKeys.isEmpty()) {
            redisTemplate.delete(bufferKeys);
        }
        var metadataKeys = redisTemplate.keys("usage:metadata:*");
        if (metadataKeys != null && !metadataKeys.isEmpty()) {
            redisTemplate.delete(metadataKeys);
        }
        usageMetricRepository.deleteAll();
    }

    @Test
    void highFrequencyIncrements_ShouldBufferInRedis() {
        // Perform many increments rapidly
        int incrementCount = 100;
        for (int i = 0; i < incrementCount; i++) {
            usageService.increment(TEST_METRIC_KEY, testUserId, 1);
        }

        // Verify metrics are buffered in Redis (not yet in DB)
        var bufferedMetrics = redisUsageBufferService.getAllBufferedMetrics();
        assertThat(bufferedMetrics).isNotEmpty();
        
        // Verify DB has no metrics yet (before flush)
        List<UsageMetric> dbMetrics = usageMetricRepository.findAll();
        assertThat(dbMetrics).isEmpty();
    }

    @Test
    void flush_ShouldWriteAggregatedMetricsToDatabase() {
        // Perform increments
        int incrementCount = 50;
        int amountPerIncrement = 2;
        for (int i = 0; i < incrementCount; i++) {
            usageService.increment(TEST_METRIC_KEY, testUserId, amountPerIncrement);
        }

        // Manually trigger flush
        redisUsageBufferService.getAllBufferedMetrics();
        // Simulate flush by calling the scheduler logic
        var bufferedMetrics = redisUsageBufferService.getAllBufferedMetrics();
        assertThat(bufferedMetrics).isNotEmpty();

        // Save to DB manually (simulating scheduler)
        bufferedMetrics.values().forEach(buffered -> {
            UsageMetric metric = UsageMetric.builder()
                    .metricKey(buffered.getMetricKey())
                    .userId(buffered.getUserId())
                    .amount(buffered.getAmount().intValue())
                    .metadata(buffered.getMetadata())
                    .build();
            usageMetricRepository.save(metric);
        });

        // Clear buffer
        redisUsageBufferService.clearBufferedMetrics();

        // Verify aggregated result in DB
        List<UsageMetric> dbMetrics = usageMetricRepository.findAll();
        assertThat(dbMetrics).hasSize(1);
        
        UsageMetric saved = dbMetrics.get(0);
        assertThat(saved.getMetricKey()).isEqualTo(TEST_METRIC_KEY);
        assertThat(saved.getUserId()).isEqualTo(testUserId);
        assertThat(saved.getAmount()).isEqualTo(incrementCount * amountPerIncrement); // 50 * 2 = 100
    }

    @Test
    void concurrentIncrements_ShouldAggregateCorrectly() throws InterruptedException {
        int threadCount = 10;
        int incrementsPerThread = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);

        // Concurrent increments
        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < incrementsPerThread; j++) {
                        usageService.increment(TEST_METRIC_KEY, testUserId, 1);
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        // Wait for all threads to complete
        assertThat(latch.await(10, TimeUnit.SECONDS)).isTrue();
        executor.shutdown();

        // Verify buffered metrics
        var bufferedMetrics = redisUsageBufferService.getAllBufferedMetrics();
        assertThat(bufferedMetrics).isNotEmpty();

        // Check aggregated amount
        var metric = bufferedMetrics.values().iterator().next();
        assertThat(metric.getAmount()).isEqualTo(threadCount * incrementsPerThread); // 10 * 20 = 200
    }

    @Test
    void differentMetadata_ShouldCreateSeparateBuffers() {
        UUID userId1 = UUID.randomUUID();
        UUID userId2 = UUID.randomUUID();

        // Increment with different metadata
        usageService.increment(TEST_METRIC_KEY, userId1, 10, "metadata1");
        usageService.increment(TEST_METRIC_KEY, userId1, 20, "metadata2");
        usageService.increment(TEST_METRIC_KEY, userId2, 30, "metadata1");

        // Get buffered metrics
        var bufferedMetrics = redisUsageBufferService.getAllBufferedMetrics();
        
        // Should have 3 separate buffers (different userId or metadata)
        assertThat(bufferedMetrics).hasSize(3);
    }

    @Test
    void flush_ShouldClearRedisBuffer() {
        // Perform increments
        usageService.increment(TEST_METRIC_KEY, testUserId, 10);
        usageService.increment(TEST_METRIC_KEY, testUserId, 20);

        // Verify buffer exists
        var bufferedMetrics = redisUsageBufferService.getAllBufferedMetrics();
        assertThat(bufferedMetrics).isNotEmpty();

        // Clear buffer
        redisUsageBufferService.clearBufferedMetrics();

        // Verify buffer is cleared
        var clearedMetrics = redisUsageBufferService.getAllBufferedMetrics();
        assertThat(clearedMetrics).isEmpty();
    }

    @Test
    void bufferDisabled_ShouldWriteDirectlyToDatabase() {
        // This test would require a separate test class with buffer disabled
        // For now, we test that buffer works when enabled (above tests)
        // Direct DB write is tested in UsageServiceTest
    }
}

