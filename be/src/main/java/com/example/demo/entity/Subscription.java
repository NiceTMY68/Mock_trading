package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "subscriptions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "stripe_customer_id", length = 100)
    private String stripeCustomerId;
    
    @Column(name = "stripe_subscription_id", length = 100)
    private String stripeSubscriptionId;
    
    @Column(name = "plan_id", length = 50, nullable = false)
    private String planId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SubscriptionStatus status;
    
    @Column(name = "current_period_end")
    private Instant currentPeriodEnd;
    
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    
    public enum SubscriptionStatus {
        ACTIVE,
        CANCELED,
        PAST_DUE,
        INCOMPLETE,
        INCOMPLETE_EXPIRED,
        TRIALING,
        UNPAID
    }
    
    public boolean isActive() {
        return status == SubscriptionStatus.ACTIVE && 
               (currentPeriodEnd == null || currentPeriodEnd.isAfter(Instant.now()));
    }
    
    public boolean isPremium() {
        return isActive() && ("pro".equalsIgnoreCase(planId) || "premium".equalsIgnoreCase(planId));
    }
}
