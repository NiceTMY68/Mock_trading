package com.example.demo.integration;

import com.example.demo.client.binance.service.BinanceRestClient;
import com.example.demo.config.TestConfig;
import com.example.demo.entity.PriceSnapshot;
import com.example.demo.repository.PriceSnapshotRepository;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@Rollback
@Import({TestConfig.class, PriceSnapshotIntegrationTest.TestWireMockConfig.class})
class PriceSnapshotIntegrationTest {
    
    private static WireMockServer wireMockServer;
    
    @Autowired
    private BinanceRestClient binanceRestClient;
    
    @Autowired
    private PriceSnapshotRepository priceSnapshotRepository;
    
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
        wireMockServer = new WireMockServer(8089);
        wireMockServer.start();
        WireMock.configureFor("localhost", 8089);
        
        priceSnapshotRepository.deleteAll();
    }
    
    @AfterEach
    void tearDown() {
        wireMockServer.stop();
    }
    
    @Test
    void getKlineData_ShouldPersistPriceSnapshots_WhenValidResponse() {
        // Given - Mock Binance klines API response
        String mockResponse = """
                [
                    [
                        1640995200000,
                        "50000.00",
                        "51000.00",
                        "49000.00",
                        "50500.00",
                        "100.5",
                        1640995260000,
                        "5000000",
                        150,
                        "50.25",
                        "2500000",
                        "0"
                    ],
                    [
                        1640995260000,
                        "50500.00",
                        "51500.00",
                        "50000.00",
                        "51200.00",
                        "120.3",
                        1640995320000,
                        "6000000",
                        180,
                        "60.15",
                        "3000000",
                        "0"
                    ]
                ]
                """;
        
        stubFor(get(urlMatching("/api/v3/klines\\?symbol=BTCUSDT&interval=1h.*"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(mockResponse)));
        
        // When
        List<Object[]> klineData = binanceRestClient.getKlineData("BTCUSDT", "1h", null, null, 100);
        
        // Then
        assertThat(klineData).hasSize(2);
        
        // Verify PriceSnapshots were persisted
        List<PriceSnapshot> snapshots = priceSnapshotRepository.findAll();
        assertThat(snapshots).hasSize(2);
        
        // Verify first snapshot
        PriceSnapshot firstSnapshot = snapshots.stream()
                .filter(s -> s.getTimestamp().equals(Instant.ofEpochMilli(1640995200000L)))
                .findFirst()
                .orElseThrow();
        
        assertThat(firstSnapshot.getCoinSymbol()).isEqualTo("BTCUSDT");
        assertThat(firstSnapshot.getOpen()).isEqualTo(new BigDecimal("50000.00"));
        assertThat(firstSnapshot.getHigh()).isEqualTo(new BigDecimal("51000.00"));
        assertThat(firstSnapshot.getLow()).isEqualTo(new BigDecimal("49000.00"));
        assertThat(firstSnapshot.getClose()).isEqualTo(new BigDecimal("50500.00"));
        assertThat(firstSnapshot.getVolume()).isEqualTo(new BigDecimal("100.5"));
        assertThat(firstSnapshot.getRawMeta()).isNotNull();
        
        // Verify second snapshot
        PriceSnapshot secondSnapshot = snapshots.stream()
                .filter(s -> s.getTimestamp().equals(Instant.ofEpochMilli(1640995260000L)))
                .findFirst()
                .orElseThrow();
        
        assertThat(secondSnapshot.getCoinSymbol()).isEqualTo("BTCUSDT");
        assertThat(secondSnapshot.getOpen()).isEqualTo(new BigDecimal("50500.00"));
        assertThat(secondSnapshot.getHigh()).isEqualTo(new BigDecimal("51500.00"));
        assertThat(secondSnapshot.getLow()).isEqualTo(new BigDecimal("50000.00"));
        assertThat(secondSnapshot.getClose()).isEqualTo(new BigDecimal("51200.00"));
        assertThat(secondSnapshot.getVolume()).isEqualTo(new BigDecimal("120.3"));
        
        // Verify API was called
        verify(1, getRequestedFor(urlMatching("/api/v3/klines\\?symbol=BTCUSDT&interval=1h.*")));
    }
    
    @Test
    void getKlineData_ShouldNotPersist_WhenEmptyResponse() {
        // Given - Mock empty response
        String mockResponse = "[]";
        
        stubFor(get(urlMatching("/api/v3/klines\\?symbol=ETHUSDT&interval=1m.*"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(mockResponse)));
        
        // When
        List<Object[]> klineData = binanceRestClient.getKlineData("ETHUSDT", "1m", null, null, 10);
        
        // Then
        assertThat(klineData).isEmpty();
        
        // Verify no PriceSnapshots were persisted
        List<PriceSnapshot> snapshots = priceSnapshotRepository.findAll();
        assertThat(snapshots).isEmpty();
    }
    
    @Test
    void getKlineData_ShouldHandleError_WhenAPIFails() {
        // Given - Mock API error
        stubFor(get(urlMatching("/api/v3/klines\\?symbol=INVALID&interval=1h.*"))
                .willReturn(aResponse()
                        .withStatus(400)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"code\":-1121,\"msg\":\"Invalid symbol.\"}")));
        
        // When
        List<Object[]> klineData = binanceRestClient.getKlineData("INVALID", "1h", null, null, 10);
        
        // Then
        assertThat(klineData).isEmpty();
        
        // Verify no PriceSnapshots were persisted
        List<PriceSnapshot> snapshots = priceSnapshotRepository.findAll();
        assertThat(snapshots).isEmpty();
    }
    
    @Test
    void getKlineData_ShouldPersistWithTimeRange_WhenStartAndEndTimeProvided() {
        // Given
        String mockResponse = """
                [
                    [
                        1640995200000,
                        "50000.00",
                        "51000.00",
                        "49000.00",
                        "50500.00",
                        "100.5",
                        1640995260000,
                        "5000000",
                        150,
                        "50.25",
                        "2500000",
                        "0"
                    ]
                ]
                """;
        
        Long startTime = 1640995200000L;
        Long endTime = 1640995260000L;
        
        stubFor(get(urlMatching("/api/v3/klines\\?symbol=BTCUSDT&interval=1h&startTime=1640995200000&endTime=1640995260000.*"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(mockResponse)));
        
        // When
        List<Object[]> klineData = binanceRestClient.getKlineData("BTCUSDT", "1h", startTime, endTime, 100);
        
        // Then
        assertThat(klineData).hasSize(1);
        
        // Verify PriceSnapshot was persisted with correct metadata
        List<PriceSnapshot> snapshots = priceSnapshotRepository.findAll();
        assertThat(snapshots).hasSize(1);
        
        PriceSnapshot snapshot = snapshots.get(0);
        assertThat(snapshot.getCoinSymbol()).isEqualTo("BTCUSDT");
        assertThat(snapshot.getRawMeta()).isNotNull();
        assertThat(snapshot.getRawMeta().get("startTime").asText()).isEqualTo("1640995200000");
        assertThat(snapshot.getRawMeta().get("endTime").asText()).isEqualTo("1640995260000");
    }
}
