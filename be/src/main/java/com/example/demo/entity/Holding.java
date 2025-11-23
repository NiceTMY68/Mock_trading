package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "holdings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "symbol"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Holding {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "symbol", nullable = false)
    private String symbol;
    
    @Column(name = "quantity", nullable = false, precision = 18, scale = 8)
    private BigDecimal quantity;
    
    @Column(name = "average_cost", precision = 18, scale = 8)
    private BigDecimal averageCost;
    
    @Column(name = "total_cost", precision = 18, scale = 8)
    private BigDecimal totalCost;
    
    @Column(name = "market_value", precision = 18, scale = 8)
    private BigDecimal marketValue;
    
    @Column(name = "unrealized_pnl", precision = 18, scale = 8)
    private BigDecimal unrealizedPnl;
    
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    
    @Version
    @Column(name = "version", nullable = false)
    private Long version;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
