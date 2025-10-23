package com.example.demo.util;

import com.example.demo.dto.KlineParams;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ParamNormalizerTest {
    
    private ParamNormalizer paramNormalizer;
    
    @BeforeEach
    void setUp() {
        paramNormalizer = new ParamNormalizer();
    }
    
    @Test
    void normalizeKlineParams_ShouldNormalizeSymbolToUppercase() {
        // Given
        Map<String, String> rawParams = new HashMap<>();
        rawParams.put("symbol", "btcusdt");
        rawParams.put("interval", "1h");
        
        // When
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        // Then
        assertThat(result.getSymbol()).isEqualTo("BTCUSDT");
    }
    
    @Test
    void normalizeKlineParams_ShouldNormalizeIntervalToLowercase() {
        // Given
        Map<String, String> rawParams = new HashMap<>();
        rawParams.put("symbol", "BTCUSDT");
        rawParams.put("interval", "1H");
        
        // When
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        // Then
        assertThat(result.getInterval()).isEqualTo("1h");
    }
    
    @Test
    void normalizeKlineParams_ShouldConvertEpochSecondsToMilliseconds() {
        // Given
        Map<String, String> rawParams = new HashMap<>();
        rawParams.put("symbol", "BTCUSDT");
        rawParams.put("interval", "1h");
        rawParams.put("startTime", "1609459200"); // 2021-01-01 00:00:00 UTC (10 digits)
        
        // When
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        // Then
        assertThat(result.getStartTime()).isEqualTo(1609459200000L);
    }
    
    @Test
    void normalizeKlineParams_ShouldKeepEpochMilliseconds() {
        // Given
        Map<String, String> rawParams = new HashMap<>();
        rawParams.put("symbol", "BTCUSDT");
        rawParams.put("interval", "1h");
        rawParams.put("startTime", "1609459200000"); // 2021-01-01 00:00:00 UTC (13 digits)
        
        // When
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        // Then
        assertThat(result.getStartTime()).isEqualTo(1609459200000L);
    }
    
    @Test
    void normalizeKlineParams_ShouldParseLimit() {
        // Given
        Map<String, String> rawParams = new HashMap<>();
        rawParams.put("symbol", "BTCUSDT");
        rawParams.put("interval", "1h");
        rawParams.put("limit", "500");
        
        // When
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        // Then
        assertThat(result.getLimit()).isEqualTo(500);
    }
    
    @Test
    void normalizeKlineParams_ShouldUseDefaultLimitForInvalidFormat() {
        // Given
        Map<String, String> rawParams = new HashMap<>();
        rawParams.put("symbol", "BTCUSDT");
        rawParams.put("interval", "1h");
        rawParams.put("limit", "invalid");
        
        // When
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        // Then
        assertThat(result.getLimit()).isEqualTo(100); // Default limit
    }
    
    @Test
    void normalizeKlineParams_ShouldHandleEmptyParams() {
        // Given
        Map<String, String> rawParams = new HashMap<>();
        
        // When
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        // Then
        assertThat(result.getSymbol()).isNull();
        assertThat(result.getInterval()).isNull();
        assertThat(result.getStartTime()).isNull();
        assertThat(result.getEndTime()).isNull();
        assertThat(result.getLimit()).isNull();
    }
    
    @Test
    void normalizeKlineParams_ShouldTrimWhitespace() {
        // Given
        Map<String, String> rawParams = new HashMap<>();
        rawParams.put("symbol", "  btcusdt  ");
        rawParams.put("interval", "  1h  ");
        
        // When
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        // Then
        assertThat(result.getSymbol()).isEqualTo("BTCUSDT");
        assertThat(result.getInterval()).isEqualTo("1h");
    }
    
    @Test
    void normalizeSymbol_ShouldConvertToUppercase() {
        // When
        String result = paramNormalizer.normalizeSymbol("btcusdt");
        
        // Then
        assertThat(result).isEqualTo("BTCUSDT");
    }
    
    @Test
    void normalizeSymbol_ShouldHandleNull() {
        // When
        String result = paramNormalizer.normalizeSymbol(null);
        
        // Then
        assertThat(result).isNull();
    }
    
    @Test
    void normalizeInterval_ShouldConvertToLowercase() {
        // When
        String result = paramNormalizer.normalizeInterval("1H");
        
        // Then
        assertThat(result).isEqualTo("1h");
    }
    
    @Test
    void normalizeInterval_ShouldHandleNull() {
        // When
        String result = paramNormalizer.normalizeInterval(null);
        
        // Then
        assertThat(result).isNull();
    }
}

