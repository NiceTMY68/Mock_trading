package com.example.demo.service;

import com.example.demo.entity.Subscription;
import com.example.demo.repository.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeatureFlagServiceTest {
    
    @Mock
    private SubscriptionRepository subscriptionRepository;
    
    @InjectMocks
    private FeatureFlagService featureFlagService;
    
    private UUID testUserId;
    private UUID anotherUserId;
    
    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        anotherUserId = UUID.randomUUID();
    }
    
    @Test
    void isFeatureEnabled_ShouldReturnFalse_WhenUserIdIsNull() {
        // When
        boolean result = featureFlagService.isFeatureEnabled(null, FeatureFlagService.STREAMING_DATA);
        
        // Then
        assertThat(result).isFalse();
    }
    
    @Test
    void isFeatureEnabled_ShouldReturnFalse_WhenNoActiveSubscription() {
        // Given
        when(subscriptionRepository.findActiveSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.empty());
        
        // When
        boolean result = featureFlagService.isFeatureEnabled(testUserId, FeatureFlagService.STREAMING_DATA);
        
        // Then
        assertThat(result).isFalse();
    }
    
    @Test
    void isFeatureEnabled_ShouldReturnTrue_WhenActiveFreeSubscription() {
        // Given
        Subscription freeSubscription = Subscription.builder()
                .userId(testUserId)
                .planId("free")
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plusSeconds(3600))
                .createdAt(Instant.now())
                .build();
        
        when(subscriptionRepository.findActiveSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.of(freeSubscription));
        
        // When
        boolean result = featureFlagService.isFeatureEnabled(testUserId, FeatureFlagService.API_RATE_LIMITS);
        
        // Then
        assertThat(result).isTrue();
    }
    
    @Test
    void isFeatureEnabled_ShouldReturnTrue_WhenActivePremiumSubscription() {
        // Given
        Subscription premiumSubscription = Subscription.builder()
                .userId(testUserId)
                .planId("pro")
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plusSeconds(3600))
                .createdAt(Instant.now())
                .build();
        
        when(subscriptionRepository.findActiveSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.of(premiumSubscription));
        
        // When
        boolean result = featureFlagService.isFeatureEnabled(testUserId, FeatureFlagService.STREAMING_DATA);
        
        // Then
        assertThat(result).isTrue();
    }
    
    @Test
    void isFeatureEnabled_ShouldReturnFalse_WhenFreeSubscriptionTriesPremiumFeature() {
        // Given
        Subscription freeSubscription = Subscription.builder()
                .userId(testUserId)
                .planId("free")
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plusSeconds(3600))
                .createdAt(Instant.now())
                .build();
        
        when(subscriptionRepository.findActiveSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.of(freeSubscription));
        
        // When
        boolean result = featureFlagService.isFeatureEnabled(testUserId, FeatureFlagService.STREAMING_DATA);
        
        // Then
        assertThat(result).isFalse();
    }
    
    @Test
    void isFeatureEnabled_ShouldReturnFalse_WhenSubscriptionExpired() {
        // Given
        Subscription expiredSubscription = Subscription.builder()
                .userId(testUserId)
                .planId("pro")
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().minusSeconds(3600)) // Expired
                .createdAt(Instant.now().minusSeconds(7200))
                .build();
        
        when(subscriptionRepository.findActiveSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.of(expiredSubscription));
        
        // When
        boolean result = featureFlagService.isFeatureEnabled(testUserId, FeatureFlagService.STREAMING_DATA);
        
        // Then
        assertThat(result).isFalse();
    }
    
    @Test
    void isFeatureEnabled_ShouldReturnFalse_WhenSubscriptionCanceled() {
        // Given
        Subscription canceledSubscription = Subscription.builder()
                .userId(testUserId)
                .planId("pro")
                .status(Subscription.SubscriptionStatus.CANCELED)
                .currentPeriodEnd(Instant.now().plusSeconds(3600))
                .createdAt(Instant.now())
                .build();
        
        when(subscriptionRepository.findActiveSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.empty()); // Repository returns empty for canceled
        
        // When
        boolean result = featureFlagService.isFeatureEnabled(testUserId, FeatureFlagService.STREAMING_DATA);
        
        // Then
        assertThat(result).isFalse();
    }
    
    @Test
    void hasActiveSubscription_ShouldReturnTrue_WhenActiveSubscriptionExists() {
        // Given
        Subscription activeSubscription = Subscription.builder()
                .userId(testUserId)
                .planId("free")
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plusSeconds(3600))
                .createdAt(Instant.now())
                .build();
        
        when(subscriptionRepository.findActiveSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.of(activeSubscription));
        
        // When
        boolean result = featureFlagService.hasActiveSubscription(testUserId);
        
        // Then
        assertThat(result).isTrue();
    }
    
    @Test
    void hasActiveSubscription_ShouldReturnFalse_WhenNoActiveSubscription() {
        // Given
        when(subscriptionRepository.findActiveSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.empty());
        
        // When
        boolean result = featureFlagService.hasActiveSubscription(testUserId);
        
        // Then
        assertThat(result).isFalse();
    }
    
    @Test
    void hasPremiumSubscription_ShouldReturnTrue_WhenPremiumSubscriptionExists() {
        // Given
        when(subscriptionRepository.findPremiumSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.of(Subscription.builder()
                        .userId(testUserId)
                        .planId("pro")
                        .status(Subscription.SubscriptionStatus.ACTIVE)
                        .build()));
        
        // When
        boolean result = featureFlagService.hasPremiumSubscription(testUserId);
        
        // Then
        assertThat(result).isTrue();
    }
    
    @Test
    void hasPremiumSubscription_ShouldReturnFalse_WhenNoPremiumSubscription() {
        // Given
        when(subscriptionRepository.findPremiumSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.empty());
        
        // When
        boolean result = featureFlagService.hasPremiumSubscription(testUserId);
        
        // Then
        assertThat(result).isFalse();
    }
    
    @Test
    void getUserPlan_ShouldReturnPlanId_WhenActiveSubscription() {
        // Given
        Subscription subscription = Subscription.builder()
                .userId(testUserId)
                .planId("pro")
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plusSeconds(3600))
                .createdAt(Instant.now())
                .build();
        
        when(subscriptionRepository.findActiveSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.of(subscription));
        
        // When
        String plan = featureFlagService.getUserPlan(testUserId);
        
        // Then
        assertThat(plan).isEqualTo("pro");
    }
    
    @Test
    void getUserPlan_ShouldReturnFree_WhenNoActiveSubscription() {
        // Given
        when(subscriptionRepository.findActiveSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.empty());
        
        // When
        String plan = featureFlagService.getUserPlan(testUserId);
        
        // Then
        assertThat(plan).isEqualTo("free");
    }
    
    @Test
    void getUserPlan_ShouldReturnFree_WhenUserIdIsNull() {
        // When
        String plan = featureFlagService.getUserPlan(null);
        
        // Then
        assertThat(plan).isEqualTo("free");
    }
    
    @Test
    void isStreamingEnabled_ShouldReturnTrue_WhenPremiumSubscription() {
        // Given
        Subscription premiumSubscription = Subscription.builder()
                .userId(testUserId)
                .planId("pro")
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plusSeconds(3600))
                .createdAt(Instant.now())
                .build();
        
        when(subscriptionRepository.findActiveSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.of(premiumSubscription));
        
        // When
        boolean result = featureFlagService.isStreamingEnabled(testUserId);
        
        // Then
        assertThat(result).isTrue();
    }
    
    @Test
    void isBacktestingEnabled_ShouldReturnTrue_WhenPremiumSubscription() {
        // Given
        Subscription premiumSubscription = Subscription.builder()
                .userId(testUserId)
                .planId("premium")
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plusSeconds(3600))
                .createdAt(Instant.now())
                .build();
        
        when(subscriptionRepository.findActiveSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.of(premiumSubscription));
        
        // When
        boolean result = featureFlagService.isBacktestingEnabled(testUserId);
        
        // Then
        assertThat(result).isTrue();
    }
    
    @Test
    void isAiAnalysisEnabled_ShouldReturnFalse_WhenFreeSubscription() {
        // Given
        Subscription freeSubscription = Subscription.builder()
                .userId(testUserId)
                .planId("free")
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plusSeconds(3600))
                .createdAt(Instant.now())
                .build();
        
        when(subscriptionRepository.findActiveSubscriptionByUserId(eq(testUserId), any(Instant.class)))
                .thenReturn(Optional.of(freeSubscription));
        
        // When
        boolean result = featureFlagService.isAiAnalysisEnabled(testUserId);
        
        // Then
        assertThat(result).isFalse();
    }
}
