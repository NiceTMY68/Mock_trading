package com.example.demo.util;

import com.example.demo.dto.KlineParams;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Map;

/**
 * Utility class to normalize frontend-controlled parameters
 */
@Slf4j
@Component
public class ParamNormalizer {
    
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;
    
    /**
     * Normalize kline parameters from raw request params
     * 
     * @param rawParams Raw parameters from frontend
     * @return Normalized KlineParams with uppercase symbol and epoch ms timestamps
     */
    public KlineParams normalizeKlineParams(Map<String, String> rawParams) {
        log.debug("Normalizing kline params: {}", rawParams);
        
        KlineParams params = KlineParams.builder().build();
        
        // Normalize symbol to uppercase
        if (rawParams.containsKey("symbol")) {
            params.setSymbol(rawParams.get("symbol").toUpperCase().trim());
        }
        
        // Normalize interval to lowercase
        if (rawParams.containsKey("interval")) {
            params.setInterval(rawParams.get("interval").toLowerCase().trim());
        }
        
        // Normalize startTime to epoch milliseconds
        if (rawParams.containsKey("startTime")) {
            params.setStartTime(normalizeTimestamp(rawParams.get("startTime")));
        }
        
        // Normalize endTime to epoch milliseconds
        if (rawParams.containsKey("endTime")) {
            params.setEndTime(normalizeTimestamp(rawParams.get("endTime")));
        }
        
        // Normalize limit
        if (rawParams.containsKey("limit")) {
            try {
                params.setLimit(Integer.parseInt(rawParams.get("limit")));
            } catch (NumberFormatException e) {
                log.warn("Invalid limit format: {}", rawParams.get("limit"));
                params.setLimit(100); // Default limit
            }
        }
        
        log.debug("Normalized kline params: {}", params);
        return params;
    }
    
    /**
     * Normalize timestamp to epoch milliseconds
     * Supports:
     * - Epoch milliseconds (13 digits)
     * - Epoch seconds (10 digits)
     * - ISO 8601 datetime strings
     * 
     * @param timestamp Raw timestamp string
     * @return Epoch milliseconds
     */
    private Long normalizeTimestamp(String timestamp) {
        if (timestamp == null || timestamp.trim().isEmpty()) {
            return null;
        }
        
        timestamp = timestamp.trim();
        
        try {
            // Try parsing as long (epoch)
            long value = Long.parseLong(timestamp);
            
            // If it's epoch seconds (10 digits), convert to milliseconds
            if (timestamp.length() == 10) {
                return value * 1000;
            }
            
            // If it's epoch milliseconds (13 digits), return as is
            if (timestamp.length() == 13) {
                return value;
            }
            
            log.warn("Invalid timestamp length: {}", timestamp);
            return null;
            
        } catch (NumberFormatException e) {
            // Try parsing as ISO 8601 datetime
            try {
                LocalDateTime dateTime = LocalDateTime.parse(timestamp, ISO_FORMATTER);
                return dateTime.toInstant(ZoneOffset.UTC).toEpochMilli();
            } catch (DateTimeParseException ex) {
                log.warn("Unable to parse timestamp: {}", timestamp);
                return null;
            }
        }
    }
    
    /**
     * Normalize symbol to uppercase
     * 
     * @param symbol Raw symbol
     * @return Uppercase symbol
     */
    public String normalizeSymbol(String symbol) {
        if (symbol == null) {
            return null;
        }
        return symbol.toUpperCase().trim();
    }
    
    /**
     * Normalize interval to lowercase
     * 
     * @param interval Raw interval
     * @return Lowercase interval
     */
    public String normalizeInterval(String interval) {
        if (interval == null) {
            return null;
        }
        return interval.toLowerCase().trim();
    }
}

