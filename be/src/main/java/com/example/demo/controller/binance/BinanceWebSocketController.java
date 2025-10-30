package com.example.demo.controller.binance;

import com.example.demo.client.binance.service.BinanceWebSocketClient;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.AuditService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.example.demo.service.CacheService;
import com.example.demo.util.CacheKeyUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/binance/websocket")
@RequiredArgsConstructor
public class BinanceWebSocketController {

    private final BinanceWebSocketClient webSocketClient;
    private final CacheService cacheService;
    private final AuditService auditService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    private UUID getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                String email = auth.getName();
                return userRepository.findByEmail(email).map(User::getId).orElse(null);
            }
        } catch (Exception e) {
            log.debug("Could not get current user", e);
        }
        return null;
    }

    @GetMapping("/price/{symbol}")
    public ResponseEntity<?> getPrice(@PathVariable String symbol) {
        UUID requestId = UUID.randomUUID();
        long startTime = System.currentTimeMillis();
        
        try {
            JsonNode params = objectMapper.createObjectNode().put("symbol", symbol);
            auditService.logRequest(requestId, getCurrentUserId(), "/api/v1/binance/websocket/price/" + symbol, params);
            
            String priceKey = CacheKeyUtil.priceKey(symbol);
            Object price = cacheService.get(priceKey, Object.class).orElse(null);
            
            long latencyMs = System.currentTimeMillis() - startTime;
            
            if (price == null) {
                auditService.finishRequest(requestId, true, "binance-redis", 
                    objectMapper.createObjectNode().put("found", false), latencyMs);
                return ResponseEntity.notFound().build();
            }
            
            auditService.finishRequest(requestId, true, "binance-redis", 
                objectMapper.createObjectNode().put("symbol", symbol).put("found", true), latencyMs);
            
            Map<String, Object> response = new HashMap<>();
            response.put("requestId", requestId.toString());
            response.put("symbol", symbol.toUpperCase());
            response.put("price", price);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, true, "binance-redis", 
                objectMapper.createObjectNode().put("error", e.getMessage()), latencyMs);
            throw e;
        }
    }

    @GetMapping("/trade/{symbol}")
    public ResponseEntity<?> getLatestTrade(@PathVariable String symbol) {
        UUID requestId = UUID.randomUUID();
        long startTime = System.currentTimeMillis();
        
        try {
            JsonNode params = objectMapper.createObjectNode().put("symbol", symbol);
            auditService.logRequest(requestId, getCurrentUserId(), "/api/v1/binance/websocket/trade/" + symbol, params);
            
            String tradeKey = CacheKeyUtil.tradeKey(symbol);
            Object trade = cacheService.get(tradeKey, Object.class).orElse(null);
            
            long latencyMs = System.currentTimeMillis() - startTime;
            
            if (trade == null) {
                auditService.finishRequest(requestId, true, "binance-redis", 
                    objectMapper.createObjectNode().put("found", false), latencyMs);
                return ResponseEntity.notFound().build();
            }
            
            auditService.finishRequest(requestId, true, "binance-redis", 
                objectMapper.createObjectNode().put("symbol", symbol).put("found", true), latencyMs);
            
            Map<String, Object> response = new HashMap<>();
            response.put("requestId", requestId.toString());
            response.put("data", trade);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, true, "binance-redis", 
                objectMapper.createObjectNode().put("error", e.getMessage()), latencyMs);
            throw e;
        }
    }

    @GetMapping("/kline/{symbol}/{interval}")
    public ResponseEntity<?> getLatestKline(
            @PathVariable String symbol,
            @PathVariable String interval) {
        UUID requestId = UUID.randomUUID();
        long startTime = System.currentTimeMillis();
        
        try {
            JsonNode params = objectMapper.createObjectNode()
                    .put("symbol", symbol)
                    .put("interval", interval);
            auditService.logRequest(requestId, getCurrentUserId(), "/api/v1/binance/websocket/kline/" + symbol + "/" + interval, params);
            
            String klineKey = CacheKeyUtil.websocketKlineKey(symbol, interval);
            Object kline = cacheService.get(klineKey, Object.class).orElse(null);
            
            long latencyMs = System.currentTimeMillis() - startTime;
            
            if (kline == null) {
                auditService.finishRequest(requestId, true, "binance-redis", 
                    objectMapper.createObjectNode().put("found", false), latencyMs);
                return ResponseEntity.notFound().build();
            }
            
            auditService.finishRequest(requestId, true, "binance-redis", 
                objectMapper.createObjectNode().put("symbol", symbol).put("interval", interval).put("found", true), latencyMs);
            
            Map<String, Object> response = new HashMap<>();
            response.put("requestId", requestId.toString());
            response.put("data", kline);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, true, "binance-redis", 
                objectMapper.createObjectNode().put("error", e.getMessage()), latencyMs);
            throw e;
        }
    }

    @GetMapping("/depth/{symbol}")
    public ResponseEntity<?> getDepth(@PathVariable String symbol) {
        UUID requestId = UUID.randomUUID();
        long startTime = System.currentTimeMillis();
        
        try {
            JsonNode params = objectMapper.createObjectNode().put("symbol", symbol);
            auditService.logRequest(requestId, getCurrentUserId(), "/api/v1/binance/websocket/depth/" + symbol, params);
            
            String depthKey = CacheKeyUtil.depthKey(symbol);
            Object depth = cacheService.get(depthKey, Object.class).orElse(null);
            
            long latencyMs = System.currentTimeMillis() - startTime;
            
            if (depth == null) {
                auditService.finishRequest(requestId, true, "binance-redis", 
                    objectMapper.createObjectNode().put("found", false), latencyMs);
                return ResponseEntity.notFound().build();
            }
            
            auditService.finishRequest(requestId, true, "binance-redis", 
                objectMapper.createObjectNode().put("symbol", symbol).put("found", true), latencyMs);
            
            Map<String, Object> response = new HashMap<>();
            response.put("requestId", requestId.toString());
            response.put("data", depth);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, true, "binance-redis", 
                objectMapper.createObjectNode().put("error", e.getMessage()), latencyMs);
            throw e;
        }
    }

    @PostMapping("/subscribe/{symbol}/{streamType}")
    public ResponseEntity<?> subscribe(
            @PathVariable String symbol,
            @PathVariable String streamType) {
        UUID requestId = UUID.randomUUID();
        long startTime = System.currentTimeMillis();
        
        try {
            JsonNode params = objectMapper.createObjectNode()
                    .put("symbol", symbol)
                    .put("streamType", streamType);
            auditService.logRequest(requestId, getCurrentUserId(), "/api/v1/binance/websocket/subscribe", params);
            
            webSocketClient.subscribeToSymbol(symbol, streamType);
            
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, false, "binance-websocket", 
                objectMapper.createObjectNode().put("action", "subscribe").put("symbol", symbol), latencyMs);
            
            Map<String, Object> response = new HashMap<>();
            response.put("requestId", requestId.toString());
            response.put("status", "subscribed");
            response.put("symbol", symbol);
            response.put("streamType", streamType);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error subscribing to {}: {}", symbol, e.getMessage());
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, false, "binance-websocket", 
                objectMapper.createObjectNode().put("error", e.getMessage()), latencyMs);
            return ResponseEntity.internalServerError().body(Map.of("error", "Subscription failed: " + e.getMessage(), "requestId", requestId.toString()));
        }
    }

    @DeleteMapping("/unsubscribe/{symbol}/{streamType}")
    public ResponseEntity<?> unsubscribe(
            @PathVariable String symbol,
            @PathVariable String streamType) {
        UUID requestId = UUID.randomUUID();
        long startTime = System.currentTimeMillis();
        
        try {
            JsonNode params = objectMapper.createObjectNode()
                    .put("symbol", symbol)
                    .put("streamType", streamType);
            auditService.logRequest(requestId, getCurrentUserId(), "/api/v1/binance/websocket/unsubscribe", params);
            
            webSocketClient.unsubscribeFromSymbol(symbol, streamType);
            
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, false, "binance-websocket", 
                objectMapper.createObjectNode().put("action", "unsubscribe").put("symbol", symbol), latencyMs);
            
            Map<String, Object> response = new HashMap<>();
            response.put("requestId", requestId.toString());
            response.put("status", "unsubscribed");
            response.put("symbol", symbol);
            response.put("streamType", streamType);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error unsubscribing from {}: {}", symbol, e.getMessage());
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, false, "binance-websocket", 
                objectMapper.createObjectNode().put("error", e.getMessage()), latencyMs);
            return ResponseEntity.internalServerError().body(Map.of("error", "Unsubscribe failed: " + e.getMessage(), "requestId", requestId.toString()));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        UUID requestId = UUID.randomUUID();
        long startTime = System.currentTimeMillis();
        
        try {
            JsonNode params = objectMapper.createObjectNode();
            auditService.logRequest(requestId, getCurrentUserId(), "/api/v1/binance/websocket/status", params);
            
            boolean connected = webSocketClient.isOpen();
            String connectionInfo = webSocketClient.getConnection() != null ? 
                    webSocketClient.getConnection().toString() : "No connection";
            
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, false, "binance-websocket", 
                objectMapper.createObjectNode().put("connected", connected), latencyMs);
            
            Map<String, Object> status = new HashMap<>();
            status.put("requestId", requestId.toString());
            status.put("connected", connected);
            status.put("connectionInfo", connectionInfo);
            
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, false, "binance-websocket", 
                objectMapper.createObjectNode().put("error", e.getMessage()), latencyMs);
            throw e;
        }
    }
}

