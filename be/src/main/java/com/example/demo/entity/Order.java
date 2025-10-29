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
@Table(name = "orders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "order_id", unique = true, nullable = false)
    private UUID orderId;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "symbol", nullable = false)
    private String symbol;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "side", nullable = false)
    private OrderSide side;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private OrderType type;
    
    @Column(name = "quantity", nullable = false, precision = 18, scale = 8)
    private BigDecimal quantity;
    
    @Column(name = "price", precision = 18, scale = 8)
    private BigDecimal price;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private OrderStatus status;
    
    @Column(name = "filled_quantity", precision = 18, scale = 8)
    private BigDecimal filledQuantity;
    
    @Column(name = "average_price", precision = 18, scale = 8)
    private BigDecimal averagePrice;
    
    @Column(name = "total_amount", precision = 18, scale = 8)
    private BigDecimal totalAmount;
    
    @Column(name = "commission", precision = 18, scale = 8)
    private BigDecimal commission;
    
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    
    @Column(name = "updated_at")
    private Instant updatedAt;
    
    @PrePersist
    protected void onCreate() {
        if (orderId == null) {
            orderId = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        updatedAt = Instant.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
    
    public enum OrderSide {
        BUY, SELL
    }
    
    public enum OrderType {
        MARKET, LIMIT, STOP_LOSS, TAKE_PROFIT
    }
    
    public enum OrderStatus {
        PENDING, FILLED, PARTIALLY_FILLED, CANCELLED, REJECTED
    }
}
