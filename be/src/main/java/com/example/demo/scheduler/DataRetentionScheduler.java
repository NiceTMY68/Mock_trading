package com.example.demo.scheduler;

import com.example.demo.repository.PriceSnapshotRepository;
import com.example.demo.repository.RequestLogRepository;
import com.example.demo.repository.UsageMetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Scheduled job to clean up old data based on retention policies.
 * Runs daily to delete records older than the configured retention window.
 * Uses ShedLock to ensure only one instance runs in distributed deployment.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataRetentionScheduler {

    private final UsageMetricRepository usageMetricRepository;
    private final RequestLogRepository requestLogRepository;
    private final PriceSnapshotRepository priceSnapshotRepository;

    @Value("${retention.enabled:true}")
    private boolean enabled;

    @Value("${retention.usage-metrics-days:90}")
    private int usageMetricsRetentionDays;

    @Value("${retention.request-logs-days:30}")
    private int requestLogsRetentionDays;

    @Value("${retention.price-snapshots-days:180}")
    private int priceSnapshotsRetentionDays;

    /**
     * Clean up old data based on retention policies.
     * Runs daily at 2 AM (configurable via cron expression).
     * Uses ShedLock to ensure only one instance runs in distributed deployment.
     */
    @Scheduled(cron = "${retention.cleanup-cron:0 0 2 * * ?}") // Default: daily at 2 AM
    @SchedulerLock(name = "dataRetentionScheduler", lockAtMostFor = "PT1H", lockAtLeastFor = "PT5M")
    @Transactional
    public void cleanupOldData() {
        if (!enabled) {
            log.debug("Data retention is disabled");
            return;
        }

        try {
            log.info("Starting data retention cleanup...");

            int deletedUsageMetrics = cleanupUsageMetrics();
            int deletedRequestLogs = cleanupRequestLogs();
            int deletedPriceSnapshots = cleanupPriceSnapshots();

            log.info("Data retention cleanup completed: {} usage metrics, {} request logs, {} price snapshots deleted",
                    deletedUsageMetrics, deletedRequestLogs, deletedPriceSnapshots);

        } catch (Exception e) {
            log.error("Error during data retention cleanup", e);
            // Don't re-throw to allow ShedLock to release and retry on next schedule
        }
    }

    /**
     * Clean up old usage metrics.
     * @return number of deleted records
     */
    private int cleanupUsageMetrics() {
        try {
            Instant cutoffDate = Instant.now().minus(usageMetricsRetentionDays, ChronoUnit.DAYS);
            int deletedCount = usageMetricRepository.deleteByCreatedAtBefore(cutoffDate);
            log.info("Deleted {} usage metrics older than {} days (before {})",
                    deletedCount, usageMetricsRetentionDays, cutoffDate);
            return deletedCount;
        } catch (Exception e) {
            log.error("Error cleaning up usage metrics", e);
            return 0;
        }
    }

    /**
     * Clean up old request logs.
     * @return number of deleted records
     */
    private int cleanupRequestLogs() {
        try {
            Instant cutoffDate = Instant.now().minus(requestLogsRetentionDays, ChronoUnit.DAYS);
            int deletedCount = requestLogRepository.deleteByCreatedAtBefore(cutoffDate);
            log.info("Deleted {} request logs older than {} days (before {})",
                    deletedCount, requestLogsRetentionDays, cutoffDate);
            return deletedCount;
        } catch (Exception e) {
            log.error("Error cleaning up request logs", e);
            return 0;
        }
    }

    /**
     * Clean up old price snapshots.
     * @return number of deleted records
     */
    private int cleanupPriceSnapshots() {
        try {
            Instant cutoffDate = Instant.now().minus(priceSnapshotsRetentionDays, ChronoUnit.DAYS);
            int deletedCount = priceSnapshotRepository.deleteByTimestampBefore(cutoffDate);
            log.info("Deleted {} price snapshots older than {} days (before {})",
                    deletedCount, priceSnapshotsRetentionDays, cutoffDate);
            return deletedCount;
        } catch (Exception e) {
            log.error("Error cleaning up price snapshots", e);
            return 0;
        }
    }
}

