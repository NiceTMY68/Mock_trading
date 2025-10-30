package com.example.demo.client.binance.service;

import com.example.demo.client.binance.model.AggTrade;
import com.example.demo.client.binance.model.Depth;
import com.example.demo.client.binance.model.Kline;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.example.demo.service.CacheService;
import com.example.demo.config.CacheConfig;
import com.example.demo.util.CacheKeyUtil;
import org.springframework.stereotype.Service;


@Slf4j
@Service
@RequiredArgsConstructor
public class BinanceMessageHandler {

    private final ObjectMapper objectMapper;
    private final CacheService cacheService;

    public void handleMessage(String message) {
        try {
            JsonNode root = objectMapper.readTree(message);
            
            if (root.has("stream") && root.has("data")) {
                String streamName = root.get("stream").asText();
                JsonNode data = root.get("data");
                processStream(streamName, data);
            }
        } catch (Exception e) {
            log.error("Error handling message: {}", e.getMessage(), e);
        }
    }

    private void processStream(String streamName, JsonNode data) {
        try {
            if (streamName.contains("@aggTrade")) {
                handleAggTrade(streamName, data);
            } else if (streamName.contains("@kline_")) {
                handleKline(streamName, data);
            } else if (streamName.contains("@depth")) {
                handleDepth(streamName, data);
            }
        } catch (Exception e) {
            log.error("Error processing stream {}: {}", streamName, e.getMessage(), e);
        }
    }

    private void handleAggTrade(String streamName, JsonNode data) {
        try {
            AggTrade aggTrade = objectMapper.treeToValue(data, AggTrade.class);
            String symbol = aggTrade.getSymbol();
            
            String tradeKey = CacheKeyUtil.tradeKey(symbol);
            cacheService.put(tradeKey, aggTrade, CacheConfig.MARKET_DATA_TTL);
            
            String priceKey = CacheKeyUtil.priceKey(symbol);
            cacheService.put(priceKey, aggTrade.getPrice().toString(), CacheConfig.MARKET_DATA_TTL);
            
        } catch (Exception e) {
            log.error("Error handling AggTrade: {}", e.getMessage(), e);
        }
    }

    private void handleKline(String streamName, JsonNode data) {
        try {
            Kline kline = objectMapper.treeToValue(data, Kline.class);
            Kline.KlineData k = kline.getKline();
            String symbol = kline.getSymbol();
            
            String redisKey = CacheKeyUtil.websocketKlineKey(symbol, k.getInterval());
            cacheService.put(redisKey, kline, CacheConfig.KLINE_TTL);
            
        } catch (Exception e) {
            log.error("Error handling Kline: {}", e.getMessage(), e);
        }
    }

    private void handleDepth(String streamName, JsonNode data) {
        try {
            Depth depth = objectMapper.treeToValue(data, Depth.class);
            String symbol = depth.getSymbol();
            
            String redisKey = CacheKeyUtil.depthKey(symbol);
            cacheService.put(redisKey, depth, CacheConfig.MARKET_DATA_TTL);
            
        } catch (Exception e) {
            log.error("Error handling Depth: {}", e.getMessage(), e);
        }
    }
}

