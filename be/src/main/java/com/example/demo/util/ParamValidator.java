package com.example.demo.util;

import com.example.demo.dto.KlineParams;
import com.example.demo.entity.User;
import com.example.demo.exception.BadRequestException;
import com.example.demo.service.FeatureFlagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Utility class to validate frontend-controlled parameters
 * Prevents invalid/abusive params from reaching external providers
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ParamValidator {
    
    private final FeatureFlagService featureFlagService;
    
    @Value("${app.kline.valid-intervals:1m,5m,15m,1h,4h,1d}")
    private String validIntervalsConfig;
    
    @Value("${app.kline.max-limit.free:200}")
    private Integer maxLimitFree;
    
    @Value("${app.kline.max-limit.pro:1000}")
    private Integer maxLimitPro;
    
    @Value("${app.kline.max-range-days.free:30}")
    private Integer maxRangeDaysFree;
    
    @Value("${app.kline.max-range-days.pro:365}")
    private Integer maxRangeDaysPro;
    
    private Set<String> validIntervals;
    
    /**
     * Validate kline parameters
     * - Checks whitelist interval
     * - Clamps limit to user's max
     * - Checks range days
     * 
     * @param user User making the request (nullable for anonymous)
     * @param params Normalized kline parameters
     * @throws BadRequestException if validation fails
     */
    public void validateKlineParams(User user, KlineParams params) {
        log.debug("Validating kline params for user: {}, params: {}", 
                  user != null ? user.getEmail() : "anonymous", params);
        
        // Validate symbol
        if (params.getSymbol() == null || params.getSymbol().isEmpty()) {
            throw new BadRequestException("Symbol is required");
        }
        
        // Validate interval against whitelist
        validateInterval(params.getInterval());
        
        // Clamp limit based on user tier
        clampLimit(user, params);
        
        // Validate range days
        validateRangeDays(user, params);
        
        log.debug("Kline params validated successfully");
    }
    
    /**
     * Validate interval against whitelist
     */
    private void validateInterval(String interval) {
        if (interval == null || interval.isEmpty()) {
            throw new BadRequestException("Interval is required");
        }
        
        // Lazy initialize valid intervals
        if (validIntervals == null) {
            validIntervals = new HashSet<>(Arrays.asList(validIntervalsConfig.split(",")));
        }
        
        if (!validIntervals.contains(interval)) {
            throw new BadRequestException(
                String.format("Invalid interval '%s'. Valid intervals: %s", 
                             interval, validIntervalsConfig)
            );
        }
    }
    
    /**
     * Clamp limit based on user tier
     */
    private void clampLimit(User user, KlineParams params) {
        Integer maxLimit = getMaxLimit(user);
        
        if (params.getLimit() == null) {
            params.setLimit(100); // Default limit
        }
        
        if (params.getLimit() < 1) {
            params.setLimit(1);
        }
        
        if (params.getLimit() > maxLimit) {
            log.debug("Clamping limit from {} to {} for user: {}", 
                     params.getLimit(), maxLimit, 
                     user != null ? user.getEmail() : "anonymous");
            params.setLimit(maxLimit);
        }
    }
    
    /**
     * Validate range days based on user tier
     */
    private void validateRangeDays(User user, KlineParams params) {
        if (params.getStartTime() == null || params.getEndTime() == null) {
            return; // No range validation if times not provided
        }
        
        Integer rangeDays = params.getRangeDays();
        Integer maxRangeDays = getMaxRangeDays(user);
        
        if (rangeDays != null && rangeDays > maxRangeDays) {
            throw new BadRequestException(
                String.format("Time range too large. Maximum allowed: %d days, requested: %d days", 
                             maxRangeDays, rangeDays)
            );
        }
        
        // Validate that endTime is after startTime
        if (params.getEndTime() <= params.getStartTime()) {
            throw new BadRequestException("End time must be after start time");
        }
    }
    
    /**
     * Get max limit based on user subscription plan
     */
    private Integer getMaxLimit(User user) {
        if (user == null) {
            return maxLimitFree;
        }
        
        String plan = featureFlagService.getUserPlan(user.getId());
        if ("pro".equalsIgnoreCase(plan) || "premium".equalsIgnoreCase(plan)) {
            return maxLimitPro;
        }
        
        return maxLimitFree;
    }
    
    /**
     * Get max range days based on user subscription plan
     */
    private Integer getMaxRangeDays(User user) {
        if (user == null) {
            return maxRangeDaysFree;
        }
        
        String plan = featureFlagService.getUserPlan(user.getId());
        if ("pro".equalsIgnoreCase(plan) || "premium".equalsIgnoreCase(plan)) {
            return maxRangeDaysPro;
        }
        
        return maxRangeDaysFree;
    }
    
    /**
     * Validate symbol format
     * 
     * @param symbol Trading pair symbol
     * @throws BadRequestException if symbol is invalid
     */
    public void validateSymbol(String symbol) {
        if (symbol == null || symbol.isEmpty()) {
            throw new BadRequestException("Symbol is required");
        }
        
        // Basic validation: alphanumeric only, 2-20 characters
        if (!symbol.matches("^[A-Z0-9]{2,20}$")) {
            throw new BadRequestException(
                "Invalid symbol format. Must be 2-20 uppercase alphanumeric characters"
            );
        }
    }
}

