package com.example.demo.util;

import com.example.demo.dto.KlineParams;
import com.example.demo.entity.User;
import com.example.demo.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ParamValidatorTest {
    
    private ParamValidator paramValidator;
    
    @BeforeEach
    void setUp() {
        paramValidator = new ParamValidator();
        
        // Set configuration values using ReflectionTestUtils
        ReflectionTestUtils.setField(paramValidator, "validIntervalsConfig", "1m,5m,15m,1h,4h,1d");
        ReflectionTestUtils.setField(paramValidator, "maxLimitFree", 200);
        ReflectionTestUtils.setField(paramValidator, "maxLimitPro", 1000);
        ReflectionTestUtils.setField(paramValidator, "maxRangeDaysFree", 30);
        ReflectionTestUtils.setField(paramValidator, "maxRangeDaysPro", 365);
    }
    
    @Test
    void validateKlineParams_ShouldPassForValidParams() {
        // Given
        User user = createFreeUser();
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(100)
                .build();
        
        // When & Then - should not throw
        paramValidator.validateKlineParams(user, params);
    }
    
    @Test
    void validateKlineParams_ShouldThrowWhenSymbolIsNull() {
        // Given
        User user = createFreeUser();
        KlineParams params = KlineParams.builder()
                .symbol(null)
                .interval("1h")
                .build();
        
        // When & Then
        assertThatThrownBy(() -> paramValidator.validateKlineParams(user, params))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Symbol is required");
    }
    
    @Test
    void validateKlineParams_ShouldThrowWhenSymbolIsEmpty() {
        // Given
        User user = createFreeUser();
        KlineParams params = KlineParams.builder()
                .symbol("")
                .interval("1h")
                .build();
        
        // When & Then
        assertThatThrownBy(() -> paramValidator.validateKlineParams(user, params))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Symbol is required");
    }
    
    @Test
    void validateKlineParams_ShouldThrowWhenIntervalIsNull() {
        // Given
        User user = createFreeUser();
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval(null)
                .build();
        
        // When & Then
        assertThatThrownBy(() -> paramValidator.validateKlineParams(user, params))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Interval is required");
    }
    
    @Test
    void validateKlineParams_ShouldThrowWhenIntervalIsInvalid() {
        // Given
        User user = createFreeUser();
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("2h") // Not in whitelist
                .build();
        
        // When & Then
        assertThatThrownBy(() -> paramValidator.validateKlineParams(user, params))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid interval '2h'");
    }
    
    @Test
    void validateKlineParams_ShouldSetDefaultLimitWhenNull() {
        // Given
        User user = createFreeUser();
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(null)
                .build();
        
        // When
        paramValidator.validateKlineParams(user, params);
        
        // Then
        assertThat(params.getLimit()).isEqualTo(100);
    }
    
    @Test
    void validateKlineParams_ShouldClampNegativeLimitToOne() {
        // Given
        User user = createFreeUser();
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(-10)
                .build();
        
        // When
        paramValidator.validateKlineParams(user, params);
        
        // Then
        assertThat(params.getLimit()).isEqualTo(1);
    }
    
    @Test
    void validateKlineParams_ShouldClampLimitForFreeUser() {
        // Given
        User user = createFreeUser();
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(500) // Exceeds free tier limit
                .build();
        
        // When
        paramValidator.validateKlineParams(user, params);
        
        // Then
        assertThat(params.getLimit()).isEqualTo(200); // Clamped to free tier max
    }
    
    @Test
    void validateKlineParams_ShouldAllowHigherLimitForProUser() {
        // Given
        User user = createProUser();
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(500)
                .build();
        
        // When
        paramValidator.validateKlineParams(user, params);
        
        // Then
        assertThat(params.getLimit()).isEqualTo(500); // Not clamped
    }
    
    @Test
    void validateKlineParams_ShouldClampLimitForProUser() {
        // Given
        User user = createProUser();
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(1500) // Exceeds pro tier limit
                .build();
        
        // When
        paramValidator.validateKlineParams(user, params);
        
        // Then
        assertThat(params.getLimit()).isEqualTo(1000); // Clamped to pro tier max
    }
    
    @Test
    void validateKlineParams_ShouldThrowWhenRangeTooLargeForFreeUser() {
        // Given
        User user = createFreeUser();
        long now = System.currentTimeMillis();
        long thirtyOneDaysAgo = now - (31L * 24 * 60 * 60 * 1000);
        
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .startTime(thirtyOneDaysAgo)
                .endTime(now)
                .build();
        
        // When & Then
        assertThatThrownBy(() -> paramValidator.validateKlineParams(user, params))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Time range too large");
    }
    
    @Test
    void validateKlineParams_ShouldAllowLargeRangeForProUser() {
        // Given
        User user = createProUser();
        long now = System.currentTimeMillis();
        long ninetyDaysAgo = now - (90L * 24 * 60 * 60 * 1000);
        
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .startTime(ninetyDaysAgo)
                .endTime(now)
                .limit(100)
                .build();
        
        // When & Then - should not throw
        paramValidator.validateKlineParams(user, params);
    }
    
    @Test
    void validateKlineParams_ShouldThrowWhenEndTimeBeforeStartTime() {
        // Given
        User user = createFreeUser();
        long now = System.currentTimeMillis();
        long oneDayFromNow = now + (24L * 60 * 60 * 1000);
        
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .startTime(oneDayFromNow)
                .endTime(now)
                .build();
        
        // When & Then
        assertThatThrownBy(() -> paramValidator.validateKlineParams(user, params))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("End time must be after start time");
    }
    
    @Test
    void validateKlineParams_ShouldHandleNullUser() {
        // Given
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(150)
                .build();
        
        // When
        paramValidator.validateKlineParams(null, params);
        
        // Then - should use free tier limits
        assertThat(params.getLimit()).isEqualTo(150);
    }
    
    @Test
    void validateSymbol_ShouldPassForValidSymbol() {
        // When & Then - should not throw
        paramValidator.validateSymbol("BTCUSDT");
    }
    
    @Test
    void validateSymbol_ShouldThrowForNull() {
        // When & Then
        assertThatThrownBy(() -> paramValidator.validateSymbol(null))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Symbol is required");
    }
    
    @Test
    void validateSymbol_ShouldThrowForEmpty() {
        // When & Then
        assertThatThrownBy(() -> paramValidator.validateSymbol(""))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Symbol is required");
    }
    
    @Test
    void validateSymbol_ShouldThrowForInvalidFormat() {
        // When & Then
        assertThatThrownBy(() -> paramValidator.validateSymbol("btc-usdt"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid symbol format");
    }
    
    @Test
    void validateSymbol_ShouldThrowForLowercase() {
        // When & Then
        assertThatThrownBy(() -> paramValidator.validateSymbol("btcusdt"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid symbol format");
    }
    
    @Test
    void validateSymbol_ShouldThrowForTooShort() {
        // When & Then
        assertThatThrownBy(() -> paramValidator.validateSymbol("B"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid symbol format");
    }
    
    @Test
    void validateSymbol_ShouldThrowForTooLong() {
        // When & Then
        assertThatThrownBy(() -> paramValidator.validateSymbol("VERYLONGSYMBOLNAMEMORETHAN20CHARS"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid symbol format");
    }
    
    // Helper methods
    
    private User createFreeUser() {
        return User.builder()
                .id(UUID.randomUUID())
                .email("free@example.com")
                .passwordHash("hash")
                .fullName("Free User")
                .role("USER")
                .enabled(true)
                .createdAt(Instant.now())
                .build();
    }
    
    private User createProUser() {
        return User.builder()
                .id(UUID.randomUUID())
                .email("pro@example.com")
                .passwordHash("hash")
                .fullName("Pro User")
                .role("PRO")
                .enabled(true)
                .createdAt(Instant.now())
                .build();
    }
}

