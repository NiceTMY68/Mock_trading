package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.client.binance.service.BinanceRestClient;
import com.example.demo.service.CacheService;
import com.example.demo.util.CacheKeyUtil;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
    "binance.api.base-url=http://localhost:8090/api/v3"
})
@TestPropertySource(properties = {
    "binance.api.base-url=http://localhost:8090/api/v3"
})
class BinanceKlinesCacheIntegrationTest extends IntegrationTestBase {
    
    private static WireMockServer wireMockServer;
    
    @Autowired
    private BinanceRestClient binanceRestClient;
    
    @Autowired
    private CacheService cacheService;
    
    @BeforeAll
    static void beforeAll() {
        wireMockServer = new WireMockServer(8090);
        wireMockServer.start();
        WireMock.configureFor("localhost", 8090);
    }
    
    @AfterAll
    static void afterAll() {
        if (wireMockServer != null) {
            wireMockServer.stop();
        }
    }
    
    @BeforeEach
    void setUp() {
        cacheService.clearAll();
        wireMockServer.resetAll();
    }
    
    @Test
    void getKlineData_ShouldCacheResponse_WhenCalledTwice() {
        String symbol = "BTCUSDT";
        String interval = "1h";
        Long startTime = 1609459200000L; // 2021-01-01 00:00:00 UTC
        Long endTime = 1609545600000L;   // 2021-01-02 00:00:00 UTC
        Integer limit = 100;
        
        String mockKlinesResponse = """
            [
              [1609459200000, "29000.00", "29500.00", "28800.00", "29300.00", "100.5", 1609462799999, "2945000.00", 500, "50.25", "1455000.00", "0"],
              [1609462800000, "29300.00", "29800.00", "29100.00", "29600.00", "120.3", 1609466399999, "3556000.00", 600, "60.15", "1780000.00", "0"]
            ]
            """;
        
        String cacheKey = CacheKeyUtil.buildKlinesKey(symbol, interval, startTime, endTime, limit);
        
        // First call - should hit WireMock
        wireMockServer.stubFor(get(urlPathEqualTo("/api/v3/klines"))
                .withQueryParam("symbol", equalTo(symbol))
                .withQueryParam("interval", equalTo(interval))
                .withQueryParam("startTime", equalTo(String.valueOf(startTime)))
                .withQueryParam("endTime", equalTo(String.valueOf(endTime)))
                .withQueryParam("limit", equalTo(String.valueOf(limit)))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(mockKlinesResponse)));
        
        List<Object[]> firstResult = binanceRestClient.getKlineData(symbol, interval, startTime, endTime, limit);
        
        assertThat(firstResult).isNotNull();
        assertThat(firstResult).hasSize(2);
        assertThat(cacheService.exists(cacheKey)).isTrue();
        
        // Verify WireMock was called once
        wireMockServer.verify(1, getRequestedFor(urlPathEqualTo("/api/v3/klines"))
                .withQueryParam("symbol", equalTo(symbol)));
        
        // Second call - should be served from cache, WireMock should not be called again
        wireMockServer.resetRequests();
        
        List<Object[]> secondResult = binanceRestClient.getKlineData(symbol, interval, startTime, endTime, limit);
        
        assertThat(secondResult).isNotNull();
        assertThat(secondResult).hasSize(2);
        assertThat(secondResult.size()).isEqualTo(firstResult.size());
        
        // Verify data matches (compare first element)
        assertThat(secondResult.get(0)[0]).isEqualTo(firstResult.get(0)[0]); // openTime
        assertThat(secondResult.get(0)[1]).isEqualTo(firstResult.get(0)[1]); // open
        
        // Verify WireMock was NOT called again (cache hit)
        wireMockServer.verify(0, getRequestedFor(urlPathEqualTo("/api/v3/klines")));
    }
    
    @Test
    void getKlineData_ShouldUseCacheKey_WithNormalizedParams() {
        String symbol = "btcusdt"; // lowercase
        String interval = "1H"; // uppercase
        Long startTime = 1609459200000L;
        Long endTime = 1609545600000L;
        Integer limit = 50;
        
        String mockKlinesResponse = """
            [
              [1609459200000, "29000.00", "29500.00", "28800.00", "29300.00", "100.5", 1609462799999, "2945000.00", 500, "50.25", "1455000.00", "0"]
            ]
            """;
        
        wireMockServer.stubFor(get(urlPathEqualTo("/api/v3/klines"))
                .withQueryParam("symbol", equalTo("BTCUSDT")) // Should be normalized to uppercase
                .withQueryParam("interval", equalTo("1H"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(mockKlinesResponse)));
        
        List<Object[]> result = binanceRestClient.getKlineData(symbol, interval, startTime, endTime, limit);
        
        assertThat(result).isNotNull();
        assertThat(result.size()).isGreaterThanOrEqualTo(0);
        
        // Verify cache key uses normalized values (symbol and interval are normalized in getKlineData)
        String expectedCacheKey = CacheKeyUtil.buildKlinesKey("BTCUSDT", "1h", startTime, endTime, limit);
        assertThat(cacheService.exists(expectedCacheKey)).isTrue();
    }
}

