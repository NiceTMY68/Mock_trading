package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.client.binance.model.BinanceTicker24hr;
import com.example.demo.client.binance.service.BinanceRestClient;
import com.example.demo.scheduler.CacheWarmingScheduler;
import com.example.demo.service.CacheService;
import com.example.demo.util.CacheKeyUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.client.RestTemplate;
import com.example.demo.service.PriceService;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Integration test for cache warming scheduler.
 * Verifies that cache warming prefetches klines for top symbols and populates cache.
 */
@TestPropertySource(properties = {
    "app.cache.warming.enabled=true",
    "app.cache.warming.top-symbols-count=3",
    "app.cache.warming.intervals=1m,5m",
    "app.cache.warming.klines-limit=10",
    "app.cache.warming.interval=999999999", // Disable auto-scheduling for test
    "app.limit.matcher.delay=999999999",
    "app.alert.checker.delay=999999999"
})
class CacheWarmingIntegrationTest extends IntegrationTestBase {

    @Autowired
    private CacheService cacheService;

    @Autowired
    private CacheWarmingScheduler cacheWarmingScheduler;

    @SpyBean
    private BinanceRestClient binanceRestClient;

    @MockBean
    private RestTemplate restTemplate;

    @MockBean
    private PriceService priceService;

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
        
        // Clear cache before each test
        cacheService.clearAll();
    }

    @Test
    void cacheWarming_ShouldPrefetchKlinesForTopSymbols() throws Exception {
        // Mock top symbols from Binance
        BinanceTicker24hr mockTicker1 = new BinanceTicker24hr();
        mockTicker1.setSymbol("BTCUSDT");
        BinanceTicker24hr mockTicker2 = new BinanceTicker24hr();
        mockTicker2.setSymbol("ETHUSDT");
        BinanceTicker24hr mockTicker3 = new BinanceTicker24hr();
        mockTicker3.setSymbol("BNBUSDT");

        when(binanceRestClient.getTopCoinsByMarketCap(3))
                .thenReturn(List.of(mockTicker1, mockTicker2, mockTicker3));

        // Calculate expected time range (last 24 hours)
        long endTime = Instant.now().toEpochMilli();
        long startTime = Instant.now().minus(24, ChronoUnit.HOURS).toEpochMilli();

        // Mock Binance API response for klines
        // Format: [[openTime, open, high, low, close, volume, closeTime, ...], ...]
        String mockKlineResponse = "[["
                + System.currentTimeMillis() + ","
                + "\"50000\",\"50100\",\"49900\",\"50050\",\"100.5\","
                + (System.currentTimeMillis() + 60000) + ","
                + "\"1000000\",100,\"50\",\"500000\",\"0\""
                + "]]";

        // Mock RestTemplate to return mock kline data
        // This allows getKlineData() to run and cache the data via cacheService.getOrFetch()
        when(restTemplate.getForObject(anyString(), eq(String.class)))
                .thenReturn(mockKlineResponse);

        // Manually trigger cache warming by calling the scheduler method
        cacheWarmingScheduler.warmCache();

        // Verify that getTopCoinsByMarketCap was called with correct count
        verify(binanceRestClient, times(1)).getTopCoinsByMarketCap(3);

        // Verify that getKlineData was called for each symbol and interval
        // 3 symbols × 2 intervals = 6 calls
        verify(binanceRestClient, times(6)).getKlineData(
                anyString(), 
                anyString(), 
                eq(startTime), 
                eq(endTime), 
                eq(10)
        );

        // Verify specific calls for each symbol and interval
        verify(binanceRestClient).getKlineData(eq("BTCUSDT"), eq("1m"), eq(startTime), eq(endTime), eq(10));
        verify(binanceRestClient).getKlineData(eq("BTCUSDT"), eq("5m"), eq(startTime), eq(endTime), eq(10));
        verify(binanceRestClient).getKlineData(eq("ETHUSDT"), eq("1m"), eq(startTime), eq(endTime), eq(10));
        verify(binanceRestClient).getKlineData(eq("ETHUSDT"), eq("5m"), eq(startTime), eq(endTime), eq(10));
        verify(binanceRestClient).getKlineData(eq("BNBUSDT"), eq("1m"), eq(startTime), eq(endTime), eq(10));
        verify(binanceRestClient).getKlineData(eq("BNBUSDT"), eq("5m"), eq(startTime), eq(endTime), eq(10));

        // Verify cache keys were created and populated
        // Since getKlineData() runs (not mocked), cacheService.getOrFetch() will execute and cache the data
        String cacheKey1 = CacheKeyUtil.buildKlinesKey("BTCUSDT", "1m", startTime, endTime, 10);
        String cacheKey2 = CacheKeyUtil.buildKlinesKey("BTCUSDT", "5m", startTime, endTime, 10);
        String cacheKey3 = CacheKeyUtil.buildKlinesKey("ETHUSDT", "1m", startTime, endTime, 10);

        // Verify cache entries exist (getKlineData should have cached them via cacheService.getOrFetch())
        assertThat(cacheService.exists(cacheKey1)).isTrue();
        assertThat(cacheService.exists(cacheKey2)).isTrue();
        assertThat(cacheService.exists(cacheKey3)).isTrue();

        // Verify cached data can be retrieved
        var cachedData1 = cacheService.get(cacheKey1, new com.fasterxml.jackson.core.type.TypeReference<List<Object[]>>() {});
        assertThat(cachedData1).isPresent();
        assertThat(cachedData1.get()).isInstanceOf(List.class);
        assertThat(cachedData1.get()).isNotEmpty();
        
        // This test now VERIFIES BOTH:
        // ✅ Scheduler logic (calls correct methods with correct params)
        // ✅ Cache population (cache entries are created and can be retrieved)
    }

    @Test
    void cacheWarming_WhenDisabled_ShouldNotWarmCache() {
        // Disable cache warming via reflection
        org.springframework.test.util.ReflectionTestUtils.setField(cacheWarmingScheduler, "enabled", false);

        // Call warmCache
        cacheWarmingScheduler.warmCache();

        // Verify no calls were made
        verify(binanceRestClient, never()).getTopCoinsByMarketCap(anyInt());
        verify(binanceRestClient, never()).getKlineData(anyString(), anyString(), anyLong(), anyLong(), anyInt());
    }

    @Test
    void cacheWarming_WhenNoTopSymbols_ShouldNotWarmCache() throws Exception {
        // Mock empty top symbols
        when(binanceRestClient.getTopCoinsByMarketCap(3))
                .thenReturn(List.of());

        // Call warmCache
        cacheWarmingScheduler.warmCache();

        // Verify getTopCoinsByMarketCap was called
        verify(binanceRestClient, times(1)).getTopCoinsByMarketCap(3);

        // Verify getKlineData was never called (no symbols to warm)
        verify(binanceRestClient, never()).getKlineData(anyString(), anyString(), anyLong(), anyLong(), anyInt());
    }
}

