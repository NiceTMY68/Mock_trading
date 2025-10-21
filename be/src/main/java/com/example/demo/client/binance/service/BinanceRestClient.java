package com.example.demo.client.binance.service;

import com.example.demo.client.binance.model.BinanceSymbolInfo;
import com.example.demo.client.binance.model.BinanceTicker24hr;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class BinanceRestClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String BINANCE_BASE_URL = "https://api.binance.com/api/v3";
    private static final String EXCHANGE_INFO_URL = BINANCE_BASE_URL + "/exchangeInfo";
    private static final String TICKER_24HR_URL = BINANCE_BASE_URL + "/ticker/24hr";

    public List<BinanceSymbolInfo> getAllSymbols() {
        String cacheKey = "binance:all-symbols";
        
        @SuppressWarnings("unchecked")
        List<BinanceSymbolInfo> cached = (List<BinanceSymbolInfo>) redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return cached;
        }

        try {
            String response = restTemplate.getForObject(EXCHANGE_INFO_URL, String.class);
            
            var exchangeInfo = objectMapper.readTree(response);
            var symbols = exchangeInfo.get("symbols");
            
            List<BinanceSymbolInfo> symbolList = Arrays.asList(
                objectMapper.treeToValue(symbols, BinanceSymbolInfo[].class)
            );

            redisTemplate.opsForValue().set(cacheKey, symbolList, 1, TimeUnit.HOURS);
            return symbolList;
            
        } catch (Exception e) {
            log.error("Error fetching symbols from Binance: {}", e.getMessage(), e);
            return List.of();
        }
    }

    public List<BinanceTicker24hr> getAllTicker24hr() {
        String cacheKey = "binance:ticker-24hr";
        
        @SuppressWarnings("unchecked")
        List<BinanceTicker24hr> cached = (List<BinanceTicker24hr>) redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return cached;
        }

        try {
            String response = restTemplate.getForObject(TICKER_24HR_URL, String.class);
            
            List<BinanceTicker24hr> tickerList = Arrays.asList(
                objectMapper.readValue(response, BinanceTicker24hr[].class)
            );

            redisTemplate.opsForValue().set(cacheKey, tickerList, 5, TimeUnit.MINUTES);
            return tickerList;
            
        } catch (Exception e) {
            log.error("Error fetching 24hr ticker data: {}", e.getMessage(), e);
            return List.of();
        }
    }

    public List<BinanceTicker24hr> getTopCoinsByMarketCap(int limit) {
        List<BinanceTicker24hr> allTickers = getAllTicker24hr();
        
        return allTickers.stream()
                .filter(ticker -> {
                    try {
                        return ticker.getVolume() != null && 
                               ticker.getLastPrice() != null &&
                               Double.parseDouble(ticker.getVolume()) > 0 &&
                               Double.parseDouble(ticker.getLastPrice()) > 0;
                    } catch (NumberFormatException e) {
                        return false;
                    }
                })
                .sorted((a, b) -> {
                    try {
                        double marketCapA = Double.parseDouble(a.getVolume()) * Double.parseDouble(a.getLastPrice());
                        double marketCapB = Double.parseDouble(b.getVolume()) * Double.parseDouble(b.getLastPrice());
                        return Double.compare(marketCapB, marketCapA);
                    } catch (NumberFormatException e) {
                        return 0;
                    }
                })
                .limit(limit)
                .toList();
    }

    public List<BinanceTicker24hr> getTopCoinsByVolume(int limit) {
        List<BinanceTicker24hr> allTickers = getAllTicker24hr();
        
        return allTickers.stream()
                .filter(ticker -> {
                    try {
                        return ticker.getVolume() != null && 
                               Double.parseDouble(ticker.getVolume()) > 0;
                    } catch (NumberFormatException e) {
                        return false;
                    }
                })
                .sorted((a, b) -> {
                    try {
                        double volumeA = Double.parseDouble(a.getVolume());
                        double volumeB = Double.parseDouble(b.getVolume());
                        return Double.compare(volumeB, volumeA);
                    } catch (NumberFormatException e) {
                        return 0;
                    }
                })
                .limit(limit)
                .toList();
    }

    public List<BinanceTicker24hr> getTopGainers(int limit) {
        List<BinanceTicker24hr> allTickers = getAllTicker24hr();
        
        return allTickers.stream()
                .filter(ticker -> {
                    try {
                        return ticker.getPriceChangePercent() != null && 
                               Double.parseDouble(ticker.getPriceChangePercent()) > 0;
                    } catch (NumberFormatException e) {
                        return false;
                    }
                })
                .sorted((a, b) -> {
                    try {
                        double changeA = Double.parseDouble(a.getPriceChangePercent());
                        double changeB = Double.parseDouble(b.getPriceChangePercent());
                        return Double.compare(changeB, changeA);
                    } catch (NumberFormatException e) {
                        return 0;
                    }
                })
                .limit(limit)
                .toList();
    }

    public List<BinanceTicker24hr> getTopLosers(int limit) {
        List<BinanceTicker24hr> allTickers = getAllTicker24hr();
        
        return allTickers.stream()
                .filter(ticker -> {
                    try {
                        return ticker.getPriceChangePercent() != null && 
                               Double.parseDouble(ticker.getPriceChangePercent()) < 0;
                    } catch (NumberFormatException e) {
                        return false;
                    }
                })
                .sorted((a, b) -> {
                    try {
                        double changeA = Double.parseDouble(a.getPriceChangePercent());
                        double changeB = Double.parseDouble(b.getPriceChangePercent());
                        return Double.compare(changeA, changeB);
                    } catch (NumberFormatException e) {
                        return 0;
                    }
                })
                .limit(limit)
                .toList();
    }
}
