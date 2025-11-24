package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.entity.PriceSnapshot;
import com.example.demo.entity.RequestLog;
import com.example.demo.entity.UsageMetric;
import com.example.demo.repository.PriceSnapshotRepository;
import com.example.demo.repository.RequestLogRepository;
import com.example.demo.repository.UsageMetricRepository;
import com.example.demo.scheduler.DataRetentionScheduler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test for data retention scheduler.
 * Verifies that old records are deleted based on retention policies.
 */
@TestPropertySource(properties = {
    "retention.enabled=true",
    "retention.usage-metrics-days=30",
    "retention.request-logs-days=7",
    "retention.price-snapshots-days=60",
    "retention.cleanup-cron=0 0 0 1 1 ?", // Disable auto-scheduling for test
    "app.limit.matcher.delay=999999999",
    "app.alert.checker.delay=999999999",
    "app.cache.warming.interval=999999999"
})
class DataRetentionIntegrationTest extends IntegrationTestBase {

    @Autowired
    private DataRetentionScheduler dataRetentionScheduler;

    @Autowired
    private UsageMetricRepository usageMetricRepository;

    @Autowired
    private RequestLogRepository requestLogRepository;

    @Autowired
    private PriceSnapshotRepository priceSnapshotRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        // Create shedlock table for scheduler
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS shedlock (
                name VARCHAR(64) NOT NULL,
                lock_until TIMESTAMP NOT NULL,
                locked_at TIMESTAMP NOT NULL,
                locked_by VARCHAR(255) NOT NULL,
                PRIMARY KEY (name)
            )
        """);

        // Clean up all data before each test
        usageMetricRepository.deleteAll();
        requestLogRepository.deleteAll();
        priceSnapshotRepository.deleteAll();
    }

    @Test
    void cleanupOldData_ShouldDeleteOldUsageMetrics() {
        UUID testUserId = UUID.randomUUID();
        Instant now = Instant.now();

        // Create old usage metric (older than retention period)
        UsageMetric oldMetric = UsageMetric.builder()
                .metricKey("test.metric")
                .userId(testUserId)
                .amount(100)
                .createdAt(now.minus(31, ChronoUnit.DAYS)) // 31 days ago (older than 30-day retention)
                .build();
        usageMetricRepository.save(oldMetric);

        // Create recent usage metric (within retention period)
        UsageMetric recentMetric = UsageMetric.builder()
                .metricKey("test.metric")
                .userId(testUserId)
                .amount(50)
                .createdAt(now.minus(10, ChronoUnit.DAYS)) // 10 days ago (within 30-day retention)
                .build();
        usageMetricRepository.save(recentMetric);

        // Verify both exist before cleanup
        assertThat(usageMetricRepository.count()).isEqualTo(2);

        // Run cleanup
        dataRetentionScheduler.cleanupOldData();

        // Verify old metric is deleted, recent metric remains
        assertThat(usageMetricRepository.count()).isEqualTo(1);
        assertThat(usageMetricRepository.findAll()).containsExactly(recentMetric);
    }

    @Test
    void cleanupOldData_ShouldDeleteOldRequestLogs() {
        UUID testUserId = UUID.randomUUID();
        Instant now = Instant.now();

        // Create old request log (older than retention period)
        RequestLog oldLog = RequestLog.builder()
                .requestId(UUID.randomUUID())
                .userId(testUserId)
                .endpoint("/api/test")
                .cached(false)
                .createdAt(now.minus(8, ChronoUnit.DAYS)) // 8 days ago (older than 7-day retention)
                .build();
        requestLogRepository.save(oldLog);

        // Create recent request log (within retention period)
        RequestLog recentLog = RequestLog.builder()
                .requestId(UUID.randomUUID())
                .userId(testUserId)
                .endpoint("/api/test")
                .cached(false)
                .createdAt(now.minus(3, ChronoUnit.DAYS)) // 3 days ago (within 7-day retention)
                .build();
        requestLogRepository.save(recentLog);

        // Verify both exist before cleanup
        assertThat(requestLogRepository.count()).isEqualTo(2);

        // Run cleanup
        dataRetentionScheduler.cleanupOldData();

        // Verify old log is deleted, recent log remains
        assertThat(requestLogRepository.count()).isEqualTo(1);
        assertThat(requestLogRepository.findAll()).containsExactly(recentLog);
    }

    @Test
    void cleanupOldData_ShouldDeleteOldPriceSnapshots() {
        Instant now = Instant.now();

        // Create old price snapshot (older than retention period)
        PriceSnapshot oldSnapshot = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(now.minus(61, ChronoUnit.DAYS)) // 61 days ago (older than 60-day retention)
                .open(BigDecimal.valueOf(50000))
                .high(BigDecimal.valueOf(51000))
                .low(BigDecimal.valueOf(49000))
                .close(BigDecimal.valueOf(50500))
                .volume(BigDecimal.valueOf(100))
                .build();
        priceSnapshotRepository.save(oldSnapshot);

        // Create recent price snapshot (within retention period)
        PriceSnapshot recentSnapshot = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(now.minus(30, ChronoUnit.DAYS)) // 30 days ago (within 60-day retention)
                .open(BigDecimal.valueOf(60000))
                .high(BigDecimal.valueOf(61000))
                .low(BigDecimal.valueOf(59000))
                .close(BigDecimal.valueOf(60500))
                .volume(BigDecimal.valueOf(200))
                .build();
        priceSnapshotRepository.save(recentSnapshot);

        // Verify both exist before cleanup
        assertThat(priceSnapshotRepository.count()).isEqualTo(2);

        // Run cleanup
        dataRetentionScheduler.cleanupOldData();

        // Verify old snapshot is deleted, recent snapshot remains
        assertThat(priceSnapshotRepository.count()).isEqualTo(1);
        assertThat(priceSnapshotRepository.findAll()).containsExactly(recentSnapshot);
    }

    @Test
    void cleanupOldData_WhenDisabled_ShouldNotDeleteAnything() {
        // Disable retention
        org.springframework.test.util.ReflectionTestUtils.setField(dataRetentionScheduler, "enabled", false);

        UUID testUserId = UUID.randomUUID();
        Instant now = Instant.now();

        // Create old records
        UsageMetric oldMetric = UsageMetric.builder()
                .metricKey("test.metric")
                .userId(testUserId)
                .amount(100)
                .createdAt(now.minus(31, ChronoUnit.DAYS))
                .build();
        usageMetricRepository.save(oldMetric);

        RequestLog oldLog = RequestLog.builder()
                .requestId(UUID.randomUUID())
                .userId(testUserId)
                .endpoint("/api/test")
                .cached(false)
                .createdAt(now.minus(8, ChronoUnit.DAYS))
                .build();
        requestLogRepository.save(oldLog);

        PriceSnapshot oldSnapshot = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(now.minus(61, ChronoUnit.DAYS))
                .open(BigDecimal.valueOf(50000))
                .close(BigDecimal.valueOf(50500))
                .volume(BigDecimal.valueOf(100))
                .build();
        priceSnapshotRepository.save(oldSnapshot);

        // Run cleanup (should be disabled)
        dataRetentionScheduler.cleanupOldData();

        // Verify nothing is deleted
        assertThat(usageMetricRepository.count()).isEqualTo(1);
        assertThat(requestLogRepository.count()).isEqualTo(1);
        assertThat(priceSnapshotRepository.count()).isEqualTo(1);
    }

    @Test
    void cleanupOldData_ShouldHandleEmptyTables() {
        // Verify all tables are empty
        assertThat(usageMetricRepository.count()).isEqualTo(0);
        assertThat(requestLogRepository.count()).isEqualTo(0);
        assertThat(priceSnapshotRepository.count()).isEqualTo(0);

        // Run cleanup (should not throw exception)
        dataRetentionScheduler.cleanupOldData();

        // Verify tables are still empty
        assertThat(usageMetricRepository.count()).isEqualTo(0);
        assertThat(requestLogRepository.count()).isEqualTo(0);
        assertThat(priceSnapshotRepository.count()).isEqualTo(0);
    }

    @Test
    void cleanupOldData_ShouldDeleteMultipleOldRecords() {
        UUID testUserId = UUID.randomUUID();
        Instant now = Instant.now();

        // Create multiple old records
        for (int i = 0; i < 5; i++) {
            UsageMetric oldMetric = UsageMetric.builder()
                    .metricKey("test.metric")
                    .userId(testUserId)
                    .amount(100 + i)
                    .createdAt(now.minus(31 + i, ChronoUnit.DAYS))
                    .build();
            usageMetricRepository.save(oldMetric);
        }

        // Create multiple recent records
        for (int i = 0; i < 3; i++) {
            UsageMetric recentMetric = UsageMetric.builder()
                    .metricKey("test.metric")
                    .userId(testUserId)
                    .amount(50 + i)
                    .createdAt(now.minus(10 + i, ChronoUnit.DAYS))
                    .build();
            usageMetricRepository.save(recentMetric);
        }

        // Verify all exist before cleanup
        assertThat(usageMetricRepository.count()).isEqualTo(8);

        // Run cleanup
        dataRetentionScheduler.cleanupOldData();

        // Verify only old records are deleted
        assertThat(usageMetricRepository.count()).isEqualTo(3);
        assertThat(usageMetricRepository.findAll())
                .allMatch(m -> m.getCreatedAt().isAfter(now.minus(30, ChronoUnit.DAYS)));
    }
}

