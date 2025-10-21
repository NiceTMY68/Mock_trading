package com.example.demo.controller.binance;

import com.example.demo.client.binance.service.BinanceWebSocketClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/binance/websocket")
@RequiredArgsConstructor
public class BinanceWebSocketController {

    private final BinanceWebSocketClient webSocketClient;
    private final RedisTemplate<String, Object> redisTemplate;

    @GetMapping("/price/{symbol}")
    public ResponseEntity<?> getPrice(@PathVariable String symbol) {
        String priceKey = "binance:price:" + symbol.toLowerCase();
        Object price = redisTemplate.opsForValue().get(priceKey);
        
        if (price == null) {
            return ResponseEntity.notFound().build();
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("symbol", symbol.toUpperCase());
        response.put("price", price);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/trade/{symbol}")
    public ResponseEntity<?> getLatestTrade(@PathVariable String symbol) {
        String tradeKey = "binance:trade:" + symbol.toLowerCase();
        Object trade = redisTemplate.opsForValue().get(tradeKey);
        
        if (trade == null) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(trade);
    }

    @GetMapping("/kline/{symbol}/{interval}")
    public ResponseEntity<?> getLatestKline(
            @PathVariable String symbol,
            @PathVariable String interval) {
        String klineKey = "binance:kline:" + symbol.toLowerCase() + ":" + interval;
        Object kline = redisTemplate.opsForValue().get(klineKey);
        
        if (kline == null) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(kline);
    }

    @GetMapping("/depth/{symbol}")
    public ResponseEntity<?> getDepth(@PathVariable String symbol) {
        String depthKey = "binance:depth:" + symbol.toLowerCase();
        Object depth = redisTemplate.opsForValue().get(depthKey);
        
        if (depth == null) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(depth);
    }

    @PostMapping("/subscribe/{symbol}/{streamType}")
    public ResponseEntity<?> subscribe(
            @PathVariable String symbol,
            @PathVariable String streamType) {
        try {
            webSocketClient.subscribeToSymbol(symbol, streamType);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "subscribed");
            response.put("symbol", symbol);
            response.put("streamType", streamType);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error subscribing to {}: {}", symbol, e.getMessage());
            return ResponseEntity.internalServerError().body("Subscription failed: " + e.getMessage());
        }
    }

    @DeleteMapping("/unsubscribe/{symbol}/{streamType}")
    public ResponseEntity<?> unsubscribe(
            @PathVariable String symbol,
            @PathVariable String streamType) {
        try {
            webSocketClient.unsubscribeFromSymbol(symbol, streamType);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "unsubscribed");
            response.put("symbol", symbol);
            response.put("streamType", streamType);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error unsubscribing from {}: {}", symbol, e.getMessage());
            return ResponseEntity.internalServerError().body("Unsubscribe failed: " + e.getMessage());
        }
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("connected", webSocketClient.isOpen());
        status.put("connectionInfo", webSocketClient.getConnection() != null ? 
                webSocketClient.getConnection().toString() : "No connection");
        
        return ResponseEntity.ok(status);
    }
}

