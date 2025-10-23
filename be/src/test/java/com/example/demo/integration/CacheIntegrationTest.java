package com.example.demo.integration;

import com.example.demo.client.binance.model.BinanceSymbolInfo;
import com.example.demo.client.binance.model.BinanceTicker24hr;
import com.example.demo.client.binance.service.BinanceRestClient;
import com.example.demo.config.TestConfig;
import com.example.demo.service.CacheService;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test for caching behavior using WireMock
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@Rollback
@Import({TestConfig.class, CacheIntegrationTest.TestWireMockConfig.class})
class CacheIntegrationTest {
    
    private static WireMockServer wireMockServer;
    
    @Autowired
    private BinanceRestClient binanceRestClient;
    
    @Autowired
    private CacheService cacheService;
    
    @Configuration
    static class TestWireMockConfig {
        @Bean
        @Primary
        public RestTemplate testRestTemplate() {
            return new RestTemplate();
        }
    }
    
    @BeforeEach
    void setUp() {
        // Start WireMock server
        wireMockServer = new WireMockServer(8089);
        wireMockServer.start();
        WireMock.configureFor("localhost", 8089);
        
        // Clear cache before each test
        cacheService.clearAll();
    }
    
    @AfterEach
    void tearDown() {
        wireMockServer.stop();
    }
    
    @Test
    void getAllTicker24hr_ShouldCacheResult_AndNotCallProviderOnSecondRequest() {
        // Given - Mock Binance API response
        String mockResponse = """
                [
                    {
                        "symbol": "BTCUSDT",
                        "priceChange": "100.50",
                        "priceChangePercent": "0.50",
                        "lastPrice": "50000.00",
                        "volume": "1000.00",
                        "quoteVolume": "50000000.00"
                    },
                    {
                        "symbol": "ETHUSDT",
                        "priceChange": "50.25",
                        "priceChangePercent": "1.25",
                        "lastPrice": "4000.00",
                        "volume": "500.00",
                        "quoteVolume": "2000000.00"
                    }
                ]
                """;
        
        stubFor(get(urlEqualTo("/api/v3/ticker/24hr"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(mockResponse)));
        
        // When - First call (cache miss)
        List<BinanceTicker24hr> firstResult = binanceRestClient.getAllTicker24hr();
        
        // Then - Verify first call
        assertThat(firstResult).isNotEmpty();
        assertThat(firstResult).hasSize(2);
        assertThat(firstResult.get(0).getSymbol()).isEqualTo("BTCUSDT");
        
        // Verify API was called once
        verify(1, getRequestedFor(urlEqualTo("/api/v3/ticker/24hr")));
        
        // When - Second call (cache hit)
        List<BinanceTicker24hr> secondResult = binanceRestClient.getAllTicker24hr();
        
        // Then - Verify second call returns cached data
        assertThat(secondResult).isEqualTo(firstResult);
        
        // Verify API was still only called once (cached on second call)
        verify(1, getRequestedFor(urlEqualTo("/api/v3/ticker/24hr")));
    }
    
    @Test
    void getAllSymbols_ShouldCacheResult_AndNotCallProviderOnSecondRequest() {
        // Given - Mock Binance API response
        String mockResponse = """
                {
                    "timezone": "UTC",
                    "serverTime": 1639584000000,
                    "symbols": [
                        {
                            "symbol": "BTCUSDT",
                            "status": "TRADING",
                            "baseAsset": "BTC",
                            "quoteAsset": "USDT"
                        },
                        {
                            "symbol": "ETHUSDT",
                            "status": "TRADING",
                            "baseAsset": "ETH",
                            "quoteAsset": "USDT"
                        }
                    ]
                }
                """;
        
        stubFor(get(urlEqualTo("/api/v3/exchangeInfo"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(mockResponse)));
        
        // When - First call (cache miss)
        List<BinanceSymbolInfo> firstResult = binanceRestClient.getAllSymbols();
        
        // Then - Verify first call
        assertThat(firstResult).isNotEmpty();
        assertThat(firstResult).hasSize(2);
        assertThat(firstResult.get(0).getSymbol()).isEqualTo("BTCUSDT");
        
        // Verify API was called once
        verify(1, getRequestedFor(urlEqualTo("/api/v3/exchangeInfo")));
        
        // When - Second call (cache hit)
        List<BinanceSymbolInfo> secondResult = binanceRestClient.getAllSymbols();
        
        // Then - Verify second call returns cached data
        assertThat(secondResult).isEqualTo(firstResult);
        
        // Verify API was still only called once (cached on second call)
        verify(1, getRequestedFor(urlEqualTo("/api/v3/exchangeInfo")));
    }
    
    @Test
    void getTopCoinsByMarketCap_ShouldCacheIndependently_FromGetAllTicker() {
        // Given - Mock Binance API response
        String mockResponse = """
                [
                    {
                        "symbol": "BTCUSDT",
                        "priceChange": "100.50",
                        "priceChangePercent": "0.50",
                        "lastPrice": "50000.00",
                        "volume": "1000.00",
                        "quoteVolume": "50000000.00"
                    },
                    {
                        "symbol": "ETHUSDT",
                        "priceChange": "50.25",
                        "priceChangePercent": "1.25",
                        "lastPrice": "4000.00",
                        "volume": "500.00",
                        "quoteVolume": "2000000.00"
                    }
                ]
                """;
        
        stubFor(get(urlEqualTo("/api/v3/ticker/24hr"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(mockResponse)));
        
        // When - Call getTopCoinsByMarketCap (uses getAllTicker24hr internally)
        List<BinanceTicker24hr> topCoins1 = binanceRestClient.getTopCoinsByMarketCap(3);
        
        // API should be called once
        verify(1, getRequestedFor(urlEqualTo("/api/v3/ticker/24hr")));
        
        // When - Call getTopCoinsByMarketCap again with same limit
        List<BinanceTicker24hr> topCoins2 = binanceRestClient.getTopCoinsByMarketCap(3);
        
        // Then - Should use cached top coins result
        assertThat(topCoins2).isEqualTo(topCoins1);
        // API should still be called only once (both getAllTicker and topCoins are cached)
        verify(1, getRequestedFor(urlEqualTo("/api/v3/ticker/24hr")));
    }
    
    @Test
    void cacheService_ShouldEvictPattern_WhenEvictingMultipleKeys() {
        // Given - Put multiple items in cache
        cacheService.put("binance:ticker:BTC", "value1");
        cacheService.put("binance:ticker:ETH", "value2");
        cacheService.put("binance:symbol:BTC", "value3");
        
        // Verify all exist
        assertThat(cacheService.exists("binance:ticker:BTC")).isTrue();
        assertThat(cacheService.exists("binance:ticker:ETH")).isTrue();
        assertThat(cacheService.exists("binance:symbol:BTC")).isTrue();
        
        // When - Evict all ticker keys
        cacheService.evictPattern("binance:ticker:*");
        
        // Then - Only ticker keys should be evicted
        assertThat(cacheService.exists("binance:ticker:BTC")).isFalse();
        assertThat(cacheService.exists("binance:ticker:ETH")).isFalse();
        assertThat(cacheService.exists("binance:symbol:BTC")).isTrue(); // Should still exist
    }
}

