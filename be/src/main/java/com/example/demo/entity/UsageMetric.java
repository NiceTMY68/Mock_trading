package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "usage_metrics", indexes = {
    @Index(name = "idx_metric_key", columnList = "metric_key"),
    @Index(name = "idx_user_id", columnList = "user_id"),
    @Index(name = "idx_created_at", columnList = "created_at"),
    @Index(name = "idx_metric_user", columnList = "metric_key,user_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsageMetric {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "metric_key", nullable = false, length = 100)
    private String metricKey;
    
    @Column(name = "user_id")
    private UUID userId;
    
    @Column(name = "amount", nullable = false)
    private Integer amount;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    @Column(name = "metadata", length = 500)
    private String metadata;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}

