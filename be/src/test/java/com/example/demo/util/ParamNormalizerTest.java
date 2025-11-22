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
        Map<String, String> rawParams = new HashMap<>();
        rawParams.put("symbol", "btcusdt");
        rawParams.put("interval", "1h");
        
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        assertThat(result.getSymbol()).isEqualTo("BTCUSDT");
    }

    @Test
    void normalizeKlineParams_ShouldNormalizeIntervalToLowercase() {
        Map<String, String> rawParams = new HashMap<>();
        rawParams.put("symbol", "BTCUSDT");
        rawParams.put("interval", "1H");
        
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        assertThat(result.getInterval()).isEqualTo("1h");
    }

    @Test
    void normalizeKlineParams_ShouldParseEpochSecondsToMilliseconds() {
        Map<String, String> rawParams = new HashMap<>();
        rawParams.put("symbol", "BTCUSDT");
        rawParams.put("interval", "1h");
        rawParams.put("startTime", "1609459200"); // 2021-01-01 00:00:00 UTC in seconds
        
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        assertThat(result.getStartTime()).isEqualTo(1609459200000L); // Converted to milliseconds
    }

    @Test
    void normalizeKlineParams_ShouldKeepEpochMilliseconds() {
        Map<String, String> rawParams = new HashMap<>();
        rawParams.put("symbol", "BTCUSDT");
        rawParams.put("interval", "1h");
        rawParams.put("startTime", "1609459200000"); // Already in milliseconds
        
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        assertThat(result.getStartTime()).isEqualTo(1609459200000L);
    }

    @Test
    void normalizeKlineParams_ShouldParseISODateTime() {
        Map<String, String> rawParams = new HashMap<>();
        rawParams.put("symbol", "BTCUSDT");
        rawParams.put("interval", "1h");
        rawParams.put("startTime", "2021-01-01T00:00:00");
        
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        assertThat(result.getStartTime()).isNotNull();
        assertThat(result.getStartTime()).isGreaterThan(0L);
    }

    @Test
    void normalizeKlineParams_ShouldParseLimitAsInteger() {
        Map<String, String> rawParams = new HashMap<>();
        rawParams.put("symbol", "BTCUSDT");
        rawParams.put("interval", "1h");
        rawParams.put("limit", "500");
        
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        assertThat(result.getLimit()).isEqualTo(500);
    }

    @Test
    void normalizeKlineParams_ShouldHandleInvalidLimit() {
        Map<String, String> rawParams = new HashMap<>();
        rawParams.put("symbol", "BTCUSDT");
        rawParams.put("interval", "1h");
        rawParams.put("limit", "invalid");
        
        KlineParams result = paramNormalizer.normalizeKlineParams(rawParams);
        
        assertThat(result.getLimit()).isEqualTo(100); // Default limit
    }

    @Test
    void normalizeSymbol_ShouldConvertToUppercase() {
        assertThat(paramNormalizer.normalizeSymbol("btcusdt")).isEqualTo("BTCUSDT");
        assertThat(paramNormalizer.normalizeSymbol("ETHBTC")).isEqualTo("ETHBTC");
        assertThat(paramNormalizer.normalizeSymbol("  solusdt  ")).isEqualTo("SOLUSDT");
    }

    @Test
    void normalizeInterval_ShouldConvertToLowercase() {
        assertThat(paramNormalizer.normalizeInterval("1H")).isEqualTo("1h");
        assertThat(paramNormalizer.normalizeInterval("1D")).isEqualTo("1d");
        assertThat(paramNormalizer.normalizeInterval("  15M  ")).isEqualTo("15m");
    }
}
