package com.example.demo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Klines/Candlestick data response with audit metadata")
public class KlinesResponseDto {
    
    @Schema(description = "Request ID for tracking", example = "123e4567-e89b-12d3-a456-426614174000")
    private UUID requestId;
    
    @Schema(description = "Data provider", example = "binance")
    private String provider;
    
    @Schema(description = "Whether response was served from cache", example = "false")
    private boolean cached;
    
    @Schema(description = "Normalized request parameters")
    private KlineParams params;
    
    @Schema(description = "Kline data array (each element is [openTime, open, high, low, close, volume, closeTime, ...])")
    private List<Object[]> data;
}

