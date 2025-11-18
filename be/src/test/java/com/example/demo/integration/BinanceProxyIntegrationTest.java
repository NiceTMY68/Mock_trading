package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.client.binance.model.BinanceTicker24hr;
import com.example.demo.client.binance.service.BinanceRestClient;
import com.example.demo.entity.PriceSnapshot;
import com.example.demo.repository.PriceSnapshotRepository;
import com.example.demo.service.CacheService;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;
import java.util.List;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

@TestPropertySource(properties = {
    "binance.api.base-url=http://localhost:8089/api/v3",
    "binance.websocket.base-url=ws://localhost:8089/ws"
})
class BinanceProxyIntegrationTest extends IntegrationTestBase {
    
    private static WireMockServer wireMockServer;
    
    @Autowired
    private BinanceRestClient binanceRestClient;
    
    @Autowired
    private PriceSnapshotRepository priceSnapshotRepository;
    
    @Autowired
    private CacheService cacheService;
    
    @BeforeAll
    static void beforeAll() {
        wireMockServer = new WireMockServer(8089);
        wireMockServer.start();
        WireMock.configureFor("localhost", 8089);
    }
    
    @AfterAll
    static void afterAll() {
        if (wireMockServer != null) {
            wireMockServer.stop();
        }
    }
    
    @BeforeEach
    void setUp() {
        priceSnapshotRepository.deleteAll();
        cacheService.clearAll();
        wireMockServer.resetAll();
    }
    
    @Test
    void getTopCoinsByMarketCap_ShouldReturnTickersAndCache() {
        String mockResponse = """
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
              },
              {
                "symbol": "ETHUSDT",
                "priceChange": "50.00",
                "priceChangePercent": "2.0",
                "lastPrice": "2550.00",
                "volume": "50000.0",
                "quoteVolume": "127500000.00",
                "openTime": 1704067200000,
                "closeTime": 1704153600000
              }
            ]
            """;
        
        stubFor(get(urlPathEqualTo("/api/v3/ticker/24hr"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody(mockResponse)));
        
        List<BinanceTicker24hr> tickers = binanceRestClient.getTopCoinsByMarketCap(2);
        
        assertThat(tickers).hasSize(2);
        assertThat(tickers.get(0).getSymbol()).isEqualTo("BTCUSDT");
        assertThat(tickers.get(0).getLastPrice()).isEqualTo("41000.00");
        assertThat(tickers.get(1).getSymbol()).isEqualTo("ETHUSDT");
        
        verify(1, getRequestedFor(urlPathEqualTo("/api/v3/ticker/24hr")));
    }
    
    @Test
    void getKlineData_ShouldFetchAndPersistSnapshots() {
        String mockKlineResponse = """
            [
              [
                1704067200000,
                "40000.00",
                "41000.00",
                "39500.00",
                "40800.00",
                "1500.5",
                1704070800000,
                "61200000.00",
                2500,
                "750.25",
                "30600000.00",
                "0"
              ],
              [
                1704070800000,
                "40800.00",
                "41500.00",
                "40600.00",
                "41200.00",
                "1200.3",
                1704074400000,
                "49440000.00",
                2000,
                "600.15",
                "24720000.00",
                "0"
              ]
            ]
            """;
        
        stubFor(get(urlPathMatching("/api/v3/klines.*"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody(mockKlineResponse)));
        
        List<Object[]> result = binanceRestClient.getKlineData(
            "BTCUSDT", "1h", null, null, 2
        );
        
        assertThat(result).isNotNull();
        assertThat(result).hasSize(2);
        
        List<PriceSnapshot> snapshots = priceSnapshotRepository.findByCoinSymbolOrderByTimestampDesc("BTCUSDT");
        assertThat(snapshots).hasSize(2);
        assertThat(snapshots.get(0).getOpen()).isEqualByComparingTo("40800.00");
        assertThat(snapshots.get(0).getClose()).isEqualByComparingTo("41200.00");
        assertThat(snapshots.get(1).getOpen()).isEqualByComparingTo("40000.00");
        
        verify(1, getRequestedFor(urlPathMatching("/api/v3/klines.*")));
    }
    
    @Test
    void getSymbols_ShouldReturnTradingPairs() {
        String mockExchangeInfo = """
            {
              "symbols": [
                {
                  "symbol": "BTCUSDT",
                  "status": "TRADING",
                  "baseAsset": "BTC",
                  "quoteAsset": "USDT",
                  "filters": []
                },
                {
                  "symbol": "ETHUSDT",
                  "status": "TRADING",
                  "baseAsset": "ETH",
                  "quoteAsset": "USDT",
                  "filters": []
                }
              ]
            }
            """;
        
        stubFor(get(urlPathEqualTo("/api/v3/exchangeInfo"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody(mockExchangeInfo)));
        
        var symbols = binanceRestClient.getAllSymbols();
        
        assertThat(symbols).isNotNull();
        assertThat(symbols).hasSizeGreaterThanOrEqualTo(2);
        
        verify(1, getRequestedFor(urlPathEqualTo("/api/v3/exchangeInfo")));
    }
    
    @Test
    void cacheIntegration_SecondCallShouldUseCache() {
        String mockResponse = """
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
        
        stubFor(get(urlPathEqualTo("/api/v3/ticker/24hr"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody(mockResponse)));
        
        binanceRestClient.getTopCoinsByMarketCap(1);
        binanceRestClient.getTopCoinsByMarketCap(1);
        
        verify(1, getRequestedFor(urlPathEqualTo("/api/v3/ticker/24hr")));
    }
    
    @Test
    void priceSnapshotPersistence_ShouldQueryByTimeRange() {
        Instant now = Instant.now();
        Instant hourAgo = now.minusSeconds(3600);
        
        PriceSnapshot snapshot1 = PriceSnapshot.builder()
            .coinSymbol("BTCUSDT")
            .timestamp(hourAgo)
            .open(java.math.BigDecimal.valueOf(40000))
            .close(java.math.BigDecimal.valueOf(40500))
            .high(java.math.BigDecimal.valueOf(40600))
            .low(java.math.BigDecimal.valueOf(39900))
            .volume(java.math.BigDecimal.valueOf(1000))
            .build();
        
        PriceSnapshot snapshot2 = PriceSnapshot.builder()
            .coinSymbol("BTCUSDT")
            .timestamp(now)
            .open(java.math.BigDecimal.valueOf(40500))
            .close(java.math.BigDecimal.valueOf(41000))
            .high(java.math.BigDecimal.valueOf(41100))
            .low(java.math.BigDecimal.valueOf(40400))
            .volume(java.math.BigDecimal.valueOf(1200))
            .build();
        
        priceSnapshotRepository.save(snapshot1);
        priceSnapshotRepository.save(snapshot2);
        
        List<PriceSnapshot> snapshots = priceSnapshotRepository
            .findByCoinSymbolAndTimestampBetweenOrderByTimestampDesc(
                "BTCUSDT", hourAgo.minusSeconds(60), now.plusSeconds(60)
            );
        
        assertThat(snapshots).hasSize(2);
        assertThat(snapshots.get(0).getTimestamp()).isEqualTo(now);
        assertThat(snapshots.get(1).getTimestamp()).isEqualTo(hourAgo);
    }
}

