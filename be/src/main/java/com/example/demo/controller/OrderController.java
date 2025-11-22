package com.example.demo.controller;

import com.example.demo.dto.OrderResponse;
import com.example.demo.dto.PlaceOrderDto;
import com.example.demo.service.OrderService;
import com.example.demo.service.FeatureFlagService;
import com.example.demo.util.AuditLoggingHelper;
import com.example.demo.util.ControllerHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Mock Trading", description = "Place and manage mock trading orders (market and limit)")
@SecurityRequirement(name = "bearerAuth")
public class OrderController {
    
    private final OrderService orderService;
    private final FeatureFlagService featureFlagService;
    private final AuditLoggingHelper auditLoggingHelper;
    private final ControllerHelper controllerHelper;
    private final ObjectMapper objectMapper;
    
    @Operation(
        summary = "Place order",
        description = "Place a new market or limit order. Requires premium subscription.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Order placed successfully",
                content = @Content(schema = @Schema(implementation = OrderResponse.class))),
            @ApiResponse(responseCode = "403", description = "Trading requires premium subscription"),
            @ApiResponse(responseCode = "401", description = "User not authenticated")
        }
    )
    @PostMapping
    public ResponseEntity<?> placeOrder(@Valid @RequestBody PlaceOrderDto dto, Authentication authentication) {
        UUID userId = controllerHelper.getCurrentUserId();
        var ctx = auditLoggingHelper.start("/api/orders", userId, objectMapper.valueToTree(dto));
        
        try {
            if (userId == null) {
                return auditLoggingHelper.error(ctx, "User not authenticated", HttpStatus.UNAUTHORIZED, "orders");
            }
            
            if (!featureFlagService.isFeatureEnabled(userId, FeatureFlagService.TRADING)) {
                return auditLoggingHelper.error(ctx, "Trading requires premium subscription", 
                    HttpStatus.FORBIDDEN, "orders");
            }
            
            OrderResponse response;
            if (dto.getType() == com.example.demo.entity.Order.OrderType.MARKET) {
                response = orderService.placeMarketOrder(userId, dto);
            } else if (dto.getType() == com.example.demo.entity.Order.OrderType.LIMIT) {
                response = orderService.createLimitOrder(userId, dto);
            } else {
                throw new IllegalArgumentException("Unsupported order type: " + dto.getType());
            }
            
            log.info("Order placed successfully for user {}: {}", userId, response.getOrderId());
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("requestId", ctx.requestId().toString());
            responseMap.put("orderId", response.getOrderId());
            responseMap.put("symbol", response.getSymbol());
            responseMap.put("type", response.getType());
            responseMap.put("side", response.getSide());
            responseMap.put("status", response.getStatus());
            responseMap.put("quantity", response.getQuantity());
            responseMap.put("price", response.getPrice());
            
            return auditLoggingHelper.ok(ctx, responseMap, "orders", false, 
                objectMapper.createObjectNode().put("orderId", response.getOrderId().toString()));
            
        } catch (IllegalArgumentException e) {
            log.warn("Invalid order request: {}", e.getMessage());
            return auditLoggingHelper.error(ctx, "Invalid order request: " + e.getMessage(), 
                HttpStatus.BAD_REQUEST, "orders");
                    
        } catch (RuntimeException e) {
            log.error("Error placing order: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to place order: " + e.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR, "orders");
        }
    }
    
    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrder(@PathVariable UUID orderId, Authentication authentication) {
        UUID userId = controllerHelper.getCurrentUserId();
        var ctx = auditLoggingHelper.start("/api/orders/" + orderId, userId, 
            objectMapper.createObjectNode().put("orderId", orderId.toString()));
        
        try {
            if (userId == null) {
                return auditLoggingHelper.error(ctx, "User not authenticated", HttpStatus.UNAUTHORIZED, "orders");
            }
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("requestId", ctx.requestId().toString());
            responseMap.put("orderId", orderId);
            responseMap.put("message", "Order details endpoint - to be implemented");
            
            return auditLoggingHelper.ok(ctx, responseMap, "orders", false, 
                objectMapper.createObjectNode().put("orderId", orderId.toString()));
            
        } catch (Exception e) {
            log.error("Error getting order {}: {}", orderId, e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to get order: " + e.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR, "orders");
        }
    }
    
    @GetMapping
    public ResponseEntity<?> getUserOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        UUID userId = controllerHelper.getCurrentUserId();
        var ctx = auditLoggingHelper.start("/api/orders", userId, 
            objectMapper.createObjectNode().put("page", page).put("size", size));
        
        try {
            if (userId == null) {
                return auditLoggingHelper.error(ctx, "User not authenticated", HttpStatus.UNAUTHORIZED, "orders");
            }
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("requestId", ctx.requestId().toString());
            responseMap.put("orders", "[]");
            responseMap.put("page", page);
            responseMap.put("size", size);
            responseMap.put("message", "User orders endpoint - to be implemented");
            
            return auditLoggingHelper.ok(ctx, responseMap, "orders", false, 
                objectMapper.createObjectNode().put("page", page).put("size", size));
            
        } catch (Exception e) {
            log.error("Error getting user orders: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to get orders: " + e.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR, "orders");
        }
    }
    
    @GetMapping("/portfolio")
    public ResponseEntity<?> getPortfolio(Authentication authentication) {
        UUID userId = controllerHelper.getCurrentUserId();
        var ctx = auditLoggingHelper.start("/api/orders/portfolio", userId, objectMapper.createObjectNode());
        
        try {
            if (userId == null) {
                return auditLoggingHelper.error(ctx, "User not authenticated", HttpStatus.UNAUTHORIZED, "orders");
            }
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("requestId", ctx.requestId().toString());
            responseMap.put("portfolio", "Portfolio details - to be implemented");
            responseMap.put("message", "Portfolio endpoint - to be implemented");
            
            return auditLoggingHelper.ok(ctx, responseMap, "orders", false, objectMapper.createObjectNode());
            
        } catch (Exception e) {
            log.error("Error getting portfolio: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to get portfolio: " + e.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR, "orders");
        }
    }
    
    @GetMapping("/holdings")
    public ResponseEntity<?> getHoldings(Authentication authentication) {
        UUID userId = controllerHelper.getCurrentUserId();
        var ctx = auditLoggingHelper.start("/api/orders/holdings", userId, objectMapper.createObjectNode());
        
        try {
            if (userId == null) {
                return auditLoggingHelper.error(ctx, "User not authenticated", HttpStatus.UNAUTHORIZED, "orders");
            }
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("requestId", ctx.requestId().toString());
            responseMap.put("holdings", "Holdings details - to be implemented");
            responseMap.put("message", "Holdings endpoint - to be implemented");
            
            return auditLoggingHelper.ok(ctx, responseMap, "orders", false, objectMapper.createObjectNode());
            
        } catch (Exception e) {
            log.error("Error getting holdings: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to get holdings: " + e.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR, "orders");
        }
    }
    
    @PatchMapping("/{orderId}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable UUID orderId, Authentication authentication) {
        UUID userId = controllerHelper.getCurrentUserId();
        var ctx = auditLoggingHelper.start("/api/orders/" + orderId + "/cancel", userId, 
            objectMapper.createObjectNode().put("orderId", orderId.toString()));
        
        try {
            if (userId == null) {
                return auditLoggingHelper.error(ctx, "User not authenticated", HttpStatus.UNAUTHORIZED, "orders");
            }
            
            if (!featureFlagService.isFeatureEnabled(userId, FeatureFlagService.TRADING)) {
                return auditLoggingHelper.error(ctx, "Trading requires premium subscription", 
                    HttpStatus.FORBIDDEN, "orders");
            }
            
            OrderResponse response = orderService.cancelOrder(userId, orderId);
            
            log.info("Order cancelled successfully for user {}: {}", userId, orderId);
            
            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("requestId", ctx.requestId().toString());
            responseMap.put("orderId", response.getOrderId());
            responseMap.put("status", response.getStatus());
            
            return auditLoggingHelper.ok(ctx, responseMap, "orders", false, 
                objectMapper.createObjectNode().put("orderId", orderId.toString()));
            
        } catch (IllegalArgumentException e) {
            log.warn("Invalid cancel request: {}", e.getMessage());
            return auditLoggingHelper.error(ctx, "Invalid cancel request: " + e.getMessage(), 
                HttpStatus.BAD_REQUEST, "orders");
                    
        } catch (RuntimeException e) {
            log.error("Error cancelling order: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to cancel order: " + e.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR, "orders");
        }
    }
}
