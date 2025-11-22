package com.example.demo.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

@Configuration
@EnableCaching
public class CacheConfig {
    
    @Value("${cache.ttl.default:PT5M}")
    private String defaultTtl;
    
    @Value("${cache.ttl.klines:PT1M}")
    private String klinesTtl;
    
    @Value("${cache.ttl.symbols:PT1H}")
    private String symbolsTtl;
    
    @Value("${cache.ttl.news:PT15M}")
    private String newsTtl;
    
    @Value("${cache.ttl.ticker:PT30S}")
    private String tickerTtl;
    
    @Value("${cache.ttl.market-data:PT5M}")
    private String marketDataTtl;
    
    public Duration getDefaultTtl() {
        return Duration.parse(defaultTtl);
    }
    
    public Duration getKlinesTtl() {
        return Duration.parse(klinesTtl);
    }
    
    public Duration getSymbolsTtl() {
        return Duration.parse(symbolsTtl);
    }
    
    public Duration getNewsTtl() {
        return Duration.parse(newsTtl);
    }
    
    public Duration getTickerTtl() {
        return Duration.parse(tickerTtl);
    }
    
    public Duration getMarketDataTtl() {
        return Duration.parse(marketDataTtl);
    }
    
    @Deprecated
    public static final Duration DEFAULT_TTL = Duration.ofMinutes(5);
    
    @Deprecated
    public static final Duration KLINE_TTL = Duration.ofMinutes(1);
    
    @Deprecated
    public static final Duration TICKER_TTL = Duration.ofSeconds(30);
    
    @Deprecated
    public static final Duration SYMBOL_INFO_TTL = Duration.ofHours(1);
    
    @Deprecated
    public static final Duration NEWS_TTL = Duration.ofMinutes(15);
    
    @Deprecated
    public static final Duration MARKET_DATA_TTL = Duration.ofMinutes(5);
    
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        
        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer(objectMapper);
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);
        
        template.afterPropertiesSet();
        return template;
    }
    
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer(objectMapper);
        
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.parse(defaultTtl))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jsonSerializer))
                .disableCachingNullValues();
        
        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }
}

