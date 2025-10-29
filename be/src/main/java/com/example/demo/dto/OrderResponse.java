package com.example.demo.dto;

import com.example.demo.entity.Order;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    
    private UUID orderId;
    private UUID userId;
    private String symbol;
    private Order.OrderSide side;
    private Order.OrderType type;
    private BigDecimal quantity;
    private BigDecimal price;
    private Order.OrderStatus status;
    private BigDecimal filledQuantity;
    private BigDecimal averagePrice;
    private BigDecimal totalAmount;
    private BigDecimal commission;
    private Instant createdAt;
    private Instant updatedAt;
    private String message;
}
