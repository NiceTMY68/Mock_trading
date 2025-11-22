package com.example.demo.client.binance.service;

import com.example.demo.config.CacheConfig;
import com.example.demo.dto.KlineParams;
import com.example.demo.dto.KlinesResponseDto;
import com.example.demo.dto.TickerResponseDto;
import com.example.demo.service.AuditService;
import com.example.demo.service.CacheService;
import com.example.demo.util.CacheKeyUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BinanceProxyService {
    
    private final BinanceRestClient binanceRestClient;
    private final CacheService cacheService;
    private final AuditService auditService;
    private final CacheConfig cacheConfig;
    private final ObjectMapper objectMapper;
    
    public KlinesResponseDto getKlines(UUID requestId, UUID userId, KlineParams params) {
        long startTime = System.currentTimeMillis();
        boolean cached = false;
        JsonNode providerMeta = JsonNodeFactory.instance.objectNode();
        
        try {
            // Start audit log
            JsonNode normalizedParams = objectMapper.valueToTree(params);
            auditService.start(requestId, userId, "/api/v1/binance/market/kline", normalizedParams);
            
            // Build cache key
            String cacheKey = CacheKeyUtil.buildKlinesKey(
                    params.getSymbol(),
                    params.getInterval(),
                    params.getStartTime(),
                    params.getEndTime(),
                    params.getLimit()
            );
            
            // Check cache first to determine cached flag
            cached = cacheService.exists(cacheKey);
            if (cached) {
                log.debug("Cache hit for klines: {}", cacheKey);
            }
            
            // Get or fetch data (getOrFetch will handle cache internally)
            List<Object[]> klineData = cacheService.getOrFetch(cacheKey, () -> {
                log.debug("Cache miss, fetching klines from Binance: {}", cacheKey);
                return binanceRestClient.getKlineData(
                        params.getSymbol(),
                        params.getInterval(),
                        params.getStartTime(),
                        params.getEndTime(),
                        params.getLimit()
                );
            }, cacheConfig.getKlinesTtl(), new com.fasterxml.jackson.core.type.TypeReference<List<Object[]>>() {});
            
            // Build provider metadata
            providerMeta = JsonNodeFactory.instance.objectNode()
                    .put("symbol", params.getSymbol())
                    .put("interval", params.getInterval())
                    .put("startTime", params.getStartTime() != null ? params.getStartTime().toString() : "null")
                    .put("endTime", params.getEndTime() != null ? params.getEndTime().toString() : "null")
                    .put("limit", params.getLimit() != null ? params.getLimit().toString() : "null")
                    .put("dataCount", klineData != null ? klineData.size() : 0);
            
            long latencyMs = System.currentTimeMillis() - startTime;
            
            // Finish audit log
            auditService.finish(requestId, "binance", cached, providerMeta, latencyMs, 200);
            
            return KlinesResponseDto.builder()
                    .requestId(requestId)
                    .provider("binance")
                    .cached(cached)
                    .params(params)
                    .data(klineData != null ? klineData : List.of())
                    .build();
                    
        } catch (Exception e) {
            log.error("Error fetching klines: {}", e.getMessage(), e);
            long latencyMs = System.currentTimeMillis() - startTime;
            
            JsonNode errorMeta = JsonNodeFactory.instance.objectNode()
                    .put("error", e.getMessage());
            
            auditService.finish(requestId, "binance", false, errorMeta, latencyMs, 500);
            
            throw new RuntimeException("Failed to fetch klines: " + e.getMessage(), e);
        }
    }
    
    public TickerResponseDto getTicker24h(UUID requestId, UUID userId, String symbol) {
        long startTime = System.currentTimeMillis();
        boolean cached = false;
        JsonNode providerMeta = JsonNodeFactory.instance.objectNode();
        
        try {
            // Start audit log
            JsonNode normalizedParams = JsonNodeFactory.instance.objectNode()
                    .put("symbol", symbol);
            auditService.start(requestId, userId, "/api/v1/binance/market/ticker/24hr", normalizedParams);
            
            // Build cache key
            String cacheKey = CacheKeyUtil.tickerKey(symbol);
            
            // Check cache first to determine cached flag
            cached = cacheService.exists(cacheKey);
            if (cached) {
                log.debug("Cache hit for ticker: {}", cacheKey);
            }
            
            // Get or fetch ticker data
            com.example.demo.client.binance.model.BinanceTicker24hr ticker = cacheService.getOrFetch(cacheKey, () -> {
                log.debug("Cache miss, fetching ticker from Binance: {}", cacheKey);
                // Get all tickers and find the one for this symbol
                List<com.example.demo.client.binance.model.BinanceTicker24hr> allTickers = 
                        binanceRestClient.getAllTicker24hr();
                
                return allTickers.stream()
                        .filter(t -> symbol.equalsIgnoreCase(t.getSymbol()))
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("Ticker not found for symbol: " + symbol));
            }, cacheConfig.getTickerTtl());
            
            // Build provider metadata
            providerMeta = JsonNodeFactory.instance.objectNode()
                    .put("symbol", symbol)
                    .put("lastPrice", ticker.getLastPrice() != null ? ticker.getLastPrice() : "null")
                    .put("priceChangePercent", ticker.getPriceChangePercent() != null ? ticker.getPriceChangePercent() : "null");
            
            long latencyMs = System.currentTimeMillis() - startTime;
            
            // Finish audit log
            auditService.finish(requestId, "binance", cached, providerMeta, latencyMs, 200);
            
            return TickerResponseDto.builder()
                    .requestId(requestId)
                    .provider("binance")
                    .cached(cached)
                    .symbol(symbol)
                    .data(ticker)
                    .build();
                    
        } catch (Exception e) {
            log.error("Error fetching ticker: {}", e.getMessage(), e);
            long latencyMs = System.currentTimeMillis() - startTime;
            
            JsonNode errorMeta = JsonNodeFactory.instance.objectNode()
                    .put("error", e.getMessage());
            
            auditService.finish(requestId, "binance", false, errorMeta, latencyMs, 500);
            
            throw new RuntimeException("Failed to fetch ticker: " + e.getMessage(), e);
        }
    }
}

