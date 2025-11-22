package com.example.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuration for Redis-backed rate limiter
 */
@Configuration
public class RateLimiterConfig {
    
    @Value("${rate-limit.free.requests-per-minute:60}")
    private Integer freeRequestsPerMinute;
    
    @Value("${rate-limit.pro.requests-per-minute:300}")
    private Integer proRequestsPerMinute;
    
    @Value("${rate-limit.anonymous.requests-per-minute:20}")
    private Integer anonymousRequestsPerMinute;
    
    @Value("${rate-limit.bucket-size-multiplier:2}")
    private Integer bucketSizeMultiplier;
    
    /**
     * Redis template for rate limiter operations
     */
    @Bean
    public StringRedisTemplate rateLimiterRedisTemplate(RedisConnectionFactory connectionFactory) {
        StringRedisTemplate template = new StringRedisTemplate(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new StringRedisSerializer());
        return template;
    }
    
    /**
     * Get rate limit configuration by user tier
     */
    @Bean
    public Map<String, RateLimitRule> rateLimitRules() {
        Map<String, RateLimitRule> rules = new HashMap<>();
        
        rules.put("ANONYMOUS", RateLimitRule.builder()
                .requestsPerMinute(anonymousRequestsPerMinute)
                .bucketSize(anonymousRequestsPerMinute * bucketSizeMultiplier)
                .refillRate(anonymousRequestsPerMinute / 60.0)
                .build());
        
        rules.put("USER", RateLimitRule.builder()
                .requestsPerMinute(freeRequestsPerMinute)
                .bucketSize(freeRequestsPerMinute * bucketSizeMultiplier)
                .refillRate(freeRequestsPerMinute / 60.0)
                .build());
        
        rules.put("PRO", RateLimitRule.builder()
                .requestsPerMinute(proRequestsPerMinute)
                .bucketSize(proRequestsPerMinute * bucketSizeMultiplier)
                .refillRate(proRequestsPerMinute / 60.0)
                .build());
        
        return rules;
    }
    
    /**
     * Rate limit rule definition
     */
    public static class RateLimitRule {
        private final Integer requestsPerMinute;
        private final Integer bucketSize;
        private final Double refillRate; // tokens per second
        
        private RateLimitRule(Builder builder) {
            this.requestsPerMinute = builder.requestsPerMinute;
            this.bucketSize = builder.bucketSize;
            this.refillRate = builder.refillRate;
        }
        
        public Integer getRequestsPerMinute() {
            return requestsPerMinute;
        }
        
        public Integer getBucketSize() {
            return bucketSize;
        }
        
        public Double getRefillRate() {
            return refillRate;
        }
        
        public static Builder builder() {
            return new Builder();
        }
        
        public static class Builder {
            private Integer requestsPerMinute;
            private Integer bucketSize;
            private Double refillRate;
            
            public Builder requestsPerMinute(Integer requestsPerMinute) {
                this.requestsPerMinute = requestsPerMinute;
                return this;
            }
            
            public Builder bucketSize(Integer bucketSize) {
                this.bucketSize = bucketSize;
                return this;
            }
            
            public Builder refillRate(Double refillRate) {
                this.refillRate = refillRate;
                return this;
            }
            
            public RateLimitRule build() {
                return new RateLimitRule(this);
            }
        }
    }
}

