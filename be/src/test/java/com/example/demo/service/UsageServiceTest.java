package com.example.demo.service;

import com.example.demo.entity.UsageMetric;
import com.example.demo.repository.UsageMetricRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsageServiceTest {
    
    @Mock
    private UsageMetricRepository usageMetricRepository;
    
    @InjectMocks
    private UsageService usageService;
    
    private UUID testUserId;
    
    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
    }
    
    @Test
    void increment_ShouldSaveUsageMetric() {
        ArgumentCaptor<UsageMetric> captor = ArgumentCaptor.forClass(UsageMetric.class);
        
        usageService.increment(UsageService.NEWS_API_CALLS, testUserId, 1);
        
        verify(usageMetricRepository).save(captor.capture());
        UsageMetric saved = captor.getValue();
        
        assertThat(saved.getMetricKey()).isEqualTo(UsageService.NEWS_API_CALLS);
        assertThat(saved.getUserId()).isEqualTo(testUserId);
        assertThat(saved.getAmount()).isEqualTo(1);
        assertThat(saved.getMetadata()).isNull();
    }
    
    @Test
    void increment_WithMetadata_ShouldSaveWithMetadata() {
        ArgumentCaptor<UsageMetric> captor = ArgumentCaptor.forClass(UsageMetric.class);
        
        usageService.increment(UsageService.NEWS_API_CALLS, testUserId, 5, "crypto");
        
        verify(usageMetricRepository).save(captor.capture());
        UsageMetric saved = captor.getValue();
        
        assertThat(saved.getMetricKey()).isEqualTo(UsageService.NEWS_API_CALLS);
        assertThat(saved.getUserId()).isEqualTo(testUserId);
        assertThat(saved.getAmount()).isEqualTo(5);
        assertThat(saved.getMetadata()).isEqualTo("crypto");
    }
    
    @Test
    void increment_WithNullUserId_ShouldSaveSuccessfully() {
        ArgumentCaptor<UsageMetric> captor = ArgumentCaptor.forClass(UsageMetric.class);
        
        usageService.increment(UsageService.NEWS_API_CALLS, null, 1);
        
        verify(usageMetricRepository).save(captor.capture());
        UsageMetric saved = captor.getValue();
        
        assertThat(saved.getUserId()).isNull();
        assertThat(saved.getAmount()).isEqualTo(1);
    }
    
    @Test
    void increment_OnException_ShouldLogAndNotThrow() {
        when(usageMetricRepository.save(any())).thenThrow(new RuntimeException("DB error"));
        
        usageService.increment(UsageService.NEWS_API_CALLS, testUserId, 1);
        
        verify(usageMetricRepository).save(any());
    }
    
    @Test
    void getTotalUsage_ShouldReturnSum() {
        Instant since = Instant.now().minus(1, ChronoUnit.DAYS);
        when(usageMetricRepository.sumAmountByMetricKeySince(UsageService.NEWS_API_CALLS, since))
            .thenReturn(150L);
        
        Long total = usageService.getTotalUsage(UsageService.NEWS_API_CALLS, since);
        
        assertThat(total).isEqualTo(150L);
        verify(usageMetricRepository).sumAmountByMetricKeySince(UsageService.NEWS_API_CALLS, since);
    }
    
    @Test
    void getTotalUsage_WhenNull_ShouldReturnZero() {
        Instant since = Instant.now().minus(1, ChronoUnit.DAYS);
        when(usageMetricRepository.sumAmountByMetricKeySince(any(), any())).thenReturn(null);
        
        Long total = usageService.getTotalUsage(UsageService.NEWS_API_CALLS, since);
        
        assertThat(total).isEqualTo(0L);
    }
    
    @Test
    void getUserUsage_ShouldReturnUserSpecificSum() {
        Instant since = Instant.now().minus(1, ChronoUnit.DAYS);
        when(usageMetricRepository.sumAmountByMetricKeyAndUserIdSince(
            UsageService.NEWS_API_CALLS, testUserId, since))
            .thenReturn(25L);
        
        Long total = usageService.getUserUsage(UsageService.NEWS_API_CALLS, testUserId, since);
        
        assertThat(total).isEqualTo(25L);
    }
    
    @Test
    void getCallCount_ShouldReturnCount() {
        Instant since = Instant.now().minus(1, ChronoUnit.DAYS);
        when(usageMetricRepository.countByMetricKeySince(UsageService.NEWS_API_CALLS, since))
            .thenReturn(10L);
        
        Long count = usageService.getCallCount(UsageService.NEWS_API_CALLS, since);
        
        assertThat(count).isEqualTo(10L);
    }
    
    @Test
    void getDailyStats_ShouldCalculateCorrectly() {
        Instant dayAgo = Instant.now().minus(24, ChronoUnit.HOURS);
        when(usageMetricRepository.sumAmountByMetricKeySince(eq(UsageService.NEWS_API_CALLS), any()))
            .thenReturn(100L);
        when(usageMetricRepository.countByMetricKeySince(eq(UsageService.NEWS_API_CALLS), any()))
            .thenReturn(10L);
        
        Map<String, Object> stats = usageService.getDailyStats(UsageService.NEWS_API_CALLS);
        
        assertThat(stats.get("metricKey")).isEqualTo(UsageService.NEWS_API_CALLS);
        assertThat(stats.get("period")).isEqualTo("24h");
        assertThat(stats.get("totalUsage")).isEqualTo(100L);
        assertThat(stats.get("callCount")).isEqualTo(10L);
        assertThat(stats.get("averagePerCall")).isEqualTo(10.0);
    }
    
    @Test
    void getDailyStats_WithZeroCalls_ShouldReturnZeroAverage() {
        when(usageMetricRepository.sumAmountByMetricKeySince(any(), any())).thenReturn(0L);
        when(usageMetricRepository.countByMetricKeySince(any(), any())).thenReturn(0L);
        
        Map<String, Object> stats = usageService.getDailyStats(UsageService.NEWS_API_CALLS);
        
        assertThat(stats.get("averagePerCall")).isEqualTo(0.0);
    }
    
    @Test
    void getUserDailyStats_ShouldReturnUserStats() {
        when(usageMetricRepository.sumAmountByMetricKeyAndUserIdSince(any(), eq(testUserId), any()))
            .thenReturn(50L);
        
        Map<String, Object> stats = usageService.getUserDailyStats(UsageService.NEWS_API_CALLS, testUserId);
        
        assertThat(stats.get("metricKey")).isEqualTo(UsageService.NEWS_API_CALLS);
        assertThat(stats.get("userId")).isEqualTo(testUserId);
        assertThat(stats.get("period")).isEqualTo("24h");
        assertThat(stats.get("totalUsage")).isEqualTo(50L);
    }
    
    @Test
    void getTopUsers_ShouldReturnTopUsersList() {
        Instant since = Instant.now().minus(7, ChronoUnit.DAYS);
        List<Object[]> mockResult = Arrays.asList(
            new Object[]{testUserId, 100L},
            new Object[]{UUID.randomUUID(), 50L}
        );
        when(usageMetricRepository.getTopUsersByMetricKeySince(UsageService.NEWS_API_CALLS, since))
            .thenReturn(mockResult);
        
        List<Object[]> topUsers = usageService.getTopUsers(UsageService.NEWS_API_CALLS, since);
        
        assertThat(topUsers).hasSize(2);
        assertThat(topUsers.get(0)[1]).isEqualTo(100L);
    }
    
    @Test
    void getUserHistory_ShouldReturnUserMetrics() {
        List<UsageMetric> mockMetrics = Arrays.asList(
            UsageMetric.builder().metricKey(UsageService.NEWS_API_CALLS).userId(testUserId).amount(5).build(),
            UsageMetric.builder().metricKey(UsageService.NEWS_API_ARTICLES).userId(testUserId).amount(50).build()
        );
        when(usageMetricRepository.findByUserIdOrderByCreatedAtDesc(testUserId))
            .thenReturn(mockMetrics);
        
        List<UsageMetric> history = usageService.getUserHistory(testUserId);
        
        assertThat(history).hasSize(2);
        assertThat(history.get(0).getUserId()).isEqualTo(testUserId);
    }
    
    @Test
    void getMetricHistory_ShouldReturnMetricHistory() {
        List<UsageMetric> mockMetrics = Arrays.asList(
            UsageMetric.builder().metricKey(UsageService.NEWS_API_CALLS).amount(1).build(),
            UsageMetric.builder().metricKey(UsageService.NEWS_API_CALLS).amount(2).build()
        );
        when(usageMetricRepository.findByMetricKeyOrderByCreatedAtDesc(UsageService.NEWS_API_CALLS))
            .thenReturn(mockMetrics);
        
        List<UsageMetric> history = usageService.getMetricHistory(UsageService.NEWS_API_CALLS);
        
        assertThat(history).hasSize(2);
        assertThat(history).allMatch(m -> m.getMetricKey().equals(UsageService.NEWS_API_CALLS));
    }
}

