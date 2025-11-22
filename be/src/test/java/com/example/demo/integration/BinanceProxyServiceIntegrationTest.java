package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.client.binance.service.BinanceProxyService;
import com.example.demo.dto.KlineParams;
import com.example.demo.dto.KlinesResponseDto;
import com.example.demo.dto.TickerResponseDto;
import com.example.demo.entity.RequestLog;
import com.example.demo.repository.RequestLogRepository;
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

import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
    "binance.api.base-url=http://localhost:8091/api/v3"
})
@TestPropertySource(properties = {
    "binance.api.base-url=http://localhost:8091/api/v3"
})
class BinanceProxyServiceIntegrationTest extends IntegrationTestBase {
    
    private static WireMockServer wireMockServer;
    
    @Autowired
    private BinanceProxyService binanceProxyService;
    
    @Autowired
    private CacheService cacheService;
    
    @Autowired
    private RequestLogRepository requestLogRepository;
    
    @BeforeAll
    static void beforeAll() {
        wireMockServer = new WireMockServer(8091);
        wireMockServer.start();
        WireMock.configureFor("localhost", 8091);
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
        requestLogRepository.deleteAll();
        wireMockServer.resetAll();
    }
    
    @Test
    void getKlines_ShouldReturnRequestId_AndPersistRequestLog() {
        UUID requestId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .startTime(1609459200000L)
                .endTime(1609545600000L)
                .limit(100)
                .build();
        
        String mockKlinesResponse = """
            [
              [1609459200000, "29000.00", "29500.00", "28800.00", "29300.00", "100.5", 1609462799999, "2945000.00", 500, "50.25", "1455000.00", "0"],
              [1609462800000, "29300.00", "29800.00", "29100.00", "29600.00", "120.3", 1609466399999, "3556000.00", 600, "60.15", "1780000.00", "0"]
            ]
            """;
        
        wireMockServer.stubFor(get(urlPathEqualTo("/api/v3/klines"))
                .withQueryParam("symbol", equalTo("BTCUSDT"))
                .withQueryParam("interval", equalTo("1h"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(mockKlinesResponse)));
        
        KlinesResponseDto response = binanceProxyService.getKlines(requestId, userId, params);
        
        // Verify response contains requestId
        assertThat(response).isNotNull();
        assertThat(response.getRequestId()).isEqualTo(requestId);
        assertThat(response.getProvider()).isEqualTo("binance");
        assertThat(response.getParams()).isEqualTo(params);
        assertThat(response.getData()).isNotNull();
        assertThat(response.getData().size()).isGreaterThan(0);
        
        // Verify RequestLog was persisted
        var requestLog = requestLogRepository.findByRequestId(requestId);
        assertThat(requestLog).isPresent();
        assertThat(requestLog.get().getUserId()).isEqualTo(userId);
        assertThat(requestLog.get().getEndpoint()).isEqualTo("/api/v1/binance/market/kline");
        assertThat(requestLog.get().getProvider()).isEqualTo("binance");
        assertThat(requestLog.get().getStatusCode()).isEqualTo(200);
        assertThat(requestLog.get().getLatencyMs()).isGreaterThan(0);
    }
    
    @Test
    void getKlines_ShouldReturnCachedFlag_WhenServedFromCache() {
        UUID requestId1 = UUID.randomUUID();
        UUID requestId2 = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .startTime(1609459200000L)
                .endTime(1609545600000L)
                .limit(100)
                .build();
        
        String mockKlinesResponse = """
            [
              [1609459200000, "29000.00", "29500.00", "28800.00", "29300.00", "100.5", 1609462799999, "2945000.00", 500, "50.25", "1455000.00", "0"]
            ]
            """;
        
        wireMockServer.stubFor(get(urlPathEqualTo("/api/v3/klines"))
                .withQueryParam("symbol", equalTo("BTCUSDT"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(mockKlinesResponse)));
        
        // First call - should not be cached
        KlinesResponseDto response1 = binanceProxyService.getKlines(requestId1, userId, params);
        assertThat(response1.isCached()).isFalse();
        
        // Verify cache key exists
        String cacheKey = CacheKeyUtil.buildKlinesKey(
                params.getSymbol(),
                params.getInterval(),
                params.getStartTime(),
                params.getEndTime(),
                params.getLimit()
        );
        assertThat(cacheService.exists(cacheKey)).isTrue();
        
        // Second call - should be cached
        wireMockServer.resetRequests();
        KlinesResponseDto response2 = binanceProxyService.getKlines(requestId2, userId, params);
        assertThat(response2.isCached()).isTrue();
        
        // Verify WireMock was not called again
        wireMockServer.verify(0, getRequestedFor(urlPathEqualTo("/api/v3/klines")));
        
        // Verify both RequestLogs were persisted
        assertThat(requestLogRepository.findByRequestId(requestId1)).isPresent();
        assertThat(requestLogRepository.findByRequestId(requestId2)).isPresent();
    }
    
    @Test
    void getTicker24h_ShouldReturnRequestId_AndPersistRequestLog() {
        UUID requestId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String symbol = "BTCUSDT";
        
        String mockTickersResponse = """
            [
              {
                "symbol": "BTCUSDT",
                "priceChange": "1000.00",
                "priceChangePercent": "2.5",
                "lastPrice": "41000.00",
                "volume": "25000.5",
                "quoteVolume": "1025000000.00",
                "openTime": 1704067200000,
                "closeTime": 1704153600000
              }
            ]
            """;
        
        wireMockServer.stubFor(get(urlPathEqualTo("/api/v3/ticker/24hr"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(mockTickersResponse)));
        
        TickerResponseDto response = binanceProxyService.getTicker24h(requestId, userId, symbol);
        
        // Verify response contains requestId
        assertThat(response).isNotNull();
        assertThat(response.getRequestId()).isEqualTo(requestId);
        assertThat(response.getProvider()).isEqualTo("binance");
        assertThat(response.getSymbol()).isEqualTo(symbol);
        assertThat(response.getData()).isNotNull();
        assertThat(response.getData().getSymbol()).isEqualTo(symbol);
        
        // Verify RequestLog was persisted
        var requestLog = requestLogRepository.findByRequestId(requestId);
        assertThat(requestLog).isPresent();
        assertThat(requestLog.get().getUserId()).isEqualTo(userId);
        assertThat(requestLog.get().getEndpoint()).isEqualTo("/api/v1/binance/market/ticker/24hr");
        assertThat(requestLog.get().getProvider()).isEqualTo("binance");
        assertThat(requestLog.get().getStatusCode()).isEqualTo(200);
    }
}

