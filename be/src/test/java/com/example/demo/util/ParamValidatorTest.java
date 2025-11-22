package com.example.demo.util;

import com.example.demo.dto.KlineParams;
import com.example.demo.entity.User;
import com.example.demo.exception.BadRequestException;
import com.example.demo.service.FeatureFlagService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ParamValidatorTest {

    @Mock
    private FeatureFlagService featureFlagService;

    @InjectMocks
    private ParamValidator paramValidator;

    private UUID testUserId;
    private User freeUser;
    private User proUser;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        freeUser = User.builder().id(testUserId).email("free@example.com").role("USER").build();
        proUser = User.builder().id(UUID.randomUUID()).email("pro@example.com").role("USER").build();
        
        ReflectionTestUtils.setField(paramValidator, "validIntervalsConfig", "1m,5m,15m,1h,4h,1d");
        ReflectionTestUtils.setField(paramValidator, "maxLimitFree", 200);
        ReflectionTestUtils.setField(paramValidator, "maxLimitPro", 1000);
        ReflectionTestUtils.setField(paramValidator, "maxRangeDaysFree", 30);
        ReflectionTestUtils.setField(paramValidator, "maxRangeDaysPro", 365);
    }

    @Test
    void validateKlineParams_ShouldThrowException_WhenSymbolIsMissing() {
        KlineParams params = KlineParams.builder()
                .interval("1h")
                .limit(100)
                .build();
        
        assertThatThrownBy(() -> paramValidator.validateKlineParams(freeUser, params))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Symbol is required");
    }

    @Test
    void validateKlineParams_ShouldThrowException_WhenIntervalIsMissing() {
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .limit(100)
                .build();
        
        assertThatThrownBy(() -> paramValidator.validateKlineParams(freeUser, params))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Interval is required");
    }

    @Test
    void validateKlineParams_ShouldThrowException_WhenIntervalIsInvalid() {
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("2h") // Not in whitelist
                .limit(100)
                .build();
        
        assertThatThrownBy(() -> paramValidator.validateKlineParams(freeUser, params))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid interval");
    }

    @Test
    void validateKlineParams_ShouldAcceptValidInterval() {
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(100)
                .build();
        
        when(featureFlagService.getUserPlan(testUserId)).thenReturn("free");
        
        // Should not throw
        paramValidator.validateKlineParams(freeUser, params);
    }

    @Test
    void validateKlineParams_ShouldClampLimit_WhenFreeUserExceedsMaxLimit() {
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(500) // Exceeds free limit of 200
                .build();
        
        when(featureFlagService.getUserPlan(testUserId)).thenReturn("free");
        
        paramValidator.validateKlineParams(freeUser, params);
        
        assertThat(params.getLimit()).isEqualTo(200); // Clamped to max
    }

    @Test
    void validateKlineParams_ShouldAllowHigherLimit_WhenProUser() {
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(500) // Within pro limit of 1000
                .build();
        
        when(featureFlagService.getUserPlan(proUser.getId())).thenReturn("pro");
        
        paramValidator.validateKlineParams(proUser, params);
        
        assertThat(params.getLimit()).isEqualTo(500); // Not clamped
    }

    @Test
    void validateKlineParams_ShouldClampLimit_WhenProUserExceedsMaxLimit() {
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(2000) // Exceeds pro limit of 1000
                .build();
        
        when(featureFlagService.getUserPlan(proUser.getId())).thenReturn("pro");
        
        paramValidator.validateKlineParams(proUser, params);
        
        assertThat(params.getLimit()).isEqualTo(1000); // Clamped to max
    }

    @Test
    void validateKlineParams_ShouldThrowException_WhenRangeExceedsFreeLimit() {
        long now = System.currentTimeMillis();
        long startTime = now - (35L * 24 * 60 * 60 * 1000); // 35 days ago
        long endTime = now;
        
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(100)
                .startTime(startTime)
                .endTime(endTime)
                .build();
        
        when(featureFlagService.getUserPlan(testUserId)).thenReturn("free");
        
        assertThatThrownBy(() -> paramValidator.validateKlineParams(freeUser, params))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Time range too large");
    }

    @Test
    void validateKlineParams_ShouldAllowLargerRange_WhenProUser() {
        long now = System.currentTimeMillis();
        long startTime = now - (100L * 24 * 60 * 60 * 1000); // 100 days ago
        long endTime = now;
        
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(100)
                .startTime(startTime)
                .endTime(endTime)
                .build();
        
        when(featureFlagService.getUserPlan(proUser.getId())).thenReturn("pro");
        
        // Should not throw (within 365 days limit)
        paramValidator.validateKlineParams(proUser, params);
    }

    @Test
    void validateKlineParams_ShouldThrowException_WhenEndTimeBeforeStartTime() {
        long now = System.currentTimeMillis();
        
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(100)
                .startTime(now)
                .endTime(now - 1000) // End before start
                .build();
        
        when(featureFlagService.getUserPlan(testUserId)).thenReturn("free");
        
        assertThatThrownBy(() -> paramValidator.validateKlineParams(freeUser, params))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("End time must be after start time");
    }

    @Test
    void validateKlineParams_ShouldSetDefaultLimit_WhenLimitIsNull() {
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(null)
                .build();
        
        when(featureFlagService.getUserPlan(testUserId)).thenReturn("free");
        
        paramValidator.validateKlineParams(freeUser, params);
        
        assertThat(params.getLimit()).isEqualTo(100); // Default limit
    }

    @Test
    void validateKlineParams_ShouldClampLimitToMinimum_WhenLimitIsZero() {
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(0)
                .build();
        
        when(featureFlagService.getUserPlan(testUserId)).thenReturn("free");
        
        paramValidator.validateKlineParams(freeUser, params);
        
        assertThat(params.getLimit()).isEqualTo(1); // Clamped to minimum
    }

    @Test
    void validateKlineParams_ShouldHandleAnonymousUser() {
        KlineParams params = KlineParams.builder()
                .symbol("BTCUSDT")
                .interval("1h")
                .limit(500) // Exceeds free limit
                .build();
        
        paramValidator.validateKlineParams(null, params);
        
        assertThat(params.getLimit()).isEqualTo(200); // Clamped to free limit
    }

    @Test
    void validateSymbol_ShouldAcceptValidSymbol() {
        paramValidator.validateSymbol("BTCUSDT");
        paramValidator.validateSymbol("ETHBTC");
        paramValidator.validateSymbol("SOLUSDT");
    }

    @Test
    void validateSymbol_ShouldThrowException_WhenSymbolIsNull() {
        assertThatThrownBy(() -> paramValidator.validateSymbol(null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Symbol is required");
    }

    @Test
    void validateSymbol_ShouldThrowException_WhenSymbolIsEmpty() {
        assertThatThrownBy(() -> paramValidator.validateSymbol(""))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Symbol is required");
    }

    @Test
    void validateSymbol_ShouldThrowException_WhenSymbolHasInvalidFormat() {
        assertThatThrownBy(() -> paramValidator.validateSymbol("BTC-USDT")) // Contains dash
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid symbol format");
        
        assertThatThrownBy(() -> paramValidator.validateSymbol("B")) // Too short
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid symbol format");
    }
}
