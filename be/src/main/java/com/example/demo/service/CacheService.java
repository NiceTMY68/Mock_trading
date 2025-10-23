package com.example.demo.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class CacheService {
    
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;
    
    public <T> Optional<T> get(String key, Class<T> type) {
        try {
            Object value = redisTemplate.opsForValue().get(key);
            if (value == null) {
                log.debug("Cache miss for key: {}", key);
                return Optional.empty();
            }
            
            log.debug("Cache hit for key: {}", key);
            
            if (type.isInstance(value)) {
                return Optional.of(type.cast(value));
            }
            
            T convertedValue = objectMapper.convertValue(value, type);
            return Optional.of(convertedValue);
            
        } catch (Exception e) {
            log.error("Error getting value from cache for key: {}", key, e);
            return Optional.empty();
        }
    }
    
    public <T> Optional<T> get(String key, TypeReference<T> typeReference) {
        try {
            Object value = redisTemplate.opsForValue().get(key);
            if (value == null) {
                log.debug("Cache miss for key: {}", key);
                return Optional.empty();
            }
            
            log.debug("Cache hit for key: {}", key);
            
            T convertedValue = objectMapper.convertValue(value, typeReference);
            return Optional.of(convertedValue);
            
        } catch (Exception e) {
            log.error("Error getting value from cache for key: {}", key, e);
            return Optional.empty();
        }
    }
    
    public void put(String key, Object value, Duration ttl) {
        try {
            if (value == null) {
                log.debug("Skipping cache put for null value, key: {}", key);
                return;
            }
            
            redisTemplate.opsForValue().set(key, value, ttl);
            log.debug("Cached value for key: {} with TTL: {}", key, ttl);
            
        } catch (Exception e) {
            log.error("Error putting value into cache for key: {}", key, e);
        }
    }
    
    public void put(String key, Object value) {
        try {
            if (value == null) {
                log.debug("Skipping cache put for null value, key: {}", key);
                return;
            }
            
            redisTemplate.opsForValue().set(key, value);
            log.debug("Cached value for key: {} (no TTL)", key);
            
        } catch (Exception e) {
            log.error("Error putting value into cache for key: {}", key, e);
        }
    }
    
    public void evict(String key) {
        try {
            Boolean deleted = redisTemplate.delete(key);
            if (Boolean.TRUE.equals(deleted)) {
                log.debug("Evicted cache for key: {}", key);
            } else {
                log.debug("Cache key not found for eviction: {}", key);
            }
        } catch (Exception e) {
            log.error("Error evicting cache for key: {}", key, e);
        }
    }
    
    public void evictPattern(String pattern) {
        try {
            Set<String> keys = redisTemplate.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                Long deleted = redisTemplate.delete(keys);
                log.debug("Evicted {} cache entries matching pattern: {}", deleted, pattern);
            } else {
                log.debug("No cache entries found matching pattern: {}", pattern);
            }
        } catch (Exception e) {
            log.error("Error evicting cache for pattern: {}", pattern, e);
        }
    }
    
    public boolean exists(String key) {
        try {
            Boolean exists = redisTemplate.hasKey(key);
            return Boolean.TRUE.equals(exists);
        } catch (Exception e) {
            log.error("Error checking if key exists: {}", key, e);
            return false;
        }
    }
    
    public long getTtl(String key) {
        try {
            Long ttl = redisTemplate.getExpire(key);
            return ttl != null ? ttl : -2;
        } catch (Exception e) {
            log.error("Error getting TTL for key: {}", key, e);
            return -2;
        }
    }
    
    public void clearAll() {
        try {
            Set<String> keys = redisTemplate.keys("*");
            if (keys != null && !keys.isEmpty()) {
                Long deleted = redisTemplate.delete(keys);
                log.warn("Cleared all cache entries: {} keys deleted", deleted);
            }
        } catch (Exception e) {
            log.error("Error clearing all cache", e);
        }
    }
}

