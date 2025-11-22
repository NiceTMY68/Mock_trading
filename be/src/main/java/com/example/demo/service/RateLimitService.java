package com.example.demo.service;

import com.example.demo.config.RateLimiterConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Service for rate limiting using token bucket algorithm with Redis
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitService {
    
    private final StringRedisTemplate rateLimiterRedisTemplate;
    private final Map<String, RateLimiterConfig.RateLimitRule> rateLimitRules;
    
    private static final String RATE_LIMIT_KEY_PREFIX = "rate_limit:";
    private static final String TOKENS_KEY = ":tokens";
    private static final String LAST_REFILL_KEY = ":last_refill";
    
    /**
     * Try to consume tokens for a user (UUID)
     * 
     * @param userId User UUID
     * @param tokens Number of tokens to consume
     * @return true if tokens were consumed successfully, false if rate limit exceeded
     */
    public boolean tryConsume(UUID userId, int tokens) {
        return tryConsume(userId.toString(), tokens, "USER");
    }
    
    /**
     * Try to consume tokens for a user (String identifier)
     * 
     * @param userId User identifier (can be UUID string, email, or IP address)
     * @param tokens Number of tokens to consume
     * @return true if tokens were consumed successfully, false if rate limit exceeded
     */
    public boolean tryConsume(String userId, int tokens) {
        return tryConsume(userId, tokens, "USER");
    }
    
    /**
     * Try to consume tokens for a user with specific tier
     * 
     * @param userId User identifier
     * @param tokens Number of tokens to consume
     * @param tier User tier (ANONYMOUS, USER, PRO)
     * @return true if tokens were consumed successfully, false if rate limit exceeded
     */
    public boolean tryConsume(String userId, int tokens, String tier) {
        RateLimiterConfig.RateLimitRule rule = rateLimitRules.getOrDefault(tier, 
                rateLimitRules.get("ANONYMOUS"));
        
        if (rule == null) {
            log.warn("No rate limit rule found for tier: {}, allowing request", tier);
            return true;
        }
        
        String tokensKey = RATE_LIMIT_KEY_PREFIX + userId + TOKENS_KEY;
        String lastRefillKey = RATE_LIMIT_KEY_PREFIX + userId + LAST_REFILL_KEY;
        
        long now = System.currentTimeMillis();
        
        try {
            String tokensStr = rateLimiterRedisTemplate.opsForValue().get(tokensKey);
            String lastRefillStr = rateLimiterRedisTemplate.opsForValue().get(lastRefillKey);
            
            double currentTokens;
            long lastRefillTime;
            
            if (tokensStr == null || lastRefillStr == null) {
                currentTokens = rule.getBucketSize();
                lastRefillTime = now;
            } else {
                currentTokens = Double.parseDouble(tokensStr);
                lastRefillTime = Long.parseLong(lastRefillStr);
            }
            
            double secondsElapsed = (now - lastRefillTime) / 1000.0;
            double tokensToAdd = secondsElapsed * rule.getRefillRate();
            currentTokens = Math.min(currentTokens + tokensToAdd, rule.getBucketSize());
            
            if (currentTokens >= tokens) {
                currentTokens -= tokens;
                
                rateLimiterRedisTemplate.opsForValue().set(tokensKey, String.valueOf(currentTokens), 2, TimeUnit.MINUTES);
                rateLimiterRedisTemplate.opsForValue().set(lastRefillKey, String.valueOf(now), 2, TimeUnit.MINUTES);
                
                log.debug("Rate limit check passed for {}: {} tokens consumed, {} remaining", 
                        userId, tokens, currentTokens);
                return true;
            } else {
                rateLimiterRedisTemplate.opsForValue().set(tokensKey, String.valueOf(currentTokens), 2, TimeUnit.MINUTES);
                rateLimiterRedisTemplate.opsForValue().set(lastRefillKey, String.valueOf(now), 2, TimeUnit.MINUTES);
                
                log.warn("Rate limit exceeded for {}: need {} tokens, have {}", 
                        userId, tokens, currentTokens);
                return false;
            }
            
        } catch (Exception e) {
            log.error("Error checking rate limit for {}: {}", userId, e.getMessage(), e);
            return true;
        }
    }
    
    /**
     * Get remaining tokens for a user
     * 
     * @param userId User identifier
     * @param tier User tier
     * @return Number of remaining tokens
     */
    public double getRemainingTokens(String userId, String tier) {
        RateLimiterConfig.RateLimitRule rule = rateLimitRules.getOrDefault(tier, 
                rateLimitRules.get("ANONYMOUS"));
        
        if (rule == null) {
            return 0;
        }
        
        String tokensKey = RATE_LIMIT_KEY_PREFIX + userId + TOKENS_KEY;
        String lastRefillKey = RATE_LIMIT_KEY_PREFIX + userId + LAST_REFILL_KEY;
        
        long now = System.currentTimeMillis();
        
        try {
            String tokensStr = rateLimiterRedisTemplate.opsForValue().get(tokensKey);
            String lastRefillStr = rateLimiterRedisTemplate.opsForValue().get(lastRefillKey);
            
            if (tokensStr == null || lastRefillStr == null) {
                return rule.getBucketSize();
            }
            
            double currentTokens = Double.parseDouble(tokensStr);
            long lastRefillTime = Long.parseLong(lastRefillStr);
            
            double secondsElapsed = (now - lastRefillTime) / 1000.0;
            double tokensToAdd = secondsElapsed * rule.getRefillRate();
            
            return Math.min(currentTokens + tokensToAdd, rule.getBucketSize());
            
        } catch (Exception e) {
            log.error("Error getting remaining tokens for {}: {}", userId, e.getMessage());
            return rule.getBucketSize();
        }
    }
    
    /**
     * Get rate limit rule for a tier
     * 
     * @param tier User tier
     * @return Rate limit rule
     */
    public RateLimiterConfig.RateLimitRule getRule(String tier) {
        return rateLimitRules.getOrDefault(tier, rateLimitRules.get("ANONYMOUS"));
    }
}

