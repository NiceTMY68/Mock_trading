package com.example.demo.dto;

import com.example.demo.entity.Order;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request to place a new order (market or limit)")
public class PlaceOrderDto {
    
    @NotBlank(message = "Symbol is required")
    @Schema(description = "Trading symbol (e.g., BTCUSDT)", example = "BTCUSDT")
    private String symbol;
    
    @NotNull(message = "Side is required")
    @Schema(description = "Order side: BUY or SELL", example = "BUY")
    private Order.OrderSide side;
    
    @NotNull(message = "Type is required")
    @Schema(description = "Order type: MARKET or LIMIT", example = "MARKET")
    private Order.OrderType type;
    
    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "0.00000001", message = "Quantity must be greater than 0")
    @Schema(description = "Quantity to buy or sell", example = "0.5")
    private BigDecimal quantity;
    
    @Schema(description = "Limit price (required for LIMIT orders)", example = "45000.00")
    private BigDecimal price;
    
    @Schema(description = "Optional notes for the order", example = "Long position entry")
    private String notes;

    @Schema(description = "If true, keep remaining quantity as pending limit order when partial fill occurs", example = "false")
    private Boolean keepRemainingOnPartialFill;
}
