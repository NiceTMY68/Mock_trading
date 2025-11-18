package com.example.demo.controller;

import com.example.demo.dto.OrderResponse;
import com.example.demo.dto.PlaceOrderDto;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.OrderService;
import com.example.demo.service.FeatureFlagService;
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
    private final UserRepository userRepository;
    private final FeatureFlagService featureFlagService;
    
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
        try {
            UUID userId = getCurrentUserId(authentication);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not authenticated"));
            }
            
            if (!featureFlagService.isFeatureEnabled(userId, FeatureFlagService.REAL_TIME_ALERTS)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of(
                                "error", "Trading requires premium subscription",
                                "message", "Please upgrade to access trading features"
                        ));
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
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            log.warn("Invalid order request: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid order request", "message", e.getMessage()));
                    
        } catch (RuntimeException e) {
            log.error("Error placing order: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to place order", "message", e.getMessage()));
        }
    }
    
    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrder(@PathVariable UUID orderId, Authentication authentication) {
        try {
            UUID userId = getCurrentUserId(authentication);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not authenticated"));
            }
            
            return ResponseEntity.ok(Map.of(
                    "orderId", orderId,
                    "message", "Order details endpoint - to be implemented"
            ));
            
        } catch (Exception e) {
            log.error("Error getting order {}: {}", orderId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get order", "message", e.getMessage()));
        }
    }
    
    @GetMapping
    public ResponseEntity<?> getUserOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        try {
            UUID userId = getCurrentUserId(authentication);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not authenticated"));
            }
            
            return ResponseEntity.ok(Map.of(
                    "orders", "[]",
                    "page", page,
                    "size", size,
                    "message", "User orders endpoint - to be implemented"
            ));
            
        } catch (Exception e) {
            log.error("Error getting user orders: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get orders", "message", e.getMessage()));
        }
    }
    
    @GetMapping("/portfolio")
    public ResponseEntity<?> getPortfolio(Authentication authentication) {
        try {
            UUID userId = getCurrentUserId(authentication);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not authenticated"));
            }
            
            return ResponseEntity.ok(Map.of(
                    "portfolio", "Portfolio details - to be implemented",
                    "message", "Portfolio endpoint - to be implemented"
            ));
            
        } catch (Exception e) {
            log.error("Error getting portfolio: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get portfolio", "message", e.getMessage()));
        }
    }
    
    @GetMapping("/holdings")
    public ResponseEntity<?> getHoldings(Authentication authentication) {
        try {
            UUID userId = getCurrentUserId(authentication);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not authenticated"));
            }
            
            return ResponseEntity.ok(Map.of(
                    "holdings", "Holdings details - to be implemented",
                    "message", "Holdings endpoint - to be implemented"
            ));
            
        } catch (Exception e) {
            log.error("Error getting holdings: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get holdings", "message", e.getMessage()));
        }
    }
    
    @PatchMapping("/{orderId}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable UUID orderId, Authentication authentication) {
        try {
            UUID userId = getCurrentUserId(authentication);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not authenticated"));
            }
            
            if (!featureFlagService.isFeatureEnabled(userId, FeatureFlagService.REAL_TIME_ALERTS)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of(
                                "error", "Trading requires premium subscription",
                                "message", "Please upgrade to access trading features"
                        ));
            }
            
            OrderResponse response = orderService.cancelOrder(userId, orderId);
            
            log.info("Order cancelled successfully for user {}: {}", userId, orderId);
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            log.warn("Invalid cancel request: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid cancel request", "message", e.getMessage()));
                    
        } catch (RuntimeException e) {
            log.error("Error cancelling order: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to cancel order", "message", e.getMessage()));
        }
    }
    
    private UUID getCurrentUserId(Authentication authentication) {
        try {
            if (authentication != null && authentication.isAuthenticated() && 
                !"anonymousUser".equals(authentication.getPrincipal())) {
                String email = authentication.getName();
                return userRepository.findByEmail(email).map(User::getId).orElse(null);
            }
        } catch (Exception e) {
            log.debug("Could not get current user", e);
        }
        return null;
    }
}
