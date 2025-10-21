package com.example.demo.client.newsdata.service;

import com.example.demo.client.newsdata.config.NewsDataProperties;
import com.example.demo.client.newsdata.model.NewsDataResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewsDataRestClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final NewsDataProperties properties;

    public NewsDataResponse getCryptoNews(Map<String, String> parameters) {
        String cacheKey = buildCacheKey(parameters);
        
        NewsDataResponse cached = (NewsDataResponse) redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return cached;
        }

        try {
            UriComponentsBuilder builder = UriComponentsBuilder
                    .fromUriString(properties.getBaseUrl() + "/crypto")
                    .queryParam("apikey", properties.getApiKey());
            
            if (parameters != null) {
                parameters.forEach(builder::queryParam);
            }
            
            String url = builder.toUriString();
            String response = restTemplate.getForObject(url, String.class);
            
            NewsDataResponse newsData = objectMapper.readValue(response, NewsDataResponse.class);
            
            redisTemplate.opsForValue().set(cacheKey, newsData, 15, TimeUnit.MINUTES);
            
            return newsData;
            
        } catch (Exception e) {
            log.error("Error fetching crypto news: {}", e.getMessage(), e);
            return null;
        }
    }

    public NewsDataResponse getNews(String endpoint, Map<String, String> parameters) {
        String cacheKey = buildCacheKey(endpoint, parameters);
        
        NewsDataResponse cached = (NewsDataResponse) redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return cached;
        }

        try {
            UriComponentsBuilder builder = UriComponentsBuilder
                    .fromUriString(properties.getBaseUrl() + "/" + endpoint)
                    .queryParam("apikey", properties.getApiKey());
            
            if (parameters != null) {
                parameters.forEach(builder::queryParam);
            }
            
            String url = builder.toUriString();
            String response = restTemplate.getForObject(url, String.class);
            
            NewsDataResponse newsData = objectMapper.readValue(response, NewsDataResponse.class);
            
            redisTemplate.opsForValue().set(cacheKey, newsData, 15, TimeUnit.MINUTES);
            
            return newsData;
            
        } catch (Exception e) {
            log.error("Error fetching news from {}: {}", endpoint, e.getMessage(), e);
            return null;
        }
    }

    private String buildCacheKey(Map<String, String> parameters) {
        return buildCacheKey("crypto", parameters);
    }

    private String buildCacheKey(String endpoint, Map<String, String> parameters) {
        StringBuilder key = new StringBuilder("newsdata:" + endpoint);
        if (parameters != null && !parameters.isEmpty()) {
            parameters.forEach((k, v) -> key.append(":").append(k).append("=").append(v));
        }
        return key.toString();
    }
}

