package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Normalized parameters for Kline/Candlestick data requests
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KlineParams {
    
    /**
     * Trading pair symbol (normalized to uppercase)
     */
    private String symbol;
    
    /**
     * Candlestick interval (e.g., 1m, 5m, 15m, 1h, 4h, 1d)
     */
    private String interval;
    
    /**
     * Start time in epoch milliseconds
     */
    private Long startTime;
    
    /**
     * End time in epoch milliseconds
     */
    private Long endTime;
    
    /**
     * Number of results to return (clamped to max limit)
     */
    private Integer limit;
    
    /**
     * Calculate range in days between startTime and endTime
     */
    public Integer getRangeDays() {
        if (startTime == null || endTime == null) {
            return null;
        }
        long diffMs = endTime - startTime;
        return (int) (diffMs / (1000 * 60 * 60 * 24));
    }
}

