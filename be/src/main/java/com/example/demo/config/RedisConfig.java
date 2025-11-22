package com.example.demo.config;

import org.springframework.context.annotation.Configuration;

@Configuration
public class RedisConfig {
    // rateLimiterRedisTemplate is now defined in RateLimiterConfig
    // to avoid bean definition conflicts
}

