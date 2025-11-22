package com.example.demo.controller;

import com.example.demo.dto.CheckoutRequestDto;
import com.example.demo.dto.CheckoutResponseDto;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.BillingService;
import com.example.demo.service.FeatureFlagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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
    private final UserRepository userRepository;
    
    @PostMapping("/create-checkout")
    public ResponseEntity<CheckoutResponseDto> createCheckoutSession(
            @RequestBody CheckoutRequestDto request,
            Authentication authentication) {
        
        try {
            String userEmail = authentication.getName();
            UUID userId = getUserIdFromEmail(userEmail);
            
            if (userId == null) {
                return ResponseEntity.badRequest()
                        .body(CheckoutResponseDto.builder()
                                .success(false)
                                .error("User not found")
                                .build());
            }
            
            if (!isValidPlan(request.getPlanId())) {
                return ResponseEntity.badRequest()
                        .body(CheckoutResponseDto.builder()
                                .success(false)
                                .error("Invalid plan ID")
                                .build());
            }
            
            String checkoutUrl = billingService.createCheckoutSession(
                    userId,
                    request.getPlanId(),
                    request.getSuccessUrl(),
                    request.getCancelUrl()
            );
            
            log.info("Created checkout session for user {} with plan {}", userId, request.getPlanId());
            
            return ResponseEntity.ok(CheckoutResponseDto.builder()
                    .success(true)
                    .checkoutUrl(checkoutUrl)
                    .build());
            
        } catch (Exception e) {
            log.error("Error creating checkout session: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(CheckoutResponseDto.builder()
                            .success(false)
                            .error("Failed to create checkout session")
                            .build());
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
        try {
            String userEmail = authentication.getName();
            UUID userId = getUserIdFromEmail(userEmail);
            
            if (userId == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "User not found"));
            }
            
            String plan = featureFlagService.getUserPlan(userId);
            boolean hasActiveSubscription = featureFlagService.hasActiveSubscription(userId);
            boolean hasPremiumSubscription = featureFlagService.hasPremiumSubscription(userId);
            
            return ResponseEntity.ok(Map.of(
                    "plan", plan,
                    "hasActiveSubscription", hasActiveSubscription,
                    "hasPremiumSubscription", hasPremiumSubscription,
                    "features", Map.of(
                            "streaming", featureFlagService.isStreamingEnabled(userId),
                            "backtesting", featureFlagService.isBacktestingEnabled(userId),
                            "aiAnalysis", featureFlagService.isAiAnalysisEnabled(userId),
                            "advancedCharts", featureFlagService.isAdvancedChartsEnabled(userId),
                            "historicalData", featureFlagService.isHistoricalDataEnabled(userId),
                            "realTimeAlerts", featureFlagService.isRealTimeAlertsEnabled(userId),
                            "portfolioAnalytics", featureFlagService.isPortfolioAnalyticsEnabled(userId)
                    )
            ));
            
        } catch (Exception e) {
            log.error("Error getting subscription info: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to get subscription info"));
        }
    }
    
    private UUID getUserIdFromEmail(String email) {
        return userRepository.findByEmail(email)
                .map(User::getId)
                .orElse(null);
    }
    
    private boolean isValidPlan(String planId) {
        return "pro".equalsIgnoreCase(planId) || "premium".equalsIgnoreCase(planId);
    }
}
