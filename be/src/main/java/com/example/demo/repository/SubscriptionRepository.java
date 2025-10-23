package com.example.demo.repository;

import com.example.demo.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    
    Optional<Subscription> findByUserIdAndStatus(UUID userId, Subscription.SubscriptionStatus status);
    
    List<Subscription> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    Optional<Subscription> findByUserIdAndStatusAndCurrentPeriodEndAfter(
            UUID userId, Subscription.SubscriptionStatus status, Instant now);
    
    @Query("SELECT s FROM Subscription s WHERE s.userId = :userId AND s.status = 'ACTIVE' AND (s.currentPeriodEnd IS NULL OR s.currentPeriodEnd > :now)")
    Optional<Subscription> findActiveSubscriptionByUserId(@Param("userId") UUID userId, @Param("now") Instant now);
    
    @Query("SELECT s FROM Subscription s WHERE s.userId = :userId AND s.status = 'ACTIVE' AND s.planId IN ('pro', 'premium') AND (s.currentPeriodEnd IS NULL OR s.currentPeriodEnd > :now)")
    Optional<Subscription> findPremiumSubscriptionByUserId(@Param("userId") UUID userId, @Param("now") Instant now);
    
    List<Subscription> findByStatusAndCurrentPeriodEndBefore(Subscription.SubscriptionStatus status, Instant cutoffTime);
    
    @Query("SELECT COUNT(s) FROM Subscription s WHERE s.userId = :userId AND s.status = 'ACTIVE'")
    Long countActiveSubscriptionsByUserId(@Param("userId") UUID userId);
    
    boolean existsByUserIdAndStatus(UUID userId, Subscription.SubscriptionStatus status);
    
    Optional<Subscription> findByStripeSubscriptionId(String stripeSubscriptionId);
}
