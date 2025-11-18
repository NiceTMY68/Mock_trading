package com.example.demo.dto;

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
@Schema(description = "Standard API response wrapper")
public class ApiResponseDto<T> {
    
    @Schema(description = "Indicates if the request was successful", example = "true")
    private boolean success;
    
    @Schema(description = "Unique request identifier for tracking", example = "123e4567-e89b-12d3-a456-426614174000")
    private UUID requestId;
    
    @Schema(description = "Data provider source (e.g., binance, newsdata)", example = "binance")
    private String provider;
    
    @Schema(description = "Indicates if response was served from cache", example = "true")
    private Boolean cached;
    
    @Schema(description = "Response data payload")
    private T data;
    
    @Schema(description = "Error message if success is false", example = "Invalid symbol parameter")
    private String error;
}

