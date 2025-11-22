package com.example.demo.security;

import com.example.demo.config.RateLimiterConfig;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Rate limit interceptor using token bucket algorithm with Redis
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {
    
    private final StringRedisTemplate rateLimiterRedisTemplate;
    private final Map<String, RateLimiterConfig.RateLimitRule> rateLimitRules;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    
    private static final String RATE_LIMIT_KEY_PREFIX = "rate_limit:";
    private static final String TOKENS_KEY = ":tokens";
    private static final String LAST_REFILL_KEY = ":last_refill";
    
    @Override
    public boolean preHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, 
                             @NonNull Object handler) throws Exception {
        
        String path = request.getRequestURI();
        if (path.startsWith("/api/auth/")) {
            return true;
        }
        
        String userIdentifier = getUserIdentifier(request);
        String userTier = getUserTier();
        
        RateLimiterConfig.RateLimitRule rule = rateLimitRules.getOrDefault(userTier, 
                rateLimitRules.get("ANONYMOUS"));
        
        boolean allowed = checkRateLimit(userIdentifier, rule);
        
        if (!allowed) {
            handleRateLimitExceeded(response, userIdentifier, rule);
            return false;
        }
        
        addRateLimitHeaders(response, userIdentifier, rule);
        
        return true;
    }
    
    /**
     * Check rate limit using token bucket algorithm
     */
    private boolean checkRateLimit(String userIdentifier, RateLimiterConfig.RateLimitRule rule) {
        String tokensKey = RATE_LIMIT_KEY_PREFIX + userIdentifier + TOKENS_KEY;
        String lastRefillKey = RATE_LIMIT_KEY_PREFIX + userIdentifier + LAST_REFILL_KEY;
        
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
            
            if (currentTokens >= 1.0) {
                currentTokens -= 1.0;
                
                rateLimiterRedisTemplate.opsForValue().set(tokensKey, String.valueOf(currentTokens), 2, TimeUnit.MINUTES);
                rateLimiterRedisTemplate.opsForValue().set(lastRefillKey, String.valueOf(now), 2, TimeUnit.MINUTES);
                
                log.debug("Rate limit check passed for {}: {} tokens remaining", userIdentifier, currentTokens);
                return true;
            } else {
                rateLimiterRedisTemplate.opsForValue().set(tokensKey, String.valueOf(currentTokens), 2, TimeUnit.MINUTES);
                rateLimiterRedisTemplate.opsForValue().set(lastRefillKey, String.valueOf(now), 2, TimeUnit.MINUTES);
                
                log.warn("Rate limit exceeded for {}: {} tokens remaining", userIdentifier, currentTokens);
                return false;
            }
            
        } catch (Exception e) {
            log.error("Error checking rate limit for {}: {}", userIdentifier, e.getMessage(), e);
            return true;
        }
    }
    
    /**
     * Get remaining tokens for a user
     */
    private double getRemainingTokens(String userIdentifier, RateLimiterConfig.RateLimitRule rule) {
        String tokensKey = RATE_LIMIT_KEY_PREFIX + userIdentifier + TOKENS_KEY;
        String lastRefillKey = RATE_LIMIT_KEY_PREFIX + userIdentifier + LAST_REFILL_KEY;
        
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
            log.error("Error getting remaining tokens for {}: {}", userIdentifier, e.getMessage());
            return rule.getBucketSize();
        }
    }
    
    /**
     * Get user identifier (email or IP)
     */
    private String getUserIdentifier(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return auth.getName();
        }
        
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty()) {
            ipAddress = request.getRemoteAddr();
        }
        return "anon:" + ipAddress;
    }
    
    /**
     * Get user tier for rate limiting
     */
    private String getUserTier() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                String email = auth.getName();
                User user = userRepository.findByEmail(email).orElse(null);
                
                if (user != null) {
                    return user.getRole(); // "USER" or "PRO"
                }
            }
        } catch (Exception e) {
            log.debug("Could not get user tier", e);
        }
        
        return "ANONYMOUS";
    }
    
    /**
     * Handle rate limit exceeded response
     */
    private void handleRateLimitExceeded(HttpServletResponse response, String userIdentifier, 
                                         RateLimiterConfig.RateLimitRule rule) throws IOException {
        response.setStatus(429); // Too Many Requests
        response.setContentType("application/json");
        response.setHeader("X-RateLimit-Limit", String.valueOf(rule.getRequestsPerMinute()));
        response.setHeader("X-RateLimit-Remaining", "0");
        response.setHeader("X-RateLimit-Reset", String.valueOf((long) (60 / rule.getRefillRate())));
        response.setHeader("Retry-After", "60");
        
        Map<String, Object> errorBody = new HashMap<>();
        errorBody.put("error", "Rate limit exceeded");
        errorBody.put("message", String.format("Too many requests. Maximum %d requests per minute allowed.", 
                                              rule.getRequestsPerMinute()));
        errorBody.put("retryAfter", 60);
        errorBody.put("limit", rule.getRequestsPerMinute());
        errorBody.put("remaining", 0);
        
        response.getWriter().write(objectMapper.writeValueAsString(errorBody));
        
        log.warn("Rate limit exceeded for {}: limit={}/min", userIdentifier, rule.getRequestsPerMinute());
    }
    
    /**
     * Add rate limit headers to successful response
     */
    private void addRateLimitHeaders(HttpServletResponse response, String userIdentifier, 
                                     RateLimiterConfig.RateLimitRule rule) {
        double remainingTokens = getRemainingTokens(userIdentifier, rule);
        
        response.setHeader("X-RateLimit-Limit", String.valueOf(rule.getRequestsPerMinute()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf((int) Math.floor(remainingTokens)));
        response.setHeader("X-RateLimit-Reset", String.valueOf((long) (60 / rule.getRefillRate())));
    }
}

