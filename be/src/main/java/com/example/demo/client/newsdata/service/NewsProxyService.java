package com.example.demo.client.newsdata.service;

import com.example.demo.client.newsdata.model.NewsDataResponse;
import com.example.demo.config.CacheConfig;
import com.example.demo.dto.NewsQueryParams;
import com.example.demo.dto.NewsResponseDto;
import com.example.demo.service.AuditService;
import com.example.demo.service.CacheService;
import com.example.demo.service.UsageService;
import com.example.demo.util.CacheKeyUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewsProxyService {
    
    private final NewsDataRestClient newsDataRestClient;
    private final CacheService cacheService;
    private final AuditService auditService;
    private final CacheConfig cacheConfig;
    private final ObjectMapper objectMapper;
    private final UsageService usageService;
    
    public NewsResponseDto getCryptoNews(UUID requestId, UUID userId, NewsQueryParams params) {
        long startTime = System.currentTimeMillis();
        boolean cached = false;
        JsonNode providerMeta = JsonNodeFactory.instance.objectNode();
        
        try {
            JsonNode normalizedParams = objectMapper.valueToTree(params);
            auditService.start(requestId, userId, "/api/v1/news/crypto", normalizedParams);
            
            Map<String, String> parameters = new HashMap<>();
            if (params.getFromDate() != null) {
                parameters.put("from_date", params.getFromDate().toString());
            }
            if (params.getToDate() != null) {
                parameters.put("to_date", params.getToDate().toString());
            }
            if (params.getPage() != null) {
                parameters.put("page", params.getPage().toString());
            }
            
            Instant from = params.getFromDate();
            Instant to = params.getToDate();
            Integer page = params.getPage();
            String cacheKey = CacheKeyUtil.cryptoNewsKey(from, to, page);
            
            cached = cacheService.exists(cacheKey);
            if (cached) {
                log.debug("Cache hit for crypto news: {}", cacheKey);
            }
            
            NewsDataResponse newsData = cacheService.getOrFetch(cacheKey, () -> {
                log.debug("Cache miss, fetching crypto news from NewsData: {}", cacheKey);
                NewsDataResponse response = newsDataRestClient.getCryptoNews(parameters, userId);
                
                if (response != null && response.getResults() != null) {
                    int articleCount = response.getResults().size();
                    JsonNode usageMeta = JsonNodeFactory.instance.objectNode()
                            .put("endpoint", "crypto")
                            .put("articleCount", articleCount);
                    if (userId != null) {
                        usageService.incrementWithMetadata(UsageService.NEWS_API_CALLS, userId, 1L, usageMeta);
                        usageService.incrementWithMetadata(UsageService.NEWS_API_ARTICLES, userId, (long) articleCount, usageMeta);
                    }
                }
                
                return response;
            }, cacheConfig.getNewsTtl(), new com.fasterxml.jackson.core.type.TypeReference<NewsDataResponse>() {});
            
            if (newsData == null) {
                providerMeta = JsonNodeFactory.instance.objectNode()
                        .put("error", "Failed to fetch news");
                long latencyMs = System.currentTimeMillis() - startTime;
                auditService.finish(requestId, "newsdata", cached, providerMeta, latencyMs, 500);
                
                return NewsResponseDto.builder()
                        .requestId(requestId)
                        .provider("newsdata")
                        .cached(cached)
                        .params(params)
                        .data(null)
                        .build();
            }
            
            providerMeta = JsonNodeFactory.instance.objectNode()
                    .put("status", newsData.getStatus())
                    .put("totalResults", newsData.getTotalResults() != null ? newsData.getTotalResults() : 0)
                    .put("articleCount", newsData.getResults() != null ? newsData.getResults().size() : 0);
            
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finish(requestId, "newsdata", cached, providerMeta, latencyMs, 200);
            
            return NewsResponseDto.builder()
                    .requestId(requestId)
                    .provider("newsdata")
                    .cached(cached)
                    .params(params)
                    .data(newsData)
                    .build();
            
        } catch (Exception e) {
            log.error("Error in NewsProxyService.getCryptoNews: {}", e.getMessage(), e);
            JsonNode errorMeta = JsonNodeFactory.instance.objectNode()
                    .put("error", e.getMessage());
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finish(requestId, "newsdata", cached, errorMeta, latencyMs, 500);
            
            return NewsResponseDto.builder()
                    .requestId(requestId)
                    .provider("newsdata")
                    .cached(cached)
                    .params(params)
                    .data(null)
                    .build();
        }
    }
}
