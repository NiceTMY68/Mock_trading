package com.example.demo.controller.binance;

import com.example.demo.client.binance.model.BinanceSymbolInfo;
import com.example.demo.client.binance.model.BinanceTicker24hr;
import com.example.demo.client.binance.service.BinanceRestClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/binance/market")
@RequiredArgsConstructor
public class BinanceMarketController {

    private final BinanceRestClient binanceRestClient;

    @GetMapping("/top-3")
    public ResponseEntity<?> getTop3Coins() {
        try {
            List<BinanceTicker24hr> top3 = binanceRestClient.getTopCoinsByMarketCap(3);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", top3);
            response.put("count", top3.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting top 3 coins: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/top")
    public ResponseEntity<?> getTopCoins(
            @RequestParam int limit,
            @RequestParam String sortBy) {
        try {
            List<BinanceTicker24hr> topCoins;
            
            switch (sortBy.toLowerCase()) {
                case "marketcap" -> topCoins = binanceRestClient.getTopCoinsByMarketCap(limit);
                case "volume" -> topCoins = binanceRestClient.getTopCoinsByVolume(limit);
                case "gainers" -> topCoins = binanceRestClient.getTopGainers(limit);
                case "losers" -> topCoins = binanceRestClient.getTopLosers(limit);
                default -> {
                    return ResponseEntity.badRequest()
                            .body(Map.of("success", false, "error", "Invalid sortBy parameter"));
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", topCoins);
            response.put("count", topCoins.size());
            response.put("sortBy", sortBy);
            response.put("limit", limit);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting top coins: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/all")
    public ResponseEntity<?> getAllCoins(
            @RequestParam int page,
            @RequestParam int size,
            @RequestParam String sortBy) {
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
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
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
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchCoins(
            @RequestParam String q,
            @RequestParam(required = false) Integer limit) {
        try {
            List<BinanceTicker24hr> allTickers = binanceRestClient.getAllTicker24hr();
            
            List<BinanceTicker24hr> searchResults = allTickers.stream()
                    .filter(ticker -> ticker.getSymbol().toLowerCase().contains(q.toLowerCase()))
                    .limit(limit != null ? limit : allTickers.size())
                    .toList();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", searchResults);
            response.put("count", searchResults.size());
            response.put("query", q);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error searching coins: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/coin/{symbol}")
    public ResponseEntity<?> getCoinDetails(@PathVariable String symbol) {
        try {
            List<BinanceTicker24hr> allTickers = binanceRestClient.getAllTicker24hr();
            
            BinanceTicker24hr coin = allTickers.stream()
                    .filter(ticker -> ticker.getSymbol().equalsIgnoreCase(symbol))
                    .findFirst()
                    .orElse(null);
            
            if (coin == null) {
                return ResponseEntity.notFound().build();
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", coin);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting coin details: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/symbols")
    public ResponseEntity<?> getAllSymbols() {
        try {
            List<BinanceSymbolInfo> symbols = binanceRestClient.getAllSymbols();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", symbols);
            response.put("count", symbols.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting all symbols: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }
}

