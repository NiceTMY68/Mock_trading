package com.example.demo.client.binance.service;

import com.example.demo.client.binance.model.AggTrade;
import com.example.demo.client.binance.model.Depth;
import com.example.demo.client.binance.model.Kline;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class BinanceMessageHandler {

    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, Object> redisTemplate;

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
            
            String redisKey = "binance:trade:" + symbol.toLowerCase();
            redisTemplate.opsForValue().set(redisKey, aggTrade, 60, TimeUnit.SECONDS);
            
            String priceKey = "binance:price:" + symbol.toLowerCase();
            redisTemplate.opsForValue().set(priceKey, aggTrade.getPrice().toString(), 60, TimeUnit.SECONDS);
            
        } catch (Exception e) {
            log.error("Error handling AggTrade: {}", e.getMessage(), e);
        }
    }

    private void handleKline(String streamName, JsonNode data) {
        try {
            Kline kline = objectMapper.treeToValue(data, Kline.class);
            Kline.KlineData k = kline.getKline();
            String symbol = kline.getSymbol();
            
            String redisKey = "binance:kline:" + symbol.toLowerCase() + ":" + k.getInterval();
            redisTemplate.opsForValue().set(redisKey, kline, 60, TimeUnit.SECONDS);
            
        } catch (Exception e) {
            log.error("Error handling Kline: {}", e.getMessage(), e);
        }
    }

    private void handleDepth(String streamName, JsonNode data) {
        try {
            Depth depth = objectMapper.treeToValue(data, Depth.class);
            String symbol = depth.getSymbol();
            
            String redisKey = "binance:depth:" + symbol.toLowerCase();
            redisTemplate.opsForValue().set(redisKey, depth, 10, TimeUnit.SECONDS);
            
        } catch (Exception e) {
            log.error("Error handling Depth: {}", e.getMessage(), e);
        }
    }
}

