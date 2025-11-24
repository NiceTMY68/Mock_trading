package com.example.demo.controller;

import com.example.demo.service.CacheService;
import com.example.demo.util.AuditLoggingHelper;
import com.example.demo.util.ControllerHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Admin-only endpoints for cache management (invalidation, warming, etc.)
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/cache")
@RequiredArgsConstructor
@Tag(name = "Admin Cache", description = "Admin-only endpoints for cache management")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCacheController {

    private final CacheService cacheService;
    private final AuditLoggingHelper auditLoggingHelper;
    private final ControllerHelper controllerHelper;
    private final ObjectMapper objectMapper;

    @Operation(
        summary = "Invalidate cache by key or pattern",
        description = "Invalidate cache entries by exact key or pattern (supports wildcards). Admin only.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Cache invalidated successfully"),
            @ApiResponse(responseCode = "403", description = "Admin access required"),
            @ApiResponse(responseCode = "400", description = "Invalid parameters")
        }
    )
    @PostMapping("/invalidate")
    public ResponseEntity<?> invalidateCache(
            @RequestBody CacheInvalidationRequest request) {
        var ctx = auditLoggingHelper.start("/api/admin/cache/invalidate", 
                controllerHelper.getCurrentUserId(), 
                objectMapper.valueToTree(request));

        try {
            if (request.getKey() != null && !request.getKey().isEmpty()) {
                // Invalidate by exact key
                cacheService.evict(request.getKey());
                log.info("Cache invalidated by key: {} (admin: {})", 
                        request.getKey(), controllerHelper.getCurrentUserId());

                Map<String, Object> response = new HashMap<>();
                response.put("message", "Cache invalidated successfully");
                response.put("key", request.getKey());
                response.put("type", "exact");

                return auditLoggingHelper.ok(ctx, response, "admin", false,
                        objectMapper.createObjectNode()
                                .put("key", request.getKey())
                                .put("type", "exact"));

            } else if (request.getPattern() != null && !request.getPattern().isEmpty()) {
                // Invalidate by pattern (supports wildcards)
                cacheService.evictPattern(request.getPattern());
                log.info("Cache invalidated by pattern: {} (admin: {})", 
                        request.getPattern(), controllerHelper.getCurrentUserId());

                Map<String, Object> response = new HashMap<>();
                response.put("message", "Cache invalidated successfully");
                response.put("pattern", request.getPattern());
                response.put("type", "pattern");

                return auditLoggingHelper.ok(ctx, response, "admin", false,
                        objectMapper.createObjectNode()
                                .put("pattern", request.getPattern())
                                .put("type", "pattern"));

            } else {
                return auditLoggingHelper.error(ctx, 
                        "Either 'key' or 'pattern' must be provided", 
                        HttpStatus.BAD_REQUEST, "admin");
            }

        } catch (Exception e) {
            log.error("Error invalidating cache: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, 
                    "Failed to invalidate cache: " + e.getMessage(), 
                    HttpStatus.INTERNAL_SERVER_ERROR, "admin");
        }
    }

    @Operation(
        summary = "Check if cache key exists",
        description = "Check if a cache key exists and return its TTL. Admin only.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Cache key status retrieved"),
            @ApiResponse(responseCode = "403", description = "Admin access required")
        }
    )
    @GetMapping("/exists/{key}")
    public ResponseEntity<?> checkCacheKey(@PathVariable String key) {
        var ctx = auditLoggingHelper.start("/api/admin/cache/exists/" + key, 
                controllerHelper.getCurrentUserId(), 
                objectMapper.createObjectNode().put("key", key));

        try {
            boolean exists = cacheService.exists(key);
            long ttl = cacheService.getTtl(key);

            Map<String, Object> response = new HashMap<>();
            response.put("key", key);
            response.put("exists", exists);
            response.put("ttl", ttl >= 0 ? ttl : null);
            response.put("ttlSeconds", ttl >= 0 ? ttl : -1);

            return auditLoggingHelper.ok(ctx, response, "admin", false,
                    objectMapper.createObjectNode()
                            .put("key", key)
                            .put("exists", exists)
                            .put("ttl", ttl));

        } catch (Exception e) {
            log.error("Error checking cache key: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, 
                    "Failed to check cache key: " + e.getMessage(), 
                    HttpStatus.INTERNAL_SERVER_ERROR, "admin");
        }
    }

    @Operation(
        summary = "Clear all cache",
        description = "Clear all cache entries. Use with caution! Admin only.",
        responses = {
            @ApiResponse(responseCode = "200", description = "All cache cleared"),
            @ApiResponse(responseCode = "403", description = "Admin access required")
        }
    )
    @PostMapping("/clear-all")
    public ResponseEntity<?> clearAllCache() {
        var ctx = auditLoggingHelper.start("/api/admin/cache/clear-all", 
                controllerHelper.getCurrentUserId(), 
                objectMapper.createObjectNode());

        try {
            cacheService.clearAll();
            log.warn("All cache cleared by admin: {}", controllerHelper.getCurrentUserId());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "All cache cleared successfully");

            return auditLoggingHelper.ok(ctx, response, "admin", false,
                    objectMapper.createObjectNode().put("action", "clear_all"));

        } catch (Exception e) {
            log.error("Error clearing all cache: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, 
                    "Failed to clear cache: " + e.getMessage(), 
                    HttpStatus.INTERNAL_SERVER_ERROR, "admin");
        }
    }

    /**
     * Request DTO for cache invalidation
     */
    @Data
    public static class CacheInvalidationRequest {
        @Parameter(description = "Exact cache key to invalidate", example = "binance:klines:BTCUSDT:1m:null:null:100")
        private String key;

        @Parameter(description = "Cache key pattern with wildcards (e.g., 'binance:klines:BTCUSDT:*')", example = "binance:klines:BTCUSDT:*")
        private String pattern;
    }
}

