package com.example.demo.controller.news;

import com.example.demo.client.newsdata.service.NewsProxyService;
import com.example.demo.dto.NewsQueryParams;
import com.example.demo.dto.NewsResponseDto;
import com.example.demo.service.FeatureFlagService;
import com.example.demo.util.AuditLoggingHelper;
import com.example.demo.util.ControllerHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
public class NewsDataController {

    private final NewsProxyService newsProxyService;
    private final ObjectMapper objectMapper;
    private final FeatureFlagService featureFlagService;
    private final ControllerHelper controllerHelper;
    private final AuditLoggingHelper auditLoggingHelper;

    private UUID getCurrentUserId() {
        return controllerHelper.getCurrentUserId();
    }

    @GetMapping("/crypto")
    public ResponseEntity<?> getCryptoNews(@RequestParam Map<String, String> parameters) {
        UUID requestId = UUID.randomUUID();
        UUID userId = getCurrentUserId();
        
        var ctx = auditLoggingHelper.start("/api/v1/news/crypto", userId, objectMapper.valueToTree(parameters));
        
        try {
            if (userId != null && !featureFlagService.isFeatureEnabled(userId, FeatureFlagService.REAL_TIME_ALERTS)) {
                return auditLoggingHelper.error(ctx, "Crypto news access requires premium subscription", 
                    HttpStatus.FORBIDDEN, "newsdata");
            }
            
            NewsQueryParams queryParams = NewsQueryParams.builder()
                    .fromDate(parseInstant(parameters.get("from_date")))
                    .toDate(parseInstant(parameters.get("to_date")))
                    .page(parameters.containsKey("page") ? Integer.parseInt(parameters.get("page")) : null)
                    .build();
            
            NewsResponseDto response = newsProxyService.getCryptoNews(requestId, userId, queryParams);
            
            if (response.getData() == null) {
                return auditLoggingHelper.error(ctx, "Failed to fetch news", 
                    HttpStatus.INTERNAL_SERVER_ERROR, "newsdata");
            }
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("success", true);
            responseMap.put("requestId", response.getRequestId().toString());
            responseMap.put("provider", response.getProvider());
            responseMap.put("cached", response.isCached());
            responseMap.put("status", response.getData().getStatus());
            responseMap.put("totalResults", response.getData().getTotalResults());
            responseMap.put("data", response.getData().getResults());
            responseMap.put("nextPage", response.getData().getNextPage());
            
            return ResponseEntity.ok(responseMap);
            
        } catch (Exception e) {
            log.error("Error getting crypto news: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, e.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR, "newsdata");
        }
    }

    @GetMapping("/{endpoint}")
    public ResponseEntity<?> getNews(
            @PathVariable String endpoint,
            @RequestParam Map<String, String> parameters) {
        UUID requestId = UUID.randomUUID();
        UUID userId = getCurrentUserId();
        
        var ctx = auditLoggingHelper.start("/api/v1/news/" + endpoint, userId, objectMapper.valueToTree(parameters));
        
        try {
            if (userId != null && !featureFlagService.isFeatureEnabled(userId, FeatureFlagService.REAL_TIME_ALERTS)) {
                return auditLoggingHelper.error(ctx, "News access requires premium subscription", 
                    HttpStatus.FORBIDDEN, "newsdata");
            }
            
            NewsQueryParams queryParams = NewsQueryParams.builder()
                    .endpoint(endpoint)
                    .query(parameters.get("q"))
                    .fromDate(parseInstant(parameters.get("from_date")))
                    .toDate(parseInstant(parameters.get("to_date")))
                    .page(parameters.containsKey("page") ? Integer.parseInt(parameters.get("page")) : null)
                    .build();
            
            NewsResponseDto response = newsProxyService.getCryptoNews(requestId, userId, queryParams);
            
            if (response.getData() == null) {
                return auditLoggingHelper.error(ctx, "Failed to fetch news", 
                    HttpStatus.INTERNAL_SERVER_ERROR, "newsdata");
            }
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("success", true);
            responseMap.put("requestId", response.getRequestId().toString());
            responseMap.put("provider", response.getProvider());
            responseMap.put("cached", response.isCached());
            responseMap.put("status", response.getData().getStatus());
            responseMap.put("totalResults", response.getData().getTotalResults());
            responseMap.put("data", response.getData().getResults());
            responseMap.put("nextPage", response.getData().getNextPage());
            
            return ResponseEntity.ok(responseMap);
            
        } catch (Exception e) {
            log.error("Error getting news from {}: {}", endpoint, e.getMessage(), e);
            return auditLoggingHelper.error(ctx, e.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR, "newsdata");
        }
    }
    
    private java.time.Instant parseInstant(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) {
            return null;
        }
        try {
            return java.time.Instant.parse(dateStr);
        } catch (Exception e) {
            log.debug("Failed to parse date: {}", dateStr);
            return null;
        }
    }
}
