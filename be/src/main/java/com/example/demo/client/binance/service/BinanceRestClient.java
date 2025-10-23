package com.example.demo.client.binance.service;

import com.example.demo.client.binance.model.BinanceSymbolInfo;
import com.example.demo.client.binance.model.BinanceTicker24hr;
import com.example.demo.config.CacheConfig;
import com.example.demo.service.CacheService;
import com.example.demo.util.CacheKeyUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BinanceRestClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final CacheService cacheService;

    private static final String BINANCE_BASE_URL = "https://api.binance.com/api/v3";
    private static final String EXCHANGE_INFO_URL = BINANCE_BASE_URL + "/exchangeInfo";
    private static final String TICKER_24HR_URL = BINANCE_BASE_URL + "/ticker/24hr";

    public List<BinanceSymbolInfo> getAllSymbols() {
        String cacheKey = CacheKeyUtil.allSymbolsKey();
        
        return cacheService.get(cacheKey, new TypeReference<List<BinanceSymbolInfo>>() {})
                .orElseGet(() -> {
                    try {
                        String response = restTemplate.getForObject(EXCHANGE_INFO_URL, String.class);
                        var exchangeInfo = objectMapper.readTree(response);
                        var symbols = exchangeInfo.get("symbols");
                        
                        List<BinanceSymbolInfo> symbolList = Arrays.asList(
                            objectMapper.treeToValue(symbols, BinanceSymbolInfo[].class)
                        );

                        cacheService.put(cacheKey, symbolList, CacheConfig.SYMBOL_INFO_TTL);
                        log.info("Fetched and cached {} symbols from Binance", symbolList.size());
                        
                        return symbolList;
                        
                    } catch (Exception e) {
                        log.error("Error fetching symbols from Binance: {}", e.getMessage(), e);
                        return List.of();
                    }
                });
    }

    public List<BinanceTicker24hr> getAllTicker24hr() {
        String cacheKey = CacheKeyUtil.allTickersKey();
        
        return cacheService.get(cacheKey, new TypeReference<List<BinanceTicker24hr>>() {})
                .orElseGet(() -> {
                    try {
                        String response = restTemplate.getForObject(TICKER_24HR_URL, String.class);
                        List<BinanceTicker24hr> tickerList = Arrays.asList(
                            objectMapper.readValue(response, BinanceTicker24hr[].class)
                        );

                        cacheService.put(cacheKey, tickerList, CacheConfig.TICKER_TTL);
                        log.info("Fetched and cached {} tickers from Binance", tickerList.size());
                        
                        return tickerList;
                        
                    } catch (Exception e) {
                        log.error("Error fetching 24hr ticker data: {}", e.getMessage(), e);
                        return List.of();
                    }
                });
    }

    public List<BinanceTicker24hr> getTopCoinsByMarketCap(int limit) {
        String cacheKey = CacheKeyUtil.topCoinsByMarketCapKey(limit);
        
        return cacheService.get(cacheKey, new TypeReference<List<BinanceTicker24hr>>() {})
                .orElseGet(() -> {
                    List<BinanceTicker24hr> allTickers = getAllTicker24hr();
                    
                    List<BinanceTicker24hr> result = allTickers.stream()
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
                    
                    cacheService.put(cacheKey, result, CacheConfig.MARKET_DATA_TTL);
                    return result;
                });
    }

    public List<BinanceTicker24hr> getTopCoinsByVolume(int limit) {
        String cacheKey = CacheKeyUtil.topCoinsByVolumeKey(limit);
        
        return cacheService.get(cacheKey, new TypeReference<List<BinanceTicker24hr>>() {})
                .orElseGet(() -> {
                    List<BinanceTicker24hr> allTickers = getAllTicker24hr();
                    
                    List<BinanceTicker24hr> result = allTickers.stream()
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
                    
                    cacheService.put(cacheKey, result, CacheConfig.MARKET_DATA_TTL);
                    return result;
                });
    }

    public List<BinanceTicker24hr> getTopGainers(int limit) {
        String cacheKey = CacheKeyUtil.topGainersKey(limit);
        
        return cacheService.get(cacheKey, new TypeReference<List<BinanceTicker24hr>>() {})
                .orElseGet(() -> {
                    List<BinanceTicker24hr> allTickers = getAllTicker24hr();
                    
                    List<BinanceTicker24hr> result = allTickers.stream()
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
                    
                    cacheService.put(cacheKey, result, CacheConfig.MARKET_DATA_TTL);
                    return result;
                });
    }

    public List<BinanceTicker24hr> getTopLosers(int limit) {
        String cacheKey = CacheKeyUtil.topLosersKey(limit);
        
        return cacheService.get(cacheKey, new TypeReference<List<BinanceTicker24hr>>() {})
                .orElseGet(() -> {
                    List<BinanceTicker24hr> allTickers = getAllTicker24hr();
                    
                    List<BinanceTicker24hr> result = allTickers.stream()
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
                    
                    cacheService.put(cacheKey, result, CacheConfig.MARKET_DATA_TTL);
                    return result;
                });
    }
}
