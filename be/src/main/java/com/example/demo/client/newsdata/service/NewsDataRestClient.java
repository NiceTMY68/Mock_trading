package com.example.demo.client.newsdata.service;

import com.example.demo.client.newsdata.config.NewsDataProperties;
import com.example.demo.client.newsdata.model.NewsDataResponse;
import com.example.demo.config.CacheConfig;
import com.example.demo.service.CacheService;
import com.example.demo.util.CacheKeyUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewsDataRestClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final CacheService cacheService;
    private final NewsDataProperties properties;

    public NewsDataResponse getCryptoNews(Map<String, String> parameters) {
        Instant from = parseInstant(parameters.get("from_date"));
        Instant to = parseInstant(parameters.get("to_date"));
        Integer page = parameters.containsKey("page") ? Integer.parseInt(parameters.get("page")) : null;
        
        String cacheKey = CacheKeyUtil.cryptoNewsKey(from, to, page);
        
        return cacheService.get(cacheKey, NewsDataResponse.class)
                .orElseGet(() -> {
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
                        
                        cacheService.put(cacheKey, newsData, CacheConfig.NEWS_TTL);
                        log.info("Fetched and cached crypto news: {} articles", 
                                 newsData != null && newsData.getResults() != null ? newsData.getResults().size() : 0);
                        
                        return newsData;
                        
                    } catch (Exception e) {
                        log.error("Error fetching crypto news: {}", e.getMessage(), e);
                        return null;
                    }
                });
    }

    public NewsDataResponse getNews(String endpoint, Map<String, String> parameters) {
        String query = parameters != null ? parameters.get("q") : null;
        Instant from = parseInstant(parameters != null ? parameters.get("from_date") : null);
        Instant to = parseInstant(parameters != null ? parameters.get("to_date") : null);
        Integer page = parameters != null && parameters.containsKey("page") ? 
                       Integer.parseInt(parameters.get("page")) : null;
        
        String cacheKey = CacheKeyUtil.newsKey(query, from, to, page);
        
        return cacheService.get(cacheKey, NewsDataResponse.class)
                .orElseGet(() -> {
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
                        
                        cacheService.put(cacheKey, newsData, CacheConfig.NEWS_TTL);
                        log.info("Fetched and cached news from {}: {} articles", endpoint,
                                 newsData != null && newsData.getResults() != null ? newsData.getResults().size() : 0);
                        
                        return newsData;
                        
                    } catch (Exception e) {
                        log.error("Error fetching news from {}: {}", endpoint, e.getMessage(), e);
                        return null;
                    }
                });
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

