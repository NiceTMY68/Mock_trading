package com.example.demo.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CacheServiceTest {
    
    @Mock
    private RedisTemplate<String, Object> redisTemplate;
    
    @Mock
    private ObjectMapper objectMapper;
    
    @Mock
    private ValueOperations<String, Object> valueOperations;
    
    @InjectMocks
    private CacheService cacheService;
    
    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }
    
    @Test
    void get_ShouldReturnValue_WhenCacheHit() {
        // Given
        String key = "test:key";
        String cachedValue = "test-value";
        when(valueOperations.get(key)).thenReturn(cachedValue);
        
        // When
        Optional<String> result = cacheService.get(key, String.class);
        
        // Then
        assertThat(result).isPresent();
        assertThat(result.get()).isEqualTo(cachedValue);
        verify(valueOperations).get(key);
    }
    
    @Test
    void get_ShouldReturnEmpty_WhenCacheMiss() {
        // Given
        String key = "test:key";
        when(valueOperations.get(key)).thenReturn(null);
        
        // When
        Optional<String> result = cacheService.get(key, String.class);
        
        // Then
        assertThat(result).isEmpty();
        verify(valueOperations).get(key);
    }
    
    @Test
    void get_ShouldConvertValue_WhenTypesDiffer() {
        // Given
        String key = "test:key";
        Object cachedValue = new Object();
        String convertedValue = "converted";
        when(valueOperations.get(key)).thenReturn(cachedValue);
        when(objectMapper.convertValue(cachedValue, String.class)).thenReturn(convertedValue);
        
        // When
        Optional<String> result = cacheService.get(key, String.class);
        
        // Then
        assertThat(result).isPresent();
        assertThat(result.get()).isEqualTo(convertedValue);
        verify(objectMapper).convertValue(cachedValue, String.class);
    }
    
    @Test
    void getWithTypeReference_ShouldReturnValue_WhenCacheHit() {
        // Given
        String key = "test:key";
        Object cachedValue = new Object();
        List<String> convertedValue = List.of("value1", "value2");
        TypeReference<List<String>> typeRef = new TypeReference<List<String>>() {};
        
        when(valueOperations.get(key)).thenReturn(cachedValue);
        when(objectMapper.convertValue(eq(cachedValue), any(TypeReference.class))).thenReturn(convertedValue);
        
        // When
        Optional<List<String>> result = cacheService.get(key, typeRef);
        
        // Then
        assertThat(result).isPresent();
        assertThat(result.get()).hasSize(2);
        verify(objectMapper).convertValue(eq(cachedValue), any(TypeReference.class));
    }
    
    @Test
    void put_ShouldCacheValue_WithTTL() {
        // Given
        String key = "test:key";
        String value = "test-value";
        Duration ttl = Duration.ofMinutes(5);
        
        // When
        cacheService.put(key, value, ttl);
        
        // Then
        verify(valueOperations).set(key, value, ttl);
    }
    
    @Test
    void put_ShouldNotCache_WhenValueIsNull() {
        // Given
        String key = "test:key";
        Duration ttl = Duration.ofMinutes(5);
        
        // When
        cacheService.put(key, null, ttl);
        
        // Then
        verify(valueOperations, never()).set(anyString(), any(), any(Duration.class));
    }
    
    @Test
    void putWithoutTTL_ShouldCacheValue() {
        // Given
        String key = "test:key";
        String value = "test-value";
        
        // When
        cacheService.put(key, value);
        
        // Then
        verify(valueOperations).set(key, value);
    }
    
    @Test
    void evict_ShouldDeleteKey() {
        // Given
        String key = "test:key";
        when(redisTemplate.delete(key)).thenReturn(true);
        
        // When
        cacheService.evict(key);
        
        // Then
        verify(redisTemplate).delete(key);
    }
    
    @Test
    void evictPattern_ShouldDeleteMatchingKeys() {
        // Given
        String pattern = "test:*";
        Set<String> matchingKeys = Set.of("test:key1", "test:key2");
        when(redisTemplate.keys(pattern)).thenReturn(matchingKeys);
        when(redisTemplate.delete(matchingKeys)).thenReturn(2L);
        
        // When
        cacheService.evictPattern(pattern);
        
        // Then
        verify(redisTemplate).keys(pattern);
        verify(redisTemplate).delete(matchingKeys);
    }
    
    @Test
    void exists_ShouldReturnTrue_WhenKeyExists() {
        // Given
        String key = "test:key";
        when(redisTemplate.hasKey(key)).thenReturn(true);
        
        // When
        boolean result = cacheService.exists(key);
        
        // Then
        assertThat(result).isTrue();
        verify(redisTemplate).hasKey(key);
    }
    
    @Test
    void exists_ShouldReturnFalse_WhenKeyDoesNotExist() {
        // Given
        String key = "test:key";
        when(redisTemplate.hasKey(key)).thenReturn(false);
        
        // When
        boolean result = cacheService.exists(key);
        
        // Then
        assertThat(result).isFalse();
        verify(redisTemplate).hasKey(key);
    }
    
    @Test
    void getTtl_ShouldReturnTTL_WhenKeyExists() {
        // Given
        String key = "test:key";
        when(redisTemplate.getExpire(key)).thenReturn(300L);
        
        // When
        long ttl = cacheService.getTtl(key);
        
        // Then
        assertThat(ttl).isEqualTo(300L);
        verify(redisTemplate).getExpire(key);
    }
}

