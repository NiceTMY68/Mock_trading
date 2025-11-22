package com.example.demo.service;

import com.example.demo.entity.Subscription;
import com.example.demo.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeatureFlagService {
    
    private final SubscriptionRepository subscriptionRepository;
    
    // Feature keys
    public static final String STREAMING_DATA = "streaming_data";
    public static final String BACKTESTING = "backtesting";
    public static final String AI_ANALYSIS = "ai_analysis";
    public static final String ADVANCED_CHARTS = "advanced_charts";
    public static final String API_RATE_LIMITS = "api_rate_limits";
    public static final String HISTORICAL_DATA = "historical_data";
    public static final String REAL_TIME_ALERTS = "real_time_alerts";
    public static final String PORTFOLIO_ANALYTICS = "portfolio_analytics";
    public static final String TRADING = "trading";
    
    public boolean isFeatureEnabled(UUID userId, String featureKey) {
        if (userId == null) {
            log.debug("Feature {} disabled for anonymous user", featureKey);
            return false;
        }
        
        try {
            // Check for active subscription
            Optional<Subscription> activeSubscription = subscriptionRepository
                    .findActiveSubscriptionByUserId(userId, Instant.now());
            
            if (activeSubscription.isEmpty()) {
                log.debug("Feature {} disabled for user {} - no active subscription", featureKey, userId);
                return false;
            }
            
            Subscription subscription = activeSubscription.get();
            
            // Check if subscription is premium for premium features
            if (isPremiumFeature(featureKey) && !subscription.isPremium()) {
                log.debug("Feature {} disabled for user {} - requires premium subscription", featureKey, userId);
                return false;
            }
            
            log.debug("Feature {} enabled for user {} with plan {}", featureKey, userId, subscription.getPlanId());
            return true;
            
        } catch (Exception e) {
            log.error("Error checking feature {} for user {}: {}", featureKey, userId, e.getMessage());
            return false; // Fail safe - disable feature on error
        }
    }
    
    public boolean hasActiveSubscription(UUID userId) {
        if (userId == null) {
            return false;
        }
        
        return subscriptionRepository.findActiveSubscriptionByUserId(userId, Instant.now()).isPresent();
    }
    
    public boolean hasPremiumSubscription(UUID userId) {
        if (userId == null) {
            return false;
        }
        
        return subscriptionRepository.findPremiumSubscriptionByUserId(userId, Instant.now()).isPresent();
    }
    
    public String getUserPlan(UUID userId) {
        if (userId == null) {
            return "free";
        }
        
        Optional<Subscription> activeSubscription = subscriptionRepository
                .findActiveSubscriptionByUserId(userId, Instant.now());
        
        if (activeSubscription.isPresent()) {
            return activeSubscription.get().getPlanId();
        }
        
        return "free";
    }
    
    public boolean isStreamingEnabled(UUID userId) {
        return isFeatureEnabled(userId, STREAMING_DATA);
    }
    
    public boolean isBacktestingEnabled(UUID userId) {
        return isFeatureEnabled(userId, BACKTESTING);
    }
    
    public boolean isAiAnalysisEnabled(UUID userId) {
        return isFeatureEnabled(userId, AI_ANALYSIS);
    }
    
    public boolean isAdvancedChartsEnabled(UUID userId) {
        return isFeatureEnabled(userId, ADVANCED_CHARTS);
    }
    
    public boolean isHistoricalDataEnabled(UUID userId) {
        return isFeatureEnabled(userId, HISTORICAL_DATA);
    }
    
    public boolean isRealTimeAlertsEnabled(UUID userId) {
        return isFeatureEnabled(userId, REAL_TIME_ALERTS);
    }
    
    public boolean isPortfolioAnalyticsEnabled(UUID userId) {
        return isFeatureEnabled(userId, PORTFOLIO_ANALYTICS);
    }
    
    private boolean isPremiumFeature(String featureKey) {
        return STREAMING_DATA.equals(featureKey) ||
               BACKTESTING.equals(featureKey) ||
               AI_ANALYSIS.equals(featureKey) ||
               ADVANCED_CHARTS.equals(featureKey) ||
               HISTORICAL_DATA.equals(featureKey) ||
               REAL_TIME_ALERTS.equals(featureKey) ||
               PORTFOLIO_ANALYTICS.equals(featureKey) ||
               TRADING.equals(featureKey);
    }
}
