package com.example.demo.service;

import com.example.demo.entity.UsageMetric;
import com.example.demo.repository.UsageMetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UsageService {
    
    private final UsageMetricRepository usageMetricRepository;
    
    public static final String NEWS_API_CALLS = "news.api.calls";
    public static final String NEWS_API_ARTICLES = "news.api.articles";
    public static final String BINANCE_API_CALLS = "binance.api.calls";
    
    @Transactional
    public void increment(String metricKey, UUID userId, int amount) {
        increment(metricKey, userId, amount, null);
    }
    
    @Transactional
    public void increment(String metricKey, UUID userId, int amount, String metadata) {
        try {
            UsageMetric metric = UsageMetric.builder()
                .metricKey(metricKey)
                .userId(userId)
                .amount(amount)
                .metadata(metadata)
                .build();
            
            usageMetricRepository.save(metric);
            log.debug("Recorded usage: key={}, userId={}, amount={}", metricKey, userId, amount);
            
        } catch (Exception e) {
            log.error("Failed to record usage metric: key={}, userId={}, amount={}", 
                metricKey, userId, amount, e);
        }
    }
    
    public Long getTotalUsage(String metricKey, Instant since) {
        return nullSafeSum(usageMetricRepository.sumAmountByMetricKeySince(metricKey, since));
    }
    
    public Long getUserUsage(String metricKey, UUID userId, Instant since) {
        return nullSafeSum(usageMetricRepository.sumAmountByMetricKeyAndUserIdSince(metricKey, userId, since));
    }
    
    public Long getCallCount(String metricKey, Instant since) {
        return nullSafeSum(usageMetricRepository.countByMetricKeySince(metricKey, since));
    }
    
    private Long nullSafeSum(Long value) {
        return value != null ? value : 0L;
    }
    
    public Map<String, Object> getDailyStats(String metricKey) {
        Instant dayAgo = Instant.now().minus(24, ChronoUnit.HOURS);
        Long totalUsage = getTotalUsage(metricKey, dayAgo);
        Long callCount = getCallCount(metricKey, dayAgo);
        
        return Map.of(
            "metricKey", metricKey,
            "period", "24h",
            "totalUsage", totalUsage,
            "callCount", callCount,
            "averagePerCall", callCount > 0 ? (double) totalUsage / callCount : 0.0
        );
    }
    
    public Map<String, Object> getUserDailyStats(String metricKey, UUID userId) {
        Instant dayAgo = Instant.now().minus(24, ChronoUnit.HOURS);
        Long totalUsage = getUserUsage(metricKey, userId, dayAgo);
        
        return Map.of(
            "metricKey", metricKey,
            "userId", userId,
            "period", "24h",
            "totalUsage", totalUsage
        );
    }
    
    public List<Object[]> getTopUsers(String metricKey, Instant since) {
        return usageMetricRepository.getTopUsersByMetricKeySince(metricKey, since);
    }
    
    public List<UsageMetric> getUserHistory(UUID userId) {
        return usageMetricRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    public List<UsageMetric> getMetricHistory(String metricKey) {
        return usageMetricRepository.findByMetricKeyOrderByCreatedAtDesc(metricKey);
    }
}

