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
@Table(name = "trades")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Trade {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "trade_id", unique = true, nullable = false)
    private UUID tradeId;
    
    @Column(name = "order_id", nullable = false)
    private Long orderId;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "symbol", nullable = false)
    private String symbol;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "side", nullable = false)
    private Order.OrderSide side;
    
    @Column(name = "quantity", nullable = false, precision = 18, scale = 8)
    private BigDecimal quantity;
    
    @Column(name = "price", nullable = false, precision = 18, scale = 8)
    private BigDecimal price;
    
    @Column(name = "total_amount", nullable = false, precision = 18, scale = 8)
    private BigDecimal totalAmount;
    
    @Column(name = "commission", precision = 18, scale = 8)
    private BigDecimal commission;
    
    @Column(name = "executed_at", nullable = false)
    private Instant executedAt;
    
    @PrePersist
    protected void onCreate() {
        if (tradeId == null) {
            tradeId = UUID.randomUUID();
        }
        if (executedAt == null) {
            executedAt = Instant.now();
        }
    }
}
