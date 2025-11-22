package com.example.demo.client.newsdata.service;

import com.example.demo.client.newsdata.config.NewsDataProperties;
import com.example.demo.client.newsdata.model.NewsDataResponse;
import com.example.demo.config.CacheConfig;
import com.example.demo.service.CacheService;
import com.example.demo.service.UsageService;
import com.example.demo.util.CacheKeyUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewsDataRestClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final CacheService cacheService;
    private final NewsDataProperties properties;
    private final UsageService usageService;
    
    @Autowired
    private CacheConfig cacheConfig;

    public NewsDataResponse getCryptoNews(Map<String, String> parameters) {
        return getCryptoNews(parameters, null);
    }
    
    public NewsDataResponse getCryptoNews(Map<String, String> parameters, UUID userId) {
        Instant from = parseInstant(parameters.get("from_date"));
        Instant to = parseInstant(parameters.get("to_date"));
        Integer page = parameters.containsKey("page") ? Integer.parseInt(parameters.get("page")) : null;
        String cacheKey = CacheKeyUtil.cryptoNewsKey(from, to, page);
        
        try {
            return cacheService.getOrFetch(cacheKey, () -> {
                NewsDataResponse newsData = fetchNews("crypto", parameters, userId);
                
                int articleCount = newsData != null && newsData.getResults() != null ? 
                    newsData.getResults().size() : 0;
                
                usageService.increment(UsageService.NEWS_API_CALLS, userId, 1, "crypto");
                usageService.increment(UsageService.NEWS_API_ARTICLES, userId, articleCount, "crypto");
                
                log.info("Fetched and cached crypto news: {} articles", articleCount);
                return newsData;
            }, cacheConfig.getNewsTtl());
        } catch (Exception e) {
            log.error("Error fetching crypto news: {}", e.getMessage(), e);
            return null;
        }
    }

    public NewsDataResponse getNews(String endpoint, Map<String, String> parameters) {
        return getNews(endpoint, parameters, null);
    }
    
    public NewsDataResponse getNews(String endpoint, Map<String, String> parameters, UUID userId) {
        String query = parameters != null ? parameters.get("q") : null;
        Instant from = parseInstant(parameters != null ? parameters.get("from_date") : null);
        Instant to = parseInstant(parameters != null ? parameters.get("to_date") : null);
        Integer page = parameters != null && parameters.containsKey("page") ? 
                       Integer.parseInt(parameters.get("page")) : null;
        String cacheKey = CacheKeyUtil.newsKey(query, from, to, page);
        
        try {
            return cacheService.getOrFetch(cacheKey, () -> {
                NewsDataResponse newsData = fetchNews(endpoint, parameters, userId);
                
                int articleCount = newsData != null && newsData.getResults() != null ? 
                    newsData.getResults().size() : 0;
                
                usageService.increment(UsageService.NEWS_API_CALLS, userId, 1, endpoint);
                usageService.increment(UsageService.NEWS_API_ARTICLES, userId, articleCount, endpoint);
                
                log.info("Fetched and cached {} news: {} articles", endpoint, articleCount);
                return newsData;
            }, cacheConfig.getNewsTtl());
        } catch (Exception e) {
            log.error("Error fetching news from {}: {}", endpoint, e.getMessage(), e);
            return null;
        }
    }
    
    private NewsDataResponse fetchNews(String endpoint, Map<String, String> parameters, UUID userId) {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder
                    .fromUriString(properties.getBaseUrl() + "/" + endpoint)
                    .queryParam("apikey", properties.getApiKey());
            
            if (parameters != null) {
                parameters.forEach(builder::queryParam);
            }
            
            String response = restTemplate.getForObject(builder.toUriString(), String.class);
            return objectMapper.readValue(response, NewsDataResponse.class);
            
        } catch (Exception e) {
            log.error("Error fetching news from {}: {}", endpoint, e.getMessage(), e);
            return null;
        }
    }
    
    private Instant parseInstant(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) {
            return null;
        }
        try {
            return Instant.parse(dateStr);
        } catch (Exception e) {
            log.debug("Failed to parse date: {}", dateStr);
            return null;
        }
    }
}

