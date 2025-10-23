package com.example.demo.util;

import lombok.experimental.UtilityClass;

import java.time.Instant;
import java.time.format.DateTimeFormatter;

@UtilityClass
public class CacheKeyUtil {
    
    private static final String SEPARATOR = ":";
    private static final String BINANCE_PREFIX = "binance";
    private static final String NEWS_PREFIX = "news";
    
    public static String klineKey(String symbol, String interval, Long startTime, Long endTime, Integer limit) {
        StringBuilder key = new StringBuilder(BINANCE_PREFIX)
                .append(SEPARATOR).append("klines")
                .append(SEPARATOR).append(symbol.toUpperCase())
                .append(SEPARATOR).append(interval.toLowerCase());
        
        if (startTime != null) {
            key.append(SEPARATOR).append(startTime);
        } else {
            key.append(SEPARATOR).append("null");
        }
        
        if (endTime != null) {
            key.append(SEPARATOR).append(endTime);
        } else {
            key.append(SEPARATOR).append("null");
        }
        
        if (limit != null) {
            key.append(SEPARATOR).append(limit);
        }
        
        return key.toString();
    }
    
    public static String tickerKey(String symbol) {
        return BINANCE_PREFIX + SEPARATOR + "ticker" + SEPARATOR + symbol.toUpperCase();
    }
    
    public static String allTickersKey() {
        return BINANCE_PREFIX + SEPARATOR + "ticker" + SEPARATOR + "all";
    }
    
    public static String symbolInfoKey(String symbol) {
        return BINANCE_PREFIX + SEPARATOR + "symbol" + SEPARATOR + symbol.toUpperCase();
    }
    
    public static String allSymbolsKey() {
        return BINANCE_PREFIX + SEPARATOR + "symbols" + SEPARATOR + "all";
    }
    
    public static String topCoinsByMarketCapKey(Integer limit) {
        return BINANCE_PREFIX + SEPARATOR + "top" + SEPARATOR + "marketcap" + SEPARATOR + limit;
    }
    
    public static String topCoinsByVolumeKey(Integer limit) {
        return BINANCE_PREFIX + SEPARATOR + "top" + SEPARATOR + "volume" + SEPARATOR + limit;
    }
    
    public static String topGainersKey(Integer limit) {
        return BINANCE_PREFIX + SEPARATOR + "top" + SEPARATOR + "gainers" + SEPARATOR + limit;
    }
    
    public static String topLosersKey(Integer limit) {
        return BINANCE_PREFIX + SEPARATOR + "top" + SEPARATOR + "losers" + SEPARATOR + limit;
    }
    
    public static String newsKey(String query, Instant from, Instant to, Integer page) {
        StringBuilder key = new StringBuilder(NEWS_PREFIX);
        
        if (query != null && !query.isEmpty()) {
            key.append(SEPARATOR).append(query.toLowerCase().replaceAll("\\s+", "_"));
        } else {
            key.append(SEPARATOR).append("all");
        }
        
        if (from != null) {
            key.append(SEPARATOR).append(formatInstant(from));
        } else {
            key.append(SEPARATOR).append("null");
        }
        
        if (to != null) {
            key.append(SEPARATOR).append(formatInstant(to));
        } else {
            key.append(SEPARATOR).append("null");
        }
        
        if (page != null) {
            key.append(SEPARATOR).append("page=").append(page);
        }
        
        return key.toString();
    }
    
    public static String cryptoNewsKey(Instant from, Instant to, Integer page) {
        return newsKey("crypto", from, to, page);
    }
    
    private static String formatInstant(Instant instant) {
        if (instant == null) {
            return "null";
        }
        return DateTimeFormatter.ISO_INSTANT.format(instant).replaceAll("[:\\-.]", "");
    }
    
    public static String wildcardPattern(String prefix, String pattern) {
        return prefix + SEPARATOR + pattern + "*";
    }
}

