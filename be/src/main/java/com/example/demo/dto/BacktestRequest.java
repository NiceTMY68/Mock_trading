package com.example.demo.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Backtest request with symbol, date range, and SMA strategy")
public class BacktestRequest {
    
    @Schema(description = "Trading symbol", example = "BTCUSDT")
    private String symbol;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    @Schema(description = "Backtest start time", example = "2024-01-01T00:00:00Z")
    private Instant start;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'", timezone = "UTC")
    @Schema(description = "Backtest end time", example = "2024-03-01T00:00:00Z")
    private Instant end;
    
    @Schema(description = "Strategy parameters: {fast: 20, slow: 50}", example = "{\"fast\":20,\"slow\":50}")
    private Map<String, Integer> strategy;
    
    public Integer getFastPeriod() {
        return strategy != null ? strategy.get("fast") : null;
    }
    
    public Integer getSlowPeriod() {
        return strategy != null ? strategy.get("slow") : null;
    }
}

