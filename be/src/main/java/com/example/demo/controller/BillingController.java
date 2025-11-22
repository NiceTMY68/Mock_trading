package com.example.demo.controller;

import com.example.demo.dto.CheckoutRequestDto;
import com.example.demo.service.BillingService;
import com.example.demo.service.FeatureFlagService;
import com.example.demo.util.AuditLoggingHelper;
import com.example.demo.util.ControllerHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {
    
    private final BillingService billingService;
    private final FeatureFlagService featureFlagService;
    private final AuditLoggingHelper auditLoggingHelper;
    private final ControllerHelper controllerHelper;
    private final ObjectMapper objectMapper;
    
    @PostMapping("/create-checkout")
    public ResponseEntity<?> createCheckoutSession(
            @RequestBody CheckoutRequestDto request,
            Authentication authentication) {
        UUID userId = controllerHelper.getCurrentUserId();
        var ctx = auditLoggingHelper.start("/api/billing/create-checkout", userId, 
            objectMapper.valueToTree(request));
        
        try {
            if (userId == null) {
                return auditLoggingHelper.error(ctx, "User not found", HttpStatus.BAD_REQUEST, "billing");
            }
            
            if (!isValidPlan(request.getPlanId())) {
                return auditLoggingHelper.error(ctx, "Invalid plan ID", HttpStatus.BAD_REQUEST, "billing");
            }
            
            String checkoutUrl = billingService.createCheckoutSession(
                    userId,
                    request.getPlanId(),
                    request.getSuccessUrl(),
                    request.getCancelUrl()
            );
            
            log.info("Created checkout session for user {} with plan {}", userId, request.getPlanId());
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("requestId", ctx.requestId().toString());
            responseMap.put("success", true);
            responseMap.put("checkoutUrl", checkoutUrl);
            
            return auditLoggingHelper.ok(ctx, responseMap, "billing", false, 
                objectMapper.createObjectNode().put("planId", request.getPlanId()));
            
        } catch (Exception e) {
            log.error("Error creating checkout session: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to create checkout session: " + e.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR, "billing");
        }
    }
    
    @GetMapping("/plans")
    public ResponseEntity<?> getAvailablePlans() {
        return ResponseEntity.ok(Map.of(
                "plans", List.of(
                        Map.of(
                                "id", "pro",
                                "name", "Pro Plan",
                                "price", "$29.99/month",
                                "features", List.of(
                                        "Advanced charts",
                                        "Real-time streaming",
                                        "Backtesting",
                                        "AI analysis",
                                        "Higher rate limits"
                                )
                        ),
                        Map.of(
                                "id", "premium",
                                "name", "Premium Plan", 
                                "price", "$99.99/month",
                                "features", List.of(
                                        "All Pro features",
                                        "Portfolio analytics",
                                        "Real-time alerts",
                                        "Historical data",
                                        "Priority support"
                                )
                        )
                )
        ));
    }
    
    @GetMapping("/subscription")
    public ResponseEntity<?> getCurrentSubscription(Authentication authentication) {
        UUID userId = controllerHelper.getCurrentUserId();
        var ctx = auditLoggingHelper.start("/api/billing/subscription", userId, objectMapper.createObjectNode());
        
        try {
            if (userId == null) {
                return auditLoggingHelper.error(ctx, "User not found", HttpStatus.BAD_REQUEST, "billing");
            }
            
            String plan = featureFlagService.getUserPlan(userId);
            boolean hasActiveSubscription = featureFlagService.hasActiveSubscription(userId);
            boolean hasPremiumSubscription = featureFlagService.hasPremiumSubscription(userId);
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("requestId", ctx.requestId().toString());
            responseMap.put("plan", plan);
            responseMap.put("hasActiveSubscription", hasActiveSubscription);
            responseMap.put("hasPremiumSubscription", hasPremiumSubscription);
            responseMap.put("features", Map.of(
                    "streaming", featureFlagService.isStreamingEnabled(userId),
                    "backtesting", featureFlagService.isBacktestingEnabled(userId),
                    "aiAnalysis", featureFlagService.isAiAnalysisEnabled(userId),
                    "advancedCharts", featureFlagService.isAdvancedChartsEnabled(userId),
                    "historicalData", featureFlagService.isHistoricalDataEnabled(userId),
                    "realTimeAlerts", featureFlagService.isRealTimeAlertsEnabled(userId),
                    "portfolioAnalytics", featureFlagService.isPortfolioAnalyticsEnabled(userId)
            ));
            
            return auditLoggingHelper.ok(ctx, responseMap, "billing", false, objectMapper.createObjectNode());
            
        } catch (Exception e) {
            log.error("Error getting subscription info: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to get subscription info: " + e.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR, "billing");
        }
    }
    
    private boolean isValidPlan(String planId) {
        return "pro".equalsIgnoreCase(planId) || "premium".equalsIgnoreCase(planId);
    }
}
