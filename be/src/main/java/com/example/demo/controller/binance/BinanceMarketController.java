package com.example.demo.controller.binance;

import com.example.demo.client.binance.model.BinanceSymbolInfo;
import com.example.demo.client.binance.model.BinanceTicker24hr;
import com.example.demo.client.binance.service.BinanceRestClient;
import com.example.demo.client.binance.service.BinanceProxyService;
import com.example.demo.dto.KlineParams;
import com.example.demo.dto.KlinesResponseDto;
import com.example.demo.entity.User;
import com.example.demo.exception.BadRequestException;
import com.example.demo.service.FeatureFlagService;
import com.example.demo.util.ParamNormalizer;
import com.example.demo.util.AuditLoggingHelper;
import com.example.demo.util.ParamValidator;
import com.example.demo.util.ControllerHelper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/binance/market")
@RequiredArgsConstructor
@Tag(name = "Binance Market Data", description = "Proxy endpoints for Binance market data (symbols, tickers, klines)")
public class BinanceMarketController {

    private final BinanceRestClient binanceRestClient;
    private final BinanceProxyService binanceProxyService;
    private final ObjectMapper objectMapper;
    private final ParamNormalizer paramNormalizer;
    private final ParamValidator paramValidator;
    private final FeatureFlagService featureFlagService;
    private final AuditLoggingHelper auditLoggingHelper;
    private final ControllerHelper controllerHelper;

    private UUID getCurrentUserId() {
        return controllerHelper.getCurrentUserId();
    }
    
    private User getCurrentUser() {
        return controllerHelper.getCurrentUser();
    }

    @Operation(
        summary = "Get top 3 cryptocurrencies",
        description = "Retrieve the top 3 cryptocurrencies by market cap from Binance. Response includes requestId and is cached.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved top 3 coins")
        }
    )
    @GetMapping("/top-3")
    public ResponseEntity<?> getTop3Coins() {
        var ctx = auditLoggingHelper.start("/api/v1/binance/market/top-3", getCurrentUserId(), objectMapper.createObjectNode());
        try {
            List<BinanceTicker24hr> top3 = binanceRestClient.getTopCoinsByMarketCap(3);
            JsonNode providerMeta = objectMapper.createObjectNode().put("count", top3.size());
            return auditLoggingHelper.okWithExtra(ctx, top3, Map.of("count", top3.size()), "binance", false, providerMeta);
        } catch (Exception e) {
            log.error("Error getting top 3 coins: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR, "binance");
        }
    }

    @Operation(
        summary = "Get top cryptocurrencies",
        description = "Retrieve top N cryptocurrencies sorted by market cap or volume",
        responses = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved top coins")
        }
    )
    @GetMapping("/top")
    public ResponseEntity<?> getTopCoins(
            @Parameter(description = "Number of coins to return", example = "10") @RequestParam int limit,
            @Parameter(description = "Sort criteria (marketCap or volume)", example = "marketCap") @RequestParam String sortBy) {
        var ctx = auditLoggingHelper.start("/api/v1/binance/market/top", getCurrentUserId(), objectMapper.createObjectNode().put("limit", limit).put("sortBy", sortBy));
        try {
            List<BinanceTicker24hr> topCoins;
            
            switch (sortBy.toLowerCase()) {
                case "marketcap" -> topCoins = binanceRestClient.getTopCoinsByMarketCap(limit);
                case "volume" -> topCoins = binanceRestClient.getTopCoinsByVolume(limit);
                case "gainers" -> topCoins = binanceRestClient.getTopGainers(limit);
                case "losers" -> topCoins = binanceRestClient.getTopLosers(limit);
                default -> {
                    return auditLoggingHelper.error(ctx, "Invalid sortBy parameter", org.springframework.http.HttpStatus.BAD_REQUEST, "binance");
                }
            }
            
            JsonNode providerMeta = objectMapper.createObjectNode()
                    .put("count", topCoins.size())
                    .put("sortBy", sortBy);
            
            Map<String, Object> extraFields = new HashMap<>();
            extraFields.put("count", topCoins.size());
            extraFields.put("sortBy", sortBy);
            extraFields.put("limit", limit);
            
            return auditLoggingHelper.okWithExtra(ctx, topCoins, extraFields, "binance", false, providerMeta);
        } catch (Exception e) {
            log.error("Error getting top coins: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, e.getMessage(), org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "binance");
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
            
            Map<String, Object> extraFields = new HashMap<>();
            extraFields.put("pagination", Map.of(
                    "page", page,
                    "size", size,
                    "total", sortedTickers.size(),
                    "totalPages", (int) Math.ceil((double) sortedTickers.size() / size)
            ));
            extraFields.put("sortBy", sortBy);
            
            return auditLoggingHelper.okWithExtra(ctx, paginatedTickers, extraFields, "binance", false, providerMeta);
        } catch (Exception e) {
            log.error("Error getting all coins: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, e.getMessage(), org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "binance");
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
            
            return auditLoggingHelper.okWithExtra(ctx, searchResults, Map.of("count", searchResults.size(), "query", q), "binance", false, providerMeta);
        } catch (Exception e) {
            log.error("Error searching coins: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, e.getMessage(), org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "binance");
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
                return auditLoggingHelper.error(ctx, "Coin not found", HttpStatus.NOT_FOUND, "binance");
            }
            
            JsonNode providerMeta = objectMapper.createObjectNode()
                    .put("symbol", symbol)
                    .put("found", true);
            
            return auditLoggingHelper.ok(ctx, coin, "binance", false, providerMeta);
        } catch (Exception e) {
            log.error("Error getting coin details: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, e.getMessage(), org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "binance");
        }
    }

    @GetMapping("/symbols")
    public ResponseEntity<?> getAllSymbols() {
        var ctx = auditLoggingHelper.start("/api/v1/binance/market/symbols", getCurrentUserId(), objectMapper.createObjectNode());
        try {
            List<BinanceSymbolInfo> symbols = binanceRestClient.getAllSymbols();
            
            JsonNode providerMeta = objectMapper.createObjectNode()
                    .put("count", symbols.size());
            
            return auditLoggingHelper.okWithExtra(ctx, symbols, Map.of("count", symbols.size()), "binance", false, providerMeta);
        } catch (Exception e) {
            log.error("Error getting all symbols: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR, "binance");
        }
    }
    
    @GetMapping("/kline")
    public ResponseEntity<?> getKlineData(@RequestParam Map<String, String> rawParams) {
        UUID requestId = UUID.randomUUID();
        
        try {
            UUID userId = getCurrentUserId();
            if (userId != null && !featureFlagService.isHistoricalDataEnabled(userId)) {
                var ctx = auditLoggingHelper.start("/api/v1/binance/market/kline", userId, objectMapper.valueToTree(rawParams));
                return auditLoggingHelper.error(ctx, "Historical data access requires premium subscription", HttpStatus.FORBIDDEN, "binance");
            }
            
            // Normalize and validate params
            KlineParams klineParams = paramNormalizer.normalizeKlineParams(rawParams);
            User currentUser = getCurrentUser();
            paramValidator.validateKlineParams(currentUser, klineParams);
            
            // Use proxy service
            KlinesResponseDto response = binanceProxyService.getKlines(requestId, userId, klineParams);
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("success", true);
            responseMap.put("requestId", response.getRequestId().toString());
            responseMap.put("provider", response.getProvider());
            responseMap.put("cached", response.isCached());
            responseMap.put("params", response.getParams());
            responseMap.put("data", response.getData());
            
            return ResponseEntity.ok(responseMap);
            
        } catch (BadRequestException e) {
            log.warn("Invalid kline parameters: {}", e.getMessage());
            var errorCtx = auditLoggingHelper.start("/api/v1/binance/market/kline", getCurrentUserId(), objectMapper.valueToTree(rawParams));
            return auditLoggingHelper.error(errorCtx, e.getMessage(), HttpStatus.BAD_REQUEST, "binance");
            
        } catch (Exception e) {
            log.error("Error getting kline data: {}", e.getMessage(), e);
            var errorCtx = auditLoggingHelper.start("/api/v1/binance/market/kline", getCurrentUserId(), objectMapper.valueToTree(rawParams));
            return auditLoggingHelper.error(errorCtx, e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR, "binance");
        }
    }
}

