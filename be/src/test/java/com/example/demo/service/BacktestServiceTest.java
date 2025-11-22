package com.example.demo.service;

import com.example.demo.dto.BacktestRequest;
import com.example.demo.dto.BacktestResult;
import com.example.demo.entity.PriceSnapshot;
import com.example.demo.repository.BacktestRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BacktestServiceTest {
    
    @Mock
    private PriceService priceService;
    
    @Mock
    private BacktestRepository backtestRepository;
    
    @Mock
    private ObjectMapper objectMapper;
    
    @InjectMocks
    private BacktestService backtestService;
    
    private List<PriceSnapshot> testSnapshots;
    
    @BeforeEach
    void setUp() {
        testSnapshots = createTestSnapshots();
        org.springframework.test.util.ReflectionTestUtils.setField(backtestService, "maxDataPoints", 10000);
        org.springframework.test.util.ReflectionTestUtils.setField(backtestService, "maxRangeDays", 365);
    }
    
    @Test
    void runBacktest_ShouldReturnResultWithMetrics() {
        when(priceService.getSnapshots(anyString(), any(Instant.class), any(Instant.class)))
            .thenReturn(testSnapshots);
        when(backtestRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(objectMapper.createObjectNode()).thenReturn(new com.fasterxml.jackson.databind.node.ObjectNode(
            com.fasterxml.jackson.databind.node.JsonNodeFactory.instance));
        
        BacktestRequest request = BacktestRequest.builder()
            .symbol("BTCUSDT")
            .start(Instant.parse("2024-01-01T00:00:00Z"))
            .end(Instant.parse("2024-01-10T00:00:00Z"))
            .strategy(java.util.Map.of("fast", 2, "slow", 3))
            .build();
        
        BacktestResult result = backtestService.runBacktest(request, UUID.randomUUID());
        
        assertThat(result).isNotNull();
        assertThat(result.getSymbol()).isEqualTo("BTCUSDT");
        assertThat(result.getInitialBalance()).isEqualByComparingTo(BigDecimal.valueOf(10000));
        assertThat(result.getTotalTrades()).isGreaterThanOrEqualTo(0);
        assertThat(result.getDataPoints()).isEqualTo(testSnapshots.size());
    }
    
    @Test
    void runBacktest_ShouldThrowWhenSymbolIsMissing() {
        BacktestRequest request = BacktestRequest.builder()
            .start(Instant.parse("2024-01-01T00:00:00Z"))
            .end(Instant.parse("2024-01-10T00:00:00Z"))
            .strategy(java.util.Map.of("fast", 20, "slow", 50))
            .build();
        
        assertThatThrownBy(() -> backtestService.runBacktest(request, UUID.randomUUID()))
            .isInstanceOf(com.example.demo.exception.BadRequestException.class)
            .hasMessageContaining("Symbol is required");
    }
    
    @Test
    void runBacktest_ShouldThrowWhenDateRangeInvalid() {
        BacktestRequest request = BacktestRequest.builder()
            .symbol("BTCUSDT")
            .start(Instant.parse("2024-01-10T00:00:00Z"))
            .end(Instant.parse("2024-01-01T00:00:00Z"))
            .strategy(java.util.Map.of("fast", 20, "slow", 50))
            .build();
        
        assertThatThrownBy(() -> backtestService.runBacktest(request, UUID.randomUUID()))
            .isInstanceOf(com.example.demo.exception.BadRequestException.class)
            .hasMessageContaining("End time must be after start time");
    }
    
    @Test
    void runBacktest_ShouldThrowWhenFastPeriodGreaterThanSlow() {
        BacktestRequest request = BacktestRequest.builder()
            .symbol("BTCUSDT")
            .start(Instant.parse("2024-01-01T00:00:00Z"))
            .end(Instant.parse("2024-01-10T00:00:00Z"))
            .strategy(java.util.Map.of("fast", 50, "slow", 20))
            .build();
        
        assertThatThrownBy(() -> backtestService.runBacktest(request, UUID.randomUUID()))
            .isInstanceOf(com.example.demo.exception.BadRequestException.class)
            .hasMessageContaining("Fast period must be less than slow period");
    }
    
    private List<PriceSnapshot> createTestSnapshots() {
        List<PriceSnapshot> snapshots = new ArrayList<>();
        Instant start = Instant.parse("2024-01-01T00:00:00Z");
        
        BigDecimal[] prices = {
            BigDecimal.valueOf(100),
            BigDecimal.valueOf(102),
            BigDecimal.valueOf(104),
            BigDecimal.valueOf(103),
            BigDecimal.valueOf(105),
            BigDecimal.valueOf(107),
            BigDecimal.valueOf(106),
            BigDecimal.valueOf(108),
            BigDecimal.valueOf(110),
            BigDecimal.valueOf(109)
        };
        
        for (int i = 0; i < prices.length; i++) {
            snapshots.add(PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(start.plusSeconds(i * 86400))
                .close(prices[i])
                .open(prices[i])
                .high(prices[i].multiply(BigDecimal.valueOf(1.01)))
                .low(prices[i].multiply(BigDecimal.valueOf(0.99)))
                .volume(BigDecimal.valueOf(1000))
                .build());
        }
        
        return snapshots;
    }
    
    @Test
    void runBacktest_WithKnownData_ShouldProduceExpectedMetrics() {
        List<PriceSnapshot> knownSnapshots = createKnownTestSnapshots();
        when(priceService.getSnapshots(anyString(), any(Instant.class), any(Instant.class)))
            .thenReturn(knownSnapshots);
        when(backtestRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(objectMapper.createObjectNode()).thenReturn(new com.fasterxml.jackson.databind.node.ObjectNode(
            com.fasterxml.jackson.databind.node.JsonNodeFactory.instance));
        
        BacktestRequest request = BacktestRequest.builder()
            .symbol("BTCUSDT")
            .start(Instant.parse("2024-01-01T00:00:00Z"))
            .end(Instant.parse("2024-01-15T00:00:00Z"))
            .strategy(java.util.Map.of("fast", 2, "slow", 4))
            .build();
        
        BacktestResult result = backtestService.runBacktest(request, UUID.randomUUID());
        
        assertThat(result).isNotNull();
        assertThat(result.getSymbol()).isEqualTo("BTCUSDT");
        assertThat(result.getInitialBalance()).isEqualByComparingTo(BigDecimal.valueOf(10000));
        assertThat(result.getTotalTrades()).isGreaterThan(0);
        assertThat(result.getDataPoints()).isEqualTo(knownSnapshots.size());
        assertThat(result.getReturnPercent()).isNotNull();
        assertThat(result.getWinRate()).isNotNull();
        assertThat(result.getMaxDrawdown()).isNotNull();
    }
    
    private List<PriceSnapshot> createKnownTestSnapshots() {
        List<PriceSnapshot> snapshots = new ArrayList<>();
        Instant start = Instant.parse("2024-01-01T00:00:00Z");
        
        BigDecimal[] prices = {
            BigDecimal.valueOf(100),
            BigDecimal.valueOf(102),
            BigDecimal.valueOf(98),
            BigDecimal.valueOf(101),
            BigDecimal.valueOf(105),
            BigDecimal.valueOf(103),
            BigDecimal.valueOf(107),
            BigDecimal.valueOf(104),
            BigDecimal.valueOf(108),
            BigDecimal.valueOf(110),
            BigDecimal.valueOf(109),
            BigDecimal.valueOf(112),
            BigDecimal.valueOf(111),
            BigDecimal.valueOf(113),
            BigDecimal.valueOf(115)
        };
        
        for (int i = 0; i < prices.length; i++) {
            snapshots.add(PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(start.plusSeconds(i * 86400))
                .close(prices[i])
                .open(prices[i])
                .high(prices[i].multiply(BigDecimal.valueOf(1.01)))
                .low(prices[i].multiply(BigDecimal.valueOf(0.99)))
                .volume(BigDecimal.valueOf(1000))
                .build());
        }
        
        return snapshots;
    }
}

