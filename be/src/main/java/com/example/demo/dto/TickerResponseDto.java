package com.example.demo.dto;

import com.example.demo.client.binance.model.BinanceTicker24hr;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "24hr ticker data response with audit metadata")
public class TickerResponseDto {
    
    @Schema(description = "Request ID for tracking", example = "123e4567-e89b-12d3-a456-426614174000")
    private UUID requestId;
    
    @Schema(description = "Data provider", example = "binance")
    private String provider;
    
    @Schema(description = "Whether response was served from cache", example = "false")
    private boolean cached;
    
    @Schema(description = "Trading pair symbol", example = "BTCUSDT")
    private String symbol;
    
    @Schema(description = "24hr ticker data")
    private BinanceTicker24hr data;
}

