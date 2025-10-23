package com.example.demo.client.binance.service;

import com.example.demo.client.binance.model.BinanceSymbolInfo;
import com.example.demo.client.binance.model.BinanceTicker24hr;
import com.example.demo.config.CacheConfig;
import com.example.demo.service.CacheService;
import com.example.demo.service.PriceService;
import com.example.demo.util.CacheKeyUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BinanceRestClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final CacheService cacheService;
    private final PriceService priceService;

    private static final String BINANCE_BASE_URL = "https://api.binance.com/api/v3";
    private static final String EXCHANGE_INFO_URL = BINANCE_BASE_URL + "/exchangeInfo";
    private static final String TICKER_24HR_URL = BINANCE_BASE_URL + "/ticker/24hr";
    private static final String KLINES_URL = BINANCE_BASE_URL + "/klines";

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
    
    public List<Object[]> getKlineData(String symbol, String interval, Long startTime, Long endTime, Integer limit) {
        String cacheKey = CacheKeyUtil.klineKey(symbol, interval, startTime, endTime, limit);
        
        return cacheService.get(cacheKey, new TypeReference<List<Object[]>>() {})
                .orElseGet(() -> {
                    try {
                        StringBuilder urlBuilder = new StringBuilder(KLINES_URL);
                        urlBuilder.append("?symbol=").append(symbol.toUpperCase());
                        urlBuilder.append("&interval=").append(interval);
                        
                        if (startTime != null) {
                            urlBuilder.append("&startTime=").append(startTime);
                        }
                        if (endTime != null) {
                            urlBuilder.append("&endTime=").append(endTime);
                        }
                        if (limit != null) {
                            urlBuilder.append("&limit=").append(limit);
                        }
                        
                        String url = urlBuilder.toString();
                        String response = restTemplate.getForObject(url, String.class);
                        
                        JsonNode klinesArray = objectMapper.readTree(response);
                        List<Object[]> klineData = new ArrayList<>();
                        
                        for (JsonNode klineNode : klinesArray) {
                            Object[] kline = new Object[12];
                            kline[0] = klineNode.get(0).asLong(); // openTime
                            kline[1] = klineNode.get(1).asText(); // open
                            kline[2] = klineNode.get(2).asText(); // high
                            kline[3] = klineNode.get(3).asText(); // low
                            kline[4] = klineNode.get(4).asText(); // close
                            kline[5] = klineNode.get(5).asText(); // volume
                            kline[6] = klineNode.get(6).asLong(); // closeTime
                            kline[7] = klineNode.get(7).asText(); // quoteAssetVolume
                            kline[8] = klineNode.get(8).asLong(); // numberOfTrades
                            kline[9] = klineNode.get(9).asText(); // takerBuyBaseAssetVolume
                            kline[10] = klineNode.get(10).asText(); // takerBuyQuoteAssetVolume
                            kline[11] = klineNode.get(11).asText(); // ignore
                            klineData.add(kline);
                        }
                        
                        // Persist kline data as PriceSnapshots
                        JsonNode rawMeta = objectMapper.createObjectNode()
                                .put("symbol", symbol)
                                .put("interval", interval)
                                .put("startTime", startTime != null ? startTime.toString() : "null")
                                .put("endTime", endTime != null ? endTime.toString() : "null")
                                .put("limit", limit != null ? limit.toString() : "null");
                        
                        priceService.persistKlineData(symbol, klineData, rawMeta);
                        
                        cacheService.put(cacheKey, klineData, CacheConfig.KLINE_TTL);
                        log.info("Fetched and cached {} klines for {} {}", klineData.size(), symbol, interval);
                        
                        return klineData;
                        
                    } catch (Exception e) {
                        log.error("Error fetching kline data for {} {}: {}", symbol, interval, e.getMessage(), e);
                        return List.of();
                    }
                });
    }
}
