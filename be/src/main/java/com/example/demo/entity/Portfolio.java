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
@Table(name = "portfolios", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Portfolio {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", unique = true, nullable = false)
    private UUID userId;
    
    @Column(name = "virtual_balance", nullable = false, precision = 18, scale = 8)
    private BigDecimal virtualBalance;
    
    @Column(name = "total_invested", precision = 18, scale = 8)
    private BigDecimal totalInvested;
    
    @Column(name = "total_market_value", precision = 18, scale = 8)
    private BigDecimal totalMarketValue;
    
    @Column(name = "total_pnl", precision = 18, scale = 8)
    private BigDecimal totalPnl;
    
    @Column(name = "total_pnl_percentage", precision = 5, scale = 2)
    private BigDecimal totalPnlPercentage;
    
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    
    @PrePersist
    protected void onCreate() {
        if (virtualBalance == null) {
            virtualBalance = BigDecimal.valueOf(10000); // Starting with $10,000 virtual balance
        }
        if (totalInvested == null) {
            totalInvested = BigDecimal.ZERO;
        }
        if (totalMarketValue == null) {
            totalMarketValue = BigDecimal.ZERO;
        }
        if (totalPnl == null) {
            totalPnl = BigDecimal.ZERO;
        }
        if (totalPnlPercentage == null) {
            totalPnlPercentage = BigDecimal.ZERO;
        }
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
