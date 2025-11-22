package com.example.demo.controller.news;

import com.example.demo.client.newsdata.model.NewsDataResponse;
import com.example.demo.client.newsdata.service.NewsDataRestClient;
import com.example.demo.service.AuditService;
import com.example.demo.service.FeatureFlagService;
import com.example.demo.util.ControllerHelper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    private final NewsDataRestClient newsDataRestClient;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final FeatureFlagService featureFlagService;
    private final ControllerHelper controllerHelper;

    private UUID getCurrentUserId() {
        return controllerHelper.getCurrentUserId();
    }

    @GetMapping("/crypto")
    public ResponseEntity<?> getCryptoNews(@RequestParam Map<String, String> parameters) {
        UUID requestId = UUID.randomUUID();
        long startTime = System.currentTimeMillis();
        
        try {
            // Check if user has access to crypto news (premium feature)
            UUID userId = getCurrentUserId();
            if (userId != null && !featureFlagService.isFeatureEnabled(userId, FeatureFlagService.REAL_TIME_ALERTS)) {
                return ResponseEntity.status(403)
                        .body(Map.of(
                                "success", false,
                                "error", "Crypto news access requires premium subscription",
                                "requestId", requestId.toString()
                        ));
            }
            JsonNode params = objectMapper.valueToTree(parameters);
            auditService.logRequest(requestId, getCurrentUserId(), "/api/v1/news/crypto", params);
            
            NewsDataResponse newsData = newsDataRestClient.getCryptoNews(parameters);
            
            if (newsData == null) {
                long latencyMs = System.currentTimeMillis() - startTime;
                auditService.finishRequest(requestId, false, "newsdata", 
                    objectMapper.createObjectNode().put("error", "Failed to fetch news"), latencyMs);
                return ResponseEntity.internalServerError()
                        .body(Map.of("success", false, "requestId", requestId.toString(), "error", "Failed to fetch news"));
            }
            
            long latencyMs = System.currentTimeMillis() - startTime;
            JsonNode providerMeta = objectMapper.createObjectNode()
                    .put("status", newsData.getStatus())
                    .put("totalResults", newsData.getTotalResults());
            auditService.finishRequest(requestId, false, "newsdata", providerMeta, latencyMs);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("requestId", requestId.toString());
            response.put("status", newsData.getStatus());
            response.put("totalResults", newsData.getTotalResults());
            response.put("data", newsData.getResults());
            response.put("nextPage", newsData.getNextPage());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting crypto news: {}", e.getMessage(), e);
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, false, "newsdata", 
                objectMapper.createObjectNode().put("error", e.getMessage()), latencyMs);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "requestId", requestId.toString(), "error", e.getMessage()));
        }
    }

    @GetMapping("/{endpoint}")
    public ResponseEntity<?> getNews(
            @PathVariable String endpoint,
            @RequestParam Map<String, String> parameters) {
        UUID requestId = UUID.randomUUID();
        long startTime = System.currentTimeMillis();
        
        try {
            JsonNode params = objectMapper.valueToTree(parameters);
            auditService.logRequest(requestId, getCurrentUserId(), "/api/v1/news/" + endpoint, params);
            
            NewsDataResponse newsData = newsDataRestClient.getNews(endpoint, parameters);
            
            if (newsData == null) {
                long latencyMs = System.currentTimeMillis() - startTime;
                auditService.finishRequest(requestId, false, "newsdata", 
                    objectMapper.createObjectNode().put("error", "Failed to fetch news"), latencyMs);
                return ResponseEntity.internalServerError()
                        .body(Map.of("success", false, "requestId", requestId.toString(), "error", "Failed to fetch news"));
            }
            
            long latencyMs = System.currentTimeMillis() - startTime;
            JsonNode providerMeta = objectMapper.createObjectNode()
                    .put("endpoint", endpoint)
                    .put("status", newsData.getStatus())
                    .put("totalResults", newsData.getTotalResults());
            auditService.finishRequest(requestId, false, "newsdata", providerMeta, latencyMs);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("requestId", requestId.toString());
            response.put("status", newsData.getStatus());
            response.put("totalResults", newsData.getTotalResults());
            response.put("data", newsData.getResults());
            response.put("nextPage", newsData.getNextPage());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting news from {}: {}", endpoint, e.getMessage(), e);
            long latencyMs = System.currentTimeMillis() - startTime;
            auditService.finishRequest(requestId, false, "newsdata", 
                objectMapper.createObjectNode().put("error", e.getMessage()), latencyMs);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "requestId", requestId.toString(), "error", e.getMessage()));
        }
    }
}

