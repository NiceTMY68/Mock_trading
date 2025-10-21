package com.example.demo.controller.news;

import com.example.demo.client.newsdata.model.NewsDataResponse;
import com.example.demo.client.newsdata.service.NewsDataRestClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
public class NewsDataController {

    private final NewsDataRestClient newsDataRestClient;

    @GetMapping("/crypto")
    public ResponseEntity<?> getCryptoNews(@RequestParam Map<String, String> parameters) {
        try {
            NewsDataResponse newsData = newsDataRestClient.getCryptoNews(parameters);
            
            if (newsData == null) {
                return ResponseEntity.internalServerError()
                        .body(Map.of("success", false, "error", "Failed to fetch news"));
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("status", newsData.getStatus());
            response.put("totalResults", newsData.getTotalResults());
            response.put("data", newsData.getResults());
            response.put("nextPage", newsData.getNextPage());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting crypto news: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/{endpoint}")
    public ResponseEntity<?> getNews(
            @PathVariable String endpoint,
            @RequestParam Map<String, String> parameters) {
        try {
            NewsDataResponse newsData = newsDataRestClient.getNews(endpoint, parameters);
            
            if (newsData == null) {
                return ResponseEntity.internalServerError()
                        .body(Map.of("success", false, "error", "Failed to fetch news"));
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("status", newsData.getStatus());
            response.put("totalResults", newsData.getTotalResults());
            response.put("data", newsData.getResults());
            response.put("nextPage", newsData.getNextPage());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting news from {}: {}", endpoint, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }
}

