package com.example.demo.controller.binance;

import com.example.demo.client.binance.model.BinanceSymbolInfo;
import com.example.demo.client.binance.model.BinanceTicker24hr;
import com.example.demo.client.binance.service.BinanceRestClient;
import com.example.demo.dto.KlineParams;
import com.example.demo.entity.User;
import com.example.demo.exception.BadRequestException;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.AuditService;
import com.example.demo.service.FeatureFlagService;
import com.example.demo.util.ParamNormalizer;
import com.example.demo.util.AuditLoggingHelper;
import com.example.demo.util.ParamValidator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/binance/market")
@RequiredArgsConstructor
public class BinanceMarketController {

    private final BinanceRestClient binanceRestClient;
    private final AuditService auditService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final ParamNormalizer paramNormalizer;
    private final ParamValidator paramValidator;
    private final FeatureFlagService featureFlagService;
    private final AuditLoggingHelper auditLoggingHelper;

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
    
    private User getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                String email = auth.getName();
                return userRepository.findByEmail(email).orElse(null);
            }
        } catch (Exception e) {
            log.debug("Could not get current user", e);
        }
        return null;
    }

    @GetMapping("/top-3")
    public ResponseEntity<?> getTop3Coins() {
        var ctx = auditLoggingHelper.start("/api/v1/binance/market/top-3", getCurrentUserId(), objectMapper.createObjectNode());
        try {
            // Execute business logic
            List<BinanceTicker24hr> top3 = binanceRestClient.getTopCoinsByMarketCap(3);
            JsonNode providerMeta = objectMapper.createObjectNode().put("count", top3.size());
            auditLoggingHelper.finishSuccess(ctx, "binance", providerMeta);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("requestId", ctx.requestId().toString());
            response.put("data", top3);
            response.put("count", top3.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting top 3 coins: {}", e.getMessage(), e);
            auditLoggingHelper.finishError(ctx, "binance", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "requestId", ctx.requestId().toString(), "error", e.getMessage()));
        }
    }

    @GetMapping("/top")
    public ResponseEntity<?> getTopCoins(
            @RequestParam int limit,
            @RequestParam String sortBy) {
        var ctx = auditLoggingHelper.start("/api/v1/binance/market/top", getCurrentUserId(), objectMapper.createObjectNode().put("limit", limit).put("sortBy", sortBy));
        try {
            List<BinanceTicker24hr> topCoins;
            
            switch (sortBy.toLowerCase()) {
                case "marketcap" -> topCoins = binanceRestClient.getTopCoinsByMarketCap(limit);
                case "volume" -> topCoins = binanceRestClient.getTopCoinsByVolume(limit);
                case "gainers" -> topCoins = binanceRestClient.getTopGainers(limit);
                case "losers" -> topCoins = binanceRestClient.getTopLosers(limit);
                default -> {
                    auditLoggingHelper.finishError(ctx, "binance", "Invalid sortBy parameter");
                    return ResponseEntity.badRequest()
                            .body(Map.of("success", false, "requestId", ctx.requestId().toString(), "error", "Invalid sortBy parameter"));
                }
            }
            
            JsonNode providerMeta = objectMapper.createObjectNode()
                    .put("count", topCoins.size())
                    .put("sortBy", sortBy);
            auditLoggingHelper.finishSuccess(ctx, "binance", providerMeta);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("requestId", ctx.requestId().toString());
            response.put("data", topCoins);
            response.put("count", topCoins.size());
            response.put("sortBy", sortBy);
            response.put("limit", limit);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting top coins: {}", e.getMessage(), e);
            auditLoggingHelper.finishError(ctx, "binance", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "requestId", ctx.requestId().toString(), "error", e.getMessage()));
        }
    }

    @GetMapping("/all")
    public ResponseEntity<?> getAllCoins(
            @RequestParam int page,
            @RequestParam int size,
            @RequestParam String sortBy) {
        var ctx = auditLoggingHelper.start("/api/v1/binance/market/all", getCurrentUserId(), objectMapper.createObjectNode().put("page", page).put("size", size).put("sortBy", sortBy));
        try {
            List<BinanceTicker24hr> allTickers = binanceRestClient.getAllTicker24hr();
            
            List<BinanceTicker24hr> sortedTickers = switch (sortBy.toLowerCase()) {
                case "marketcap" -> binanceRestClient.getTopCoinsByMarketCap(allTickers.size());
                case "volume" -> binanceRestClient.getTopCoinsByVolume(allTickers.size());
                case "gainers" -> binanceRestClient.getTopGainers(allTickers.size());
                case "losers" -> binanceRestClient.getTopLosers(allTickers.size());
                default -> allTickers;
            };
            
            int start = page * size;
            int end = Math.min(start + size, sortedTickers.size());
            
            List<BinanceTicker24hr> paginatedTickers = sortedTickers.subList(start, end);
            
            JsonNode providerMeta = objectMapper.createObjectNode()
                    .put("total", sortedTickers.size())
                    .put("returned", paginatedTickers.size());
            auditLoggingHelper.finishSuccess(ctx, "binance", providerMeta);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("requestId", ctx.requestId().toString());
            response.put("data", paginatedTickers);
            response.put("pagination", Map.of(
                    "page", page,
                    "size", size,
                    "total", sortedTickers.size(),
                    "totalPages", (int) Math.ceil((double) sortedTickers.size() / size)
            ));
            response.put("sortBy", sortBy);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting all coins: {}", e.getMessage(), e);
            auditLoggingHelper.finishError(ctx, "binance", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "requestId", ctx.requestId().toString(), "error", e.getMessage()));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchCoins(
            @RequestParam String q,
            @RequestParam(required = false) Integer limit) {
        var ctx = auditLoggingHelper.start("/api/v1/binance/market/search", getCurrentUserId(), objectMapper.createObjectNode().put("q", q).put("limit", limit != null ? limit : -1));
        try {
            List<BinanceTicker24hr> allTickers = binanceRestClient.getAllTicker24hr();
            
            List<BinanceTicker24hr> searchResults = allTickers.stream()
                    .filter(ticker -> ticker.getSymbol().toLowerCase().contains(q.toLowerCase()))
                    .limit(limit != null ? limit : allTickers.size())
                    .toList();
            
            JsonNode providerMeta = objectMapper.createObjectNode()
                    .put("count", searchResults.size())
                    .put("query", q);
            auditLoggingHelper.finishSuccess(ctx, "binance", providerMeta);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("requestId", ctx.requestId().toString());
            response.put("data", searchResults);
            response.put("count", searchResults.size());
            response.put("query", q);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error searching coins: {}", e.getMessage(), e);
            auditLoggingHelper.finishError(ctx, "binance", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "requestId", ctx.requestId().toString(), "error", e.getMessage()));
        }
    }

    @GetMapping("/coin/{symbol}")
    public ResponseEntity<?> getCoinDetails(@PathVariable String symbol) {
        var ctx = auditLoggingHelper.start("/api/v1/binance/market/coin/" + symbol, getCurrentUserId(), objectMapper.createObjectNode().put("symbol", symbol));
        try {
            List<BinanceTicker24hr> allTickers = binanceRestClient.getAllTicker24hr();
            
            BinanceTicker24hr coin = allTickers.stream()
                    .filter(ticker -> ticker.getSymbol().equalsIgnoreCase(symbol))
                    .findFirst()
                    .orElse(null);
            
            if (coin == null) {
                auditLoggingHelper.finishSuccess(ctx, "binance", objectMapper.createObjectNode().put("found", false));
                return ResponseEntity.notFound().build();
            }
            
            JsonNode providerMeta = objectMapper.createObjectNode()
                    .put("symbol", symbol)
                    .put("found", true);
            auditLoggingHelper.finishSuccess(ctx, "binance", providerMeta);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("requestId", ctx.requestId().toString());
            response.put("data", coin);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting coin details: {}", e.getMessage(), e);
            auditLoggingHelper.finishError(ctx, "binance", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "requestId", ctx.requestId().toString(), "error", e.getMessage()));
        }
    }

    @GetMapping("/symbols")
    public ResponseEntity<?> getAllSymbols() {
        UUID requestId = UUID.randomUUID();
        long startTime = System.currentTimeMillis();
        
        try {
            JsonNode params = objectMapper.createObjectNode();
            auditService.logRequest(requestId, getCurrentUserId(), "/api/v1/binance/market/symbols", params);
            
            List<BinanceSymbolInfo> symbols = binanceRestClient.getAllSymbols();
            
            long latencyMs = System.currentTimeMillis() - startTime;
            JsonNode providerMeta = objectMapper.createObjectNode()
                    .put("count", symbols.size());
            auditService.finishRequest(requestId, false, "binance", providerMeta, latencyMs);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("requestId", requestId.toString());
            response.put("data", symbols);
            response.put("count", symbols.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting all symbols: {}", e.getMessage(), e);
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, false, "binance", 
                objectMapper.createObjectNode().put("error", e.getMessage()), latencyMs);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "requestId", requestId.toString(), "error", e.getMessage()));
        }
    }
    
    /**
     * Get kline/candlestick data with parameter validation
     * Demonstrates normalize → validate → call pattern
     */
    @GetMapping("/kline")
    public ResponseEntity<?> getKlineData(@RequestParam Map<String, String> rawParams) {
        UUID requestId = UUID.randomUUID();
        long startTime = System.currentTimeMillis();
        
        try {
            // Check if user has access to historical data (premium feature)
            UUID userId = getCurrentUserId();
            if (userId != null && !featureFlagService.isHistoricalDataEnabled(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of(
                                "success", false,
                                "error", "Historical data access requires premium subscription",
                                "requestId", requestId.toString()
                        ));
            }
            
            // Step 1: Normalize parameters
            KlineParams klineParams = paramNormalizer.normalizeKlineParams(rawParams);
            
            // Step 2: Validate parameters (with user context for tier-based limits)
            User currentUser = getCurrentUser();
            paramValidator.validateKlineParams(currentUser, klineParams);
            
            // Step 3: Convert to JSON for audit logging
            JsonNode paramsNode = objectMapper.valueToTree(klineParams);
            auditService.logRequest(requestId, getCurrentUserId(), "/api/v1/binance/market/kline", paramsNode);
            
            // Step 4: Call external provider (mocked for now - would call binanceRestClient.getKlineData)
            // For demonstration, we'll return the normalized and validated params
            Map<String, Object> mockKlineData = new HashMap<>();
            mockKlineData.put("symbol", klineParams.getSymbol());
            mockKlineData.put("interval", klineParams.getInterval());
            mockKlineData.put("data", List.of()); // Would be actual kline data
            mockKlineData.put("normalizedParams", klineParams);
            
            // Step 5: Log completion
            long latencyMs = System.currentTimeMillis() - startTime;
            JsonNode providerMeta = objectMapper.createObjectNode()
                    .put("symbol", klineParams.getSymbol())
                    .put("interval", klineParams.getInterval())
                    .put("limit", klineParams.getLimit());
            auditService.finishRequest(requestId, false, "binance", providerMeta, latencyMs);
            
            // Step 6: Return response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("requestId", requestId.toString());
            response.put("data", mockKlineData);
            
            return ResponseEntity.ok(response);
            
        } catch (BadRequestException e) {
            log.warn("Invalid kline parameters: {}", e.getMessage());
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, false, "binance", 
                objectMapper.createObjectNode().put("error", e.getMessage()), latencyMs);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("requestId", requestId.toString());
            errorResponse.put("error", e.getMessage());
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
            
        } catch (Exception e) {
            log.error("Error getting kline data: {}", e.getMessage(), e);
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, false, "binance", 
                objectMapper.createObjectNode().put("error", e.getMessage()), latencyMs);
            
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "requestId", requestId.toString(), "error", e.getMessage()));
        }
    }
}

