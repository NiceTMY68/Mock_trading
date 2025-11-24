package com.example.demo.scheduler;

import com.example.demo.entity.UsageMetric;
import com.example.demo.repository.UsageMetricRepository;
import com.example.demo.service.RedisUsageBufferService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Scheduled job to flush buffered usage metrics from Redis to database.
 * Runs periodically to batch write metrics and avoid database write storms.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UsageFlushScheduler {

    private final RedisUsageBufferService redisUsageBufferService;
    private final UsageMetricRepository usageMetricRepository;

    /**
     * Flush buffered usage metrics from Redis to database.
     * Runs every minute by default (configurable via app.usage.flush.interval).
     * Uses ShedLock to ensure only one instance runs in distributed deployment.
     */
    @Scheduled(fixedDelayString = "${app.usage.flush.interval:60000}")
    @SchedulerLock(name = "usageFlush", lockAtMostFor = "PT2M", lockAtLeastFor = "PT10S")
    @Transactional
    public void flushBufferedMetrics() {
        try {
            log.debug("Starting usage metrics flush");
            
            // Get all buffered metrics from Redis
            Map<String, RedisUsageBufferService.BufferedMetric> bufferedMetrics = 
                    redisUsageBufferService.getAllBufferedMetrics();
            
            if (bufferedMetrics.isEmpty()) {
                log.debug("No buffered metrics to flush");
                return;
            }
            
            log.info("Flushing {} buffered metric groups to database", bufferedMetrics.size());
            
            // Convert to UsageMetric entities and save
            List<UsageMetric> metricsToSave = bufferedMetrics.values().stream()
                    .map(buffered -> UsageMetric.builder()
                            .metricKey(buffered.getMetricKey())
                            .userId(buffered.getUserId())
                            .amount(buffered.getAmount().intValue())
                            .metadata(buffered.getMetadata())
                            .createdAt(Instant.now())
                            .build())
                    .collect(Collectors.toList());
            
            // Batch save to database
            usageMetricRepository.saveAll(metricsToSave);
            
            // Clear Redis buffer after successful flush
            redisUsageBufferService.clearBufferedMetrics();
            
            log.info("Successfully flushed {} usage metric groups to database", metricsToSave.size());
            
        } catch (Exception e) {
            log.error("Failed to flush buffered usage metrics", e);
            // Don't clear buffer on error - allow retry on next flush
        }
    }
}

