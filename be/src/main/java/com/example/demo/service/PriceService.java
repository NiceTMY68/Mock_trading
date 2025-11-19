package com.example.demo.service;

import com.example.demo.entity.PriceSnapshot;
import com.example.demo.repository.PriceSnapshotRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PriceService {
    
    private final PriceSnapshotRepository priceSnapshotRepository;
    private final ObjectProvider<PriceWebSocketService> priceWebSocketServiceProvider;
    
    @Transactional
    public void persistKlineData(String symbol, List<Object[]> klineData, JsonNode rawMeta) {
        if (klineData == null || klineData.isEmpty()) {
            log.debug("No kline data to persist for symbol: {}", symbol);
            return;
        }
        
        List<PriceSnapshot> snapshots = new ArrayList<>();
        
        for (Object[] kline : klineData) {
            try {
                PriceSnapshot snapshot = createPriceSnapshot(symbol, kline, rawMeta);
                if (snapshot != null) {
                    snapshots.add(snapshot);
                }
            } catch (Exception e) {
                log.warn("Failed to create price snapshot for symbol {}: {}", symbol, e.getMessage());
            }
        }
        
        if (!snapshots.isEmpty()) {
            priceSnapshotRepository.saveAll(snapshots);
            log.info("Persisted {} price snapshots for symbol: {}", snapshots.size(), symbol);
            priceWebSocketServiceProvider.ifAvailable(service -> service.publishSnapshots(symbol, snapshots));
        }
    }
    
    @Transactional
    public void persistTickerData(String symbol, BigDecimal price, BigDecimal volume, JsonNode rawMeta) {
        try {
            PriceSnapshot snapshot = PriceSnapshot.builder()
                    .coinSymbol(symbol.toUpperCase())
                    .timestamp(Instant.now())
                    .close(price)
                    .volume(volume)
                    .rawMeta(rawMeta)
                    .build();
            
            priceSnapshotRepository.save(snapshot);
            log.debug("Persisted ticker snapshot for symbol: {} at price: {}", symbol, price);
            priceWebSocketServiceProvider.ifAvailable(service -> service.publishSnapshot(snapshot));
            
        } catch (Exception e) {
            log.error("Failed to persist ticker data for symbol {}: {}", symbol, e.getMessage());
        }
    }
    
    private PriceSnapshot createPriceSnapshot(String symbol, Object[] kline, JsonNode rawMeta) {
        try {
            // Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
            long openTime = Long.parseLong(kline[0].toString());
            BigDecimal open = new BigDecimal(kline[1].toString());
            BigDecimal high = new BigDecimal(kline[2].toString());
            BigDecimal low = new BigDecimal(kline[3].toString());
            BigDecimal close = new BigDecimal(kline[4].toString());
            BigDecimal volume = new BigDecimal(kline[5].toString());
            
            return PriceSnapshot.builder()
                    .coinSymbol(symbol.toUpperCase())
                    .timestamp(Instant.ofEpochMilli(openTime))
                    .open(open)
                    .high(high)
                    .low(low)
                    .close(close)
                    .volume(volume)
                    .rawMeta(rawMeta)
                    .build();
                    
        } catch (Exception e) {
            log.warn("Failed to parse kline data: {}", e.getMessage());
            return null;
        }
    }
    
    public List<PriceSnapshot> getRecentSnapshots(String symbol, int limit) {
        return priceSnapshotRepository.findByCoinSymbolOrderByTimestampDesc(symbol)
                .stream()
                .limit(limit)
                .toList();
    }
    
    public List<PriceSnapshot> getSnapshotsByTimeRange(String symbol, Instant startTime, Instant endTime) {
        return priceSnapshotRepository.findByCoinSymbolAndTimestampBetweenOrderByTimestampDesc(
                symbol, startTime, endTime);
    }
    
    public List<String> getAvailableSymbols() {
        return priceSnapshotRepository.findDistinctCoinSymbols();
    }
    
    public Long getSnapshotCount(String symbol) {
        return priceSnapshotRepository.countByCoinSymbol(symbol);
    }
    
    @Transactional
    public void cleanupOldSnapshots(String symbol, Instant cutoffTime) {
        priceSnapshotRepository.deleteByCoinSymbolAndTimestampBefore(symbol, cutoffTime);
        log.info("Cleaned up old snapshots for symbol: {} before: {}", symbol, cutoffTime);
    }
    
    public BigDecimal getLatestPrice(String symbol) {
        try {
            PriceSnapshot latestSnapshot = priceSnapshotRepository.findTopByCoinSymbolOrderByTimestampDesc(symbol);
            if (latestSnapshot != null) {
                return latestSnapshot.getClose();
            }
            
            log.warn("No price data found for symbol: {}", symbol);
            return null;
        } catch (Exception e) {
            log.error("Error getting latest price for symbol {}: {}", symbol, e.getMessage(), e);
            return null;
        }
    }
}
