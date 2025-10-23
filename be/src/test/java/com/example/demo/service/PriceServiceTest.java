package com.example.demo.service;

import com.example.demo.entity.PriceSnapshot;
import com.example.demo.repository.PriceSnapshotRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PriceServiceTest {
    
    @Mock
    private PriceSnapshotRepository priceSnapshotRepository;
    
    @Mock
    private ObjectMapper objectMapper;
    
    @InjectMocks
    private PriceService priceService;
    
    private ObjectMapper realObjectMapper;
    
    @BeforeEach
    void setUp() {
        realObjectMapper = new ObjectMapper();
    }
    
    @Test
    void persistKlineData_ShouldSaveSnapshots_WhenValidData() {
        // Given
        String symbol = "BTCUSDT";
        List<Object[]> klineData = List.of(
            new Object[]{1640995200000L, "50000.00", "51000.00", "49000.00", "50500.00", "100.5", 1640995260000L, "5000000", 150L, "50.25", "2500000", "0"},
            new Object[]{1640995260000L, "50500.00", "51500.00", "50000.00", "51200.00", "120.3", 1640995320000L, "6000000", 180L, "60.15", "3000000", "0"}
        );
        JsonNode rawMeta = realObjectMapper.createObjectNode()
                .put("symbol", symbol)
                .put("interval", "1m");
        
        when(priceSnapshotRepository.saveAll(anyList())).thenReturn(List.of());
        
        // When
        priceService.persistKlineData(symbol, klineData, rawMeta);
        
        // Then
        verify(priceSnapshotRepository).saveAll(anyList());
    }
    
    @Test
    void persistKlineData_ShouldNotSave_WhenEmptyData() {
        // Given
        String symbol = "BTCUSDT";
        List<Object[]> emptyData = List.of();
        JsonNode rawMeta = realObjectMapper.createObjectNode();
        
        // When
        priceService.persistKlineData(symbol, emptyData, rawMeta);
        
        // Then
        verify(priceSnapshotRepository, never()).saveAll(anyList());
    }
    
    @Test
    void persistTickerData_ShouldSaveSnapshot_WhenValidData() {
        // Given
        String symbol = "BTCUSDT";
        BigDecimal price = new BigDecimal("50000.00");
        BigDecimal volume = new BigDecimal("100.5");
        JsonNode rawMeta = realObjectMapper.createObjectNode()
                .put("symbol", symbol)
                .put("timestamp", Instant.now().toString());
        
        PriceSnapshot savedSnapshot = PriceSnapshot.builder()
                .coinSymbol(symbol)
                .close(price)
                .volume(volume)
                .rawMeta(rawMeta)
                .build();
        
        when(priceSnapshotRepository.save(any(PriceSnapshot.class))).thenReturn(savedSnapshot);
        
        // When
        priceService.persistTickerData(symbol, price, volume, rawMeta);
        
        // Then
        verify(priceSnapshotRepository).save(any(PriceSnapshot.class));
    }
    
    @Test
    void getRecentSnapshots_ShouldReturnSnapshots_WhenFound() {
        // Given
        String symbol = "BTCUSDT";
        int limit = 10;
        
        PriceSnapshot snapshot1 = PriceSnapshot.builder()
                .coinSymbol(symbol)
                .timestamp(Instant.now().minusSeconds(60))
                .close(new BigDecimal("50000.00"))
                .build();
        
        PriceSnapshot snapshot2 = PriceSnapshot.builder()
                .coinSymbol(symbol)
                .timestamp(Instant.now())
                .close(new BigDecimal("51000.00"))
                .build();
        
        List<PriceSnapshot> mockSnapshots = List.of(snapshot2, snapshot1);
        when(priceSnapshotRepository.findByCoinSymbolOrderByTimestampDesc(symbol))
                .thenReturn(mockSnapshots);
        
        // When
        List<PriceSnapshot> result = priceService.getRecentSnapshots(symbol, limit);
        
        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getClose()).isEqualTo(new BigDecimal("51000.00"));
        verify(priceSnapshotRepository).findByCoinSymbolOrderByTimestampDesc(symbol);
    }
    
    @Test
    void getSnapshotsByTimeRange_ShouldReturnSnapshots_WhenFound() {
        // Given
        String symbol = "BTCUSDT";
        Instant startTime = Instant.now().minusSeconds(3600);
        Instant endTime = Instant.now();
        
        PriceSnapshot snapshot = PriceSnapshot.builder()
                .coinSymbol(symbol)
                .timestamp(Instant.now().minusSeconds(1800))
                .close(new BigDecimal("50000.00"))
                .build();
        
        List<PriceSnapshot> mockSnapshots = List.of(snapshot);
        when(priceSnapshotRepository.findByCoinSymbolAndTimestampBetweenOrderByTimestampDesc(
                symbol, startTime, endTime)).thenReturn(mockSnapshots);
        
        // When
        List<PriceSnapshot> result = priceService.getSnapshotsByTimeRange(symbol, startTime, endTime);
        
        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getClose()).isEqualTo(new BigDecimal("50000.00"));
        verify(priceSnapshotRepository).findByCoinSymbolAndTimestampBetweenOrderByTimestampDesc(
                symbol, startTime, endTime);
    }
    
    @Test
    void getAvailableSymbols_ShouldReturnSymbols_WhenFound() {
        // Given
        List<String> mockSymbols = List.of("BTCUSDT", "ETHUSDT", "ADAUSDT");
        when(priceSnapshotRepository.findDistinctCoinSymbols()).thenReturn(mockSymbols);
        
        // When
        List<String> result = priceService.getAvailableSymbols();
        
        // Then
        assertThat(result).hasSize(3);
        assertThat(result).containsExactly("BTCUSDT", "ETHUSDT", "ADAUSDT");
        verify(priceSnapshotRepository).findDistinctCoinSymbols();
    }
    
    @Test
    void getSnapshotCount_ShouldReturnCount_WhenFound() {
        // Given
        String symbol = "BTCUSDT";
        Long mockCount = 150L;
        when(priceSnapshotRepository.countByCoinSymbol(symbol)).thenReturn(mockCount);
        
        // When
        Long result = priceService.getSnapshotCount(symbol);
        
        // Then
        assertThat(result).isEqualTo(150L);
        verify(priceSnapshotRepository).countByCoinSymbol(symbol);
    }
    
    @Test
    void cleanupOldSnapshots_ShouldDeleteSnapshots_WhenCalled() {
        // Given
        String symbol = "BTCUSDT";
        Instant cutoffTime = Instant.now().minusSeconds(86400); // 24 hours ago
        
        // When
        priceService.cleanupOldSnapshots(symbol, cutoffTime);
        
        // Then
        verify(priceSnapshotRepository).deleteByCoinSymbolAndTimestampBefore(symbol, cutoffTime);
    }
}
