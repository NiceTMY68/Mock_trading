package com.example.demo.scheduler;

import com.example.demo.client.binance.model.BinanceTicker24hr;
import com.example.demo.client.binance.service.BinanceRestClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Scheduled job to warm cache by prefetching klines for top symbols.
 * This improves cache hit rates and reduces latency for popular symbols.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CacheWarmingScheduler {

    private final BinanceRestClient binanceRestClient;

    @Value("${app.cache.warming.enabled:true}")
    private boolean enabled;

    @Value("${app.cache.warming.top-symbols-count:10}")
    private int topSymbolsCount;

    @Value("${app.cache.warming.intervals:1m,5m,15m,1h}")
    private String intervals;

    @Value("${app.cache.warming.klines-limit:100}")
    private Integer klinesLimit;

    /**
     * Warm cache by prefetching klines for top symbols.
     * Runs every 5 minutes by default (configurable via app.cache.warming.interval).
     * Uses ShedLock to ensure only one instance runs in distributed deployment.
     */
    @Scheduled(fixedDelayString = "${app.cache.warming.interval:300000}")
    @SchedulerLock(name = "cacheWarming", lockAtMostFor = "PT5M", lockAtLeastFor = "PT30S")
    public void warmCache() {
        if (!enabled) {
            log.debug("Cache warming is disabled");
            return;
        }

        try {
            log.info("Starting cache warming for top {} symbols", topSymbolsCount);

            // Get top symbols from Binance (by market cap)
            List<BinanceTicker24hr> topTickers = binanceRestClient.getTopCoinsByMarketCap(topSymbolsCount);
            
            if (topTickers == null || topTickers.isEmpty()) {
                log.warn("No top symbols found for cache warming");
                return;
            }

            // Parse intervals
            String[] intervalArray = intervals.split(",");
            
            // Calculate time range (last 24 hours)
            long endTime = Instant.now().toEpochMilli();
            long startTime = Instant.now().minus(24, ChronoUnit.HOURS).toEpochMilli();

            int warmedCount = 0;
            int errorCount = 0;

            // Warm cache for each symbol and interval
            for (BinanceTicker24hr ticker : topTickers) {
                String symbol = ticker.getSymbol();
                
                for (String interval : intervalArray) {
                    interval = interval.trim();
                    try {
                        // Fetch klines (this will cache them via BinanceRestClient)
                        binanceRestClient.getKlineData(
                                symbol,
                                interval,
                                startTime,
                                endTime,
                                klinesLimit
                        );
                        
                        warmedCount++;
                        log.debug("Warmed cache for {} {}", symbol, interval);
                        
                    } catch (Exception e) {
                        errorCount++;
                        log.warn("Failed to warm cache for {} {}: {}", symbol, interval, e.getMessage());
                    }
                }
            }

            log.info("Cache warming completed: {} entries warmed, {} errors", warmedCount, errorCount);

        } catch (Exception e) {
            log.error("Error during cache warming", e);
        }
    }
}

