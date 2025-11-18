package com.example.demo.dto;

import com.example.demo.entity.Order;
import io.swagger.v3.oas.annotations.media.Schema;
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
@Schema(description = "Order response with execution details")
public class OrderResponse {
    
    @Schema(description = "Unique order identifier")
    private UUID orderId;
    
    @Schema(description = "User who placed the order")
    private UUID userId;
    
    @Schema(description = "Trading symbol", example = "BTCUSDT")
    private String symbol;
    
    @Schema(description = "Order side", example = "BUY")
    private Order.OrderSide side;
    
    @Schema(description = "Order type", example = "MARKET")
    private Order.OrderType type;
    
    @Schema(description = "Requested quantity", example = "0.5")
    private BigDecimal quantity;
    
    @Schema(description = "Order price (limit orders)", example = "45000.00")
    private BigDecimal price;
    
    @Schema(description = "Order status", example = "FILLED")
    private Order.OrderStatus status;
    
    @Schema(description = "Quantity filled", example = "0.5")
    private BigDecimal filledQuantity;
    
    @Schema(description = "Average execution price", example = "44950.00")
    private BigDecimal averagePrice;
    
    @Schema(description = "Total amount (price * quantity)", example = "22475.00")
    private BigDecimal totalAmount;
    
    @Schema(description = "Trading commission", example = "22.475")
    private BigDecimal commission;
    
    @Schema(description = "Order creation timestamp")
    private Instant createdAt;
    
    @Schema(description = "Last update timestamp")
    private Instant updatedAt;
    
    @Schema(description = "Status message or error details")
    private String message;
}
