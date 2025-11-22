package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.client.binance.service.BinanceProxyService;
import com.example.demo.dto.KlineParams;
import com.example.demo.entity.PriceSnapshot;
import com.example.demo.repository.PriceSnapshotRepository;
import com.example.demo.service.PriceService;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
    "binance.api.base-url=http://localhost:8092/api/v3"
})
@TestPropertySource(properties = {
    "binance.api.base-url=http://localhost:8092/api/v3"
})
class PriceSnapshotPersistenceIntegrationTest extends IntegrationTestBase {
    
    private static WireMockServer wireMockServer;
    
    @Autowired
    private BinanceProxyService binanceProxyService;
    
    @Autowired
    private PriceService priceService;
    
    @Autowired
    private PriceSnapshotRepository priceSnapshotRepository;
    
    @BeforeAll
    static void beforeAll() {
        wireMockServer = new WireMockServer(8092);
        wireMockServer.start();
        WireMock.configureFor("localhost", 8092);
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
        wireMockServer.resetAll();
    }
    
    @Test
    void getKlines_ShouldPersistPriceSnapshots_WhenFetchingKlines() {
        UUID requestId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .startTime(1609459200000L) // 2021-01-01 00:00:00 UTC
                .endTime(1609545600000L)   // 2021-01-02 00:00:00 UTC
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
        
        // Get initial count (may have existing snapshots from other tests or BinanceRestClient)
        long initialCount = priceSnapshotRepository.countByCoinSymbol("BTCUSDT");
        
        // Fetch klines
        binanceProxyService.getKlines(requestId, userId, params);
        
        // Verify price snapshots were persisted (should have 2 more than initial)
        long finalCount = priceSnapshotRepository.countByCoinSymbol("BTCUSDT");
        assertThat(finalCount).isGreaterThanOrEqualTo(initialCount + 2);
        
        // Verify the new snapshots exist
        List<PriceSnapshot> snapshots = priceSnapshotRepository.findByCoinSymbolOrderByTimestampDesc("BTCUSDT");
        assertThat(snapshots.size()).isGreaterThanOrEqualTo(2);
        
        // Find snapshots with the expected timestamps
        PriceSnapshot snapshot1 = snapshots.stream()
                .filter(s -> s.getTimestamp().equals(Instant.ofEpochMilli(1609459200000L)))
                .findFirst()
                .orElse(null);
        assertThat(snapshot1.getCoinSymbol()).isEqualTo("BTCUSDT");
        assertThat(snapshot1.getTimestamp()).isEqualTo(Instant.ofEpochMilli(1609459200000L));
        assertThat(snapshot1.getOpen()).isEqualByComparingTo("29000.00");
        assertThat(snapshot1.getHigh()).isEqualByComparingTo("29500.00");
        assertThat(snapshot1.getLow()).isEqualByComparingTo("28800.00");
        assertThat(snapshot1.getClose()).isEqualByComparingTo("29300.00");
        assertThat(snapshot1.getVolume()).isEqualByComparingTo("100.5");
        assertThat(snapshot1.getRawMeta()).isNotNull();
        assertThat(snapshot1.getRawMeta().get("interval").asText()).isEqualTo("1h");
        
        // Verify second snapshot
        PriceSnapshot snapshot2 = snapshots.get(0); // First one (ordered desc)
        assertThat(snapshot2.getTimestamp()).isEqualTo(Instant.ofEpochMilli(1609462800000L));
        assertThat(snapshot2.getClose()).isEqualByComparingTo("29600.00");
    }
    
    @Test
    void getSnapshots_ShouldReturnSnapshots_ForTimeRange() {
        // Create test snapshots
        Instant start = Instant.ofEpochMilli(1609459200000L);
        Instant end = Instant.ofEpochMilli(1609545600000L);
        
        PriceSnapshot snapshot1 = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(Instant.ofEpochMilli(1609459200000L))
                .open(new java.math.BigDecimal("29000.00"))
                .high(new java.math.BigDecimal("29500.00"))
                .low(new java.math.BigDecimal("28800.00"))
                .close(new java.math.BigDecimal("29300.00"))
                .volume(new java.math.BigDecimal("100.5"))
                .build();
        
        PriceSnapshot snapshot2 = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(Instant.ofEpochMilli(1609462800000L))
                .open(new java.math.BigDecimal("29300.00"))
                .high(new java.math.BigDecimal("29800.00"))
                .low(new java.math.BigDecimal("29100.00"))
                .close(new java.math.BigDecimal("29600.00"))
                .volume(new java.math.BigDecimal("120.3"))
                .build();
        
        priceSnapshotRepository.saveAll(List.of(snapshot1, snapshot2));
        
        // Get snapshots for time range
        List<PriceSnapshot> snapshots = priceService.getSnapshots("BTCUSDT", start, end);
        
        assertThat(snapshots).hasSize(2);
        assertThat(snapshots.get(0).getTimestamp()).isAfterOrEqualTo(start);
        assertThat(snapshots.get(0).getTimestamp()).isBeforeOrEqualTo(end);
    }
    
    @Test
    void getLatestPrice_ShouldReturnLatestPrice_WhenSnapshotsExist() {
        // Create test snapshots
        PriceSnapshot snapshot1 = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(Instant.ofEpochMilli(1609459200000L))
                .close(new java.math.BigDecimal("29000.00"))
                .build();
        
        PriceSnapshot snapshot2 = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(Instant.ofEpochMilli(1609462800000L))
                .close(new java.math.BigDecimal("30000.00"))
                .build();
        
        priceSnapshotRepository.saveAll(List.of(snapshot1, snapshot2));
        
        // Get latest price
        var latestPrice = priceService.getLatestPrice("BTCUSDT");
        
        assertThat(latestPrice).isPresent();
        assertThat(latestPrice.get()).isEqualByComparingTo("30000.00"); // Latest one
    }
    
    @Test
    void getLatestPrice_ShouldReturnEmpty_WhenNoSnapshotsExist() {
        var latestPrice = priceService.getLatestPrice("ETHUSDT");
        
        assertThat(latestPrice).isEmpty();
    }
}

