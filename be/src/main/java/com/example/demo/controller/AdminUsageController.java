package com.example.demo.controller;

import com.example.demo.entity.UsageMetric;
import com.example.demo.service.UsageService;
import com.example.demo.util.AuditLoggingHelper;
import com.example.demo.util.ControllerHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/admin/usage")
@RequiredArgsConstructor
@Tag(name = "Admin Usage", description = "Admin-only endpoints for querying usage metrics")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUsageController {

    private final UsageService usageService;
    private final AuditLoggingHelper auditLoggingHelper;
    private final ControllerHelper controllerHelper;
    private final ObjectMapper objectMapper;

    @Operation(
        summary = "Get usage metrics",
        description = "Query usage metrics by metric key and optional time range. Admin only.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Usage metrics retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Admin access required"),
            @ApiResponse(responseCode = "400", description = "Invalid parameters")
        }
    )
    @GetMapping
    public ResponseEntity<?> getUsage(
            @Parameter(description = "Metric key (e.g., news.api.calls)", required = true)
            @RequestParam String metric,
            @Parameter(description = "Start time (ISO-8601 format, optional)")
            @RequestParam(required = false) String since) {
        
        UUID userId = controllerHelper.getCurrentUserId();
        Map<String, String> params = new HashMap<>();
        params.put("metric", metric);
        if (since != null) {
            params.put("since", since);
        }
        var ctx = auditLoggingHelper.start("/api/admin/usage", userId, objectMapper.valueToTree(params));
        
        try {
            if (!isAdmin()) {
                return auditLoggingHelper.error(ctx, "Admin access required", 
                    HttpStatus.FORBIDDEN, "admin");
            }
            
            Instant sinceInstant = parseInstant(since);
            Long totalUsage = usageService.getTotalUsage(metric, sinceInstant);
            Long callCount = usageService.getCallCount(metric, sinceInstant);
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("requestId", ctx.requestId().toString());
            responseMap.put("metricKey", metric);
            responseMap.put("totalUsage", totalUsage);
            responseMap.put("callCount", callCount);
            responseMap.put("since", sinceInstant != null ? sinceInstant.toString() : "all");
            if (callCount > 0) {
                responseMap.put("averagePerCall", (double) totalUsage / callCount);
            }
            
            return auditLoggingHelper.ok(ctx, responseMap, "admin", false, 
                objectMapper.createObjectNode().put("metricKey", metric));
            
        } catch (DateTimeParseException e) {
            log.warn("Invalid date format: {}", since);
            return auditLoggingHelper.error(ctx, "Invalid date format. Use ISO-8601 format", 
                HttpStatus.BAD_REQUEST, "admin");
        } catch (Exception e) {
            log.error("Error getting usage metrics: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to get usage metrics: " + e.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR, "admin");
        }
    }

    @Operation(
        summary = "Get daily stats",
        description = "Get 24-hour usage statistics for a metric. Admin only.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Daily stats retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Admin access required")
        }
    )
    @GetMapping("/daily")
    public ResponseEntity<?> getDailyStats(
            @Parameter(description = "Metric key", required = true)
            @RequestParam String metric) {
        
        UUID userId = controllerHelper.getCurrentUserId();
        Map<String, String> params = new HashMap<>();
        params.put("metric", metric);
        var ctx = auditLoggingHelper.start("/api/admin/usage/daily", userId, objectMapper.valueToTree(params));
        
        try {
            if (!isAdmin()) {
                return auditLoggingHelper.error(ctx, "Admin access required", 
                    HttpStatus.FORBIDDEN, "admin");
            }
            
            Map<String, Object> stats = usageService.getDailyStats(metric);
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("requestId", ctx.requestId().toString());
            responseMap.putAll(stats);
            
            return auditLoggingHelper.ok(ctx, responseMap, "admin", false, 
                objectMapper.createObjectNode().put("metricKey", metric));
            
        } catch (Exception e) {
            log.error("Error getting daily stats: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to get daily stats: " + e.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR, "admin");
        }
    }

    @Operation(
        summary = "Get top users",
        description = "Get top users by usage for a metric. Admin only.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Top users retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Admin access required")
        }
    )
    @GetMapping("/top-users")
    public ResponseEntity<?> getTopUsers(
            @Parameter(description = "Metric key", required = true)
            @RequestParam String metric,
            @Parameter(description = "Limit (default: 10)")
            @RequestParam(defaultValue = "10") int limit,
            @Parameter(description = "Start time (ISO-8601 format, optional)")
            @RequestParam(required = false) String since) {
        
        UUID userId = controllerHelper.getCurrentUserId();
        Map<String, String> params = new HashMap<>();
        params.put("metric", metric);
        params.put("limit", String.valueOf(limit));
        if (since != null) {
            params.put("since", since);
        }
        var ctx = auditLoggingHelper.start("/api/admin/usage/top-users", userId, objectMapper.valueToTree(params));
        
        try {
            if (!isAdmin()) {
                return auditLoggingHelper.error(ctx, "Admin access required", 
                    HttpStatus.FORBIDDEN, "admin");
            }
            
            Instant sinceInstant = parseInstant(since);
            List<Object[]> topUsers = usageService.getTopUsers(metric, sinceInstant);
            
            List<Map<String, Object>> topUsersList = topUsers.stream()
                .limit(limit)
                .map(row -> {
                    Map<String, Object> userStat = new HashMap<>();
                    userStat.put("userId", row[0]);
                    userStat.put("totalUsage", row[1]);
                    return userStat;
                })
                .toList();
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("requestId", ctx.requestId().toString());
            responseMap.put("metricKey", metric);
            responseMap.put("topUsers", topUsersList);
            responseMap.put("count", topUsersList.size());
            
            return auditLoggingHelper.ok(ctx, responseMap, "admin", false, 
                objectMapper.createObjectNode().put("metricKey", metric).put("limit", limit));
            
        } catch (DateTimeParseException e) {
            log.warn("Invalid date format: {}", since);
            return auditLoggingHelper.error(ctx, "Invalid date format. Use ISO-8601 format", 
                HttpStatus.BAD_REQUEST, "admin");
        } catch (Exception e) {
            log.error("Error getting top users: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to get top users: " + e.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR, "admin");
        }
    }

    @Operation(
        summary = "Get metric history",
        description = "Get usage metric history for a metric key. Admin only.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Metric history retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Admin access required")
        }
    )
    @GetMapping("/history")
    public ResponseEntity<?> getMetricHistory(
            @Parameter(description = "Metric key", required = true)
            @RequestParam String metric,
            @Parameter(description = "Limit (default: 100)")
            @RequestParam(defaultValue = "100") int limit) {
        
        UUID userId = controllerHelper.getCurrentUserId();
        Map<String, String> params = new HashMap<>();
        params.put("metric", metric);
        params.put("limit", String.valueOf(limit));
        var ctx = auditLoggingHelper.start("/api/admin/usage/history", userId, objectMapper.valueToTree(params));
        
        try {
            if (!isAdmin()) {
                return auditLoggingHelper.error(ctx, "Admin access required", 
                    HttpStatus.FORBIDDEN, "admin");
            }
            
            List<UsageMetric> history = usageService.getMetricHistory(metric);
            List<UsageMetric> limitedHistory = history.stream()
                .limit(limit)
                .toList();
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("requestId", ctx.requestId().toString());
            responseMap.put("metricKey", metric);
            responseMap.put("history", limitedHistory);
            responseMap.put("count", limitedHistory.size());
            responseMap.put("totalCount", history.size());
            
            return auditLoggingHelper.ok(ctx, responseMap, "admin", false, 
                objectMapper.createObjectNode().put("metricKey", metric).put("limit", limit));
            
        } catch (Exception e) {
            log.error("Error getting metric history: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to get metric history: " + e.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR, "admin");
        }
    }

    private boolean isAdmin() {
        try {
            var user = controllerHelper.getCurrentUser();
            return user != null && "ADMIN".equalsIgnoreCase(user.getRole());
        } catch (Exception e) {
            log.debug("Error checking admin role", e);
            return false;
        }
    }

    private Instant parseInstant(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) {
            return Instant.now().minusSeconds(86400 * 30);
        }
        try {
            return Instant.parse(dateStr);
        } catch (DateTimeParseException e) {
            throw e;
        }
    }
}
