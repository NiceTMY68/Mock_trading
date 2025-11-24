package com.example.demo.service;

import com.example.demo.config.OrderSimulationProperties;
import com.example.demo.dto.OrderResponse;
import com.example.demo.dto.PlaceOrderDto;
import com.example.demo.entity.*;
import com.example.demo.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {
    
    private final OrderRepository orderRepository;
    private final TradeRepository tradeRepository;
    private final HoldingService holdingService;
    private final PortfolioService portfolioService;
    private final PriceService priceService;
    private final PortfolioRepository portfolioRepository;
    private final HoldingRepository holdingRepository;
    private final SymbolValidationService symbolValidationService;
    private final SlippageModel slippageModel;
    private final OrderSimulationProperties orderSimulationProperties;
    
    private static final BigDecimal COMMISSION_RATE = new BigDecimal("0.001"); // 0.1% commission
    
    @Transactional
    public OrderResponse placeMarketOrder(UUID userId, PlaceOrderDto dto) {
        log.info("Placing market order for user {}: {} {} {}", userId, dto.getSide(), dto.getQuantity(), dto.getSymbol());
        
        try {
            validateOrder(dto);
            
            BigDecimal latestPrice = getLatestPrice(dto.getSymbol());
            if (latestPrice == null) {
                throw new RuntimeException("Unable to get latest price for symbol: " + dto.getSymbol());
            }

            BigDecimal executionPrice = slippageModel.apply(dto.getSide(), latestPrice);
            symbolValidationService.validateOrder(dto.getSymbol(), dto.getQuantity(), executionPrice);
            
            BigDecimal requestedTotalAmount = dto.getQuantity().multiply(executionPrice);
            BigDecimal requestedCommission = requestedTotalAmount.multiply(COMMISSION_RATE);
            BigDecimal requestedTotalCost = requestedTotalAmount.add(requestedCommission);
            
            if (dto.getSide() == Order.OrderSide.BUY) {
                validateSufficientFunds(userId, requestedTotalCost);
            }
            
            if (dto.getSide() == Order.OrderSide.SELL) {
                validateSufficientHoldings(userId, dto.getSymbol(), dto.getQuantity());
            }

            PartialFillResult fillResult = simulatePartialFill(dto);
            BigDecimal filledQuantity = fillResult.filledQuantity();
            if (filledQuantity.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalStateException("Unable to simulate fill for order");
            }

            BigDecimal executedAmount = filledQuantity.multiply(executionPrice);
            BigDecimal commission = executedAmount.multiply(COMMISSION_RATE);
            Order.OrderStatus status = fillResult.partial()
                    ? Order.OrderStatus.PARTIALLY_FILLED
                    : Order.OrderStatus.FILLED;
            
            Order order = createExecutedOrder(userId, dto, executionPrice, filledQuantity, executedAmount, commission, status);
            order = orderRepository.save(order);
            
            applyExecution(dto.getSide(), order, filledQuantity, executionPrice);

            Order residualOrder = null;
            if (fillResult.partial() && fillResult.remaining().compareTo(BigDecimal.ZERO) > 0) {
                if (Boolean.TRUE.equals(dto.getKeepRemainingOnPartialFill())) {
                    residualOrder = createResidualPendingOrder(userId, dto, fillResult.remaining(), executionPrice);
                } else {
                    log.info("Partial fill remainder for order {} was cancelled per user preference", order.getOrderId());
                }
            }
            
            log.info("Successfully placed market order {} for user {}", order.getOrderId(), userId);
            
            return OrderResponse.builder()
                    .orderId(order.getOrderId())
                    .userId(order.getUserId())
                    .symbol(order.getSymbol())
                    .side(order.getSide())
                    .type(order.getType())
                    .quantity(order.getQuantity())
                    .price(order.getPrice())
                    .status(order.getStatus())
                    .filledQuantity(order.getFilledQuantity())
                    .averagePrice(order.getAveragePrice())
                    .totalAmount(order.getTotalAmount())
                    .commission(order.getCommission())
                    .createdAt(order.getCreatedAt())
                    .updatedAt(order.getUpdatedAt())
                    .message(buildMarketOrderMessage(status, residualOrder))
                    .build();
                    
        } catch (IllegalArgumentException e) {
            log.warn("Validation failed for market order: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Error placing market order for user {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Failed to place order: " + e.getMessage(), e);
        }
    }
    
    private void validateOrder(PlaceOrderDto dto) {
        if (dto.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than 0");
        }
        
        if (dto.getType() != Order.OrderType.MARKET) {
            throw new IllegalArgumentException("Only market orders are supported");
        }
        
        if (dto.getSide() == null) {
            throw new IllegalArgumentException("Order side is required");
        }
    }
    
    private BigDecimal getLatestPrice(String symbol) {
        try {
            // Get latest price from PriceService
            return priceService.getLatestPrice(symbol).orElse(null);
        } catch (Exception e) {
            log.error("Error getting latest price for symbol {}: {}", symbol, e.getMessage());
            return null;
        }
    }
    
    private void validateSufficientFunds(UUID userId, BigDecimal totalCost) {
        Portfolio portfolio = portfolioRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Portfolio not found for user: " + userId));
        
        if (portfolio.getVirtualBalance().compareTo(totalCost) < 0) {
            throw new RuntimeException("Insufficient funds. Required: " + totalCost + ", Available: " + portfolio.getVirtualBalance());
        }
    }
    
    private void validateSufficientHoldings(UUID userId, String symbol, BigDecimal quantity) {
        Optional<Holding> holding = holdingRepository.findByUserIdAndSymbol(userId, symbol);
        
        if (holding.isEmpty() || holding.get().getQuantity().compareTo(quantity) < 0) {
            throw new RuntimeException("Insufficient holdings for symbol: " + symbol);
        }
    }
    
    private Order createExecutedOrder(UUID userId,
                                      PlaceOrderDto dto,
                                      BigDecimal executionPrice,
                                      BigDecimal filledQuantity,
                                      BigDecimal executedAmount,
                                      BigDecimal commission,
                                      Order.OrderStatus status) {
        return Order.builder()
                .userId(userId)
                .symbol(dto.getSymbol())
                .side(dto.getSide())
                .type(dto.getType())
                .quantity(dto.getQuantity())
                .price(executionPrice)
                .status(status)
                .filledQuantity(filledQuantity)
                .averagePrice(executionPrice)
                .totalAmount(executedAmount)
                .commission(commission)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }
    
    private Trade createTrade(Order order, BigDecimal executedQuantity, BigDecimal price, BigDecimal executedAmount, BigDecimal commission) {
        return Trade.builder()
                .orderId(order.getId())
                .userId(order.getUserId())
                .symbol(order.getSymbol())
                .side(order.getSide())
                .quantity(executedQuantity)
                .price(price)
                .totalAmount(executedAmount)
                .commission(commission)
                .executedAt(Instant.now())
                .build();
    }

    private void applyExecution(Order.OrderSide side, Order order, BigDecimal executedQuantity, BigDecimal executionPrice) {
        if (side == Order.OrderSide.BUY) {
            applyBuy(order, executedQuantity, executionPrice);
        } else {
            applySell(order, executedQuantity, executionPrice);
        }
    }
    
    
    @Transactional
    public OrderResponse createLimitOrder(UUID userId, PlaceOrderDto dto) {
        log.info("Creating limit order for user {}: {} {} {} at price {}", 
                userId, dto.getSide(), dto.getQuantity(), dto.getSymbol(), dto.getPrice());
        
        try {
            validateLimitOrder(dto);
            symbolValidationService.validateOrder(dto.getSymbol(), dto.getQuantity(), dto.getPrice());
            
            BigDecimal totalAmount = dto.getQuantity().multiply(dto.getPrice());
            BigDecimal commission = totalAmount.multiply(COMMISSION_RATE);
            BigDecimal totalCost = totalAmount.add(commission);
            
            if (dto.getSide() == Order.OrderSide.BUY) {
                validateSufficientFunds(userId, totalCost);
            }
            
            if (dto.getSide() == Order.OrderSide.SELL) {
                validateSufficientHoldings(userId, dto.getSymbol(), dto.getQuantity());
            }
            
            Order order = createPendingOrder(userId, dto, totalAmount, commission);
            order = orderRepository.save(order);
            
            log.info("Successfully created limit order {} for user {}", order.getOrderId(), userId);
            
            return OrderResponse.builder()
                    .orderId(order.getOrderId())
                    .userId(order.getUserId())
                    .symbol(order.getSymbol())
                    .side(order.getSide())
                    .type(order.getType())
                    .quantity(order.getQuantity())
                    .price(order.getPrice())
                    .status(order.getStatus())
                    .filledQuantity(order.getFilledQuantity())
                    .averagePrice(order.getAveragePrice())
                    .totalAmount(order.getTotalAmount())
                    .commission(order.getCommission())
                    .createdAt(order.getCreatedAt())
                    .updatedAt(order.getUpdatedAt())
                    .message("Limit order created successfully")
                    .build();
                    
        } catch (IllegalArgumentException e) {
            log.warn("Validation failed for limit order: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Error creating limit order for user {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Failed to create limit order: " + e.getMessage(), e);
        }
    }
    
    @Transactional
    public void processPendingLimitOrders() {
        log.debug("Processing pending limit orders");
        
        try {
            List<Order> pendingOrders = orderRepository.findByStatusOrderByCreatedAtAsc(Order.OrderStatus.PENDING);
            
            for (Order order : pendingOrders) {
                try {
                    processLimitOrder(order);
                } catch (Exception e) {
                    log.error("Error processing limit order {}: {}", order.getOrderId(), e.getMessage(), e);
                }
            }
            
            log.debug("Processed {} pending limit orders", pendingOrders.size());
        } catch (Exception e) {
            log.error("Error processing pending limit orders: {}", e.getMessage(), e);
        }
    }
    
    private void processLimitOrder(Order order) {
        BigDecimal currentPrice = getLatestPrice(order.getSymbol());
        if (currentPrice == null) {
            log.warn("Unable to get current price for symbol: {}", order.getSymbol());
            return;
        }
        
        boolean shouldFill = false;
        
        if (order.getSide() == Order.OrderSide.BUY && currentPrice.compareTo(order.getPrice()) <= 0) {
            shouldFill = true;
        } else if (order.getSide() == Order.OrderSide.SELL && currentPrice.compareTo(order.getPrice()) >= 0) {
            shouldFill = true;
        }
        
        if (shouldFill) {
            fillLimitOrder(order, currentPrice);
        }
    }
    
    private void fillLimitOrder(Order order, BigDecimal fillPrice) {
        log.info("Filling limit order {} at price {}", order.getOrderId(), fillPrice);
        
        BigDecimal executedAmount = order.getQuantity().multiply(fillPrice);
        BigDecimal commission = executedAmount.multiply(COMMISSION_RATE);
        order.setStatus(Order.OrderStatus.FILLED);
        order.setFilledQuantity(order.getQuantity());
        order.setAveragePrice(fillPrice);
        order.setTotalAmount(executedAmount);
        order.setCommission(commission);
        order.setUpdatedAt(Instant.now());
        orderRepository.save(order);
        
        applyExecution(order.getSide(), order, order.getQuantity(), fillPrice);
        
        log.info("Successfully filled limit order {} for user {}", order.getOrderId(), order.getUserId());
    }
    
    public OrderResponse cancelOrder(UUID userId, UUID orderId) {
        log.info("Cancelling order {} for user {}", orderId, userId);
        
        try {
            Order order = orderRepository.findByOrderId(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
            
            if (!order.getUserId().equals(userId)) {
                throw new RuntimeException("Order does not belong to user");
            }
            
            if (order.getStatus() != Order.OrderStatus.PENDING) {
                throw new RuntimeException("Only pending orders can be cancelled");
            }
            
            order.setStatus(Order.OrderStatus.CANCELLED);
            order.setUpdatedAt(Instant.now());
            orderRepository.save(order);
            
            log.info("Successfully cancelled order {} for user {}", orderId, userId);
            
            return OrderResponse.builder()
                    .orderId(order.getOrderId())
                    .userId(order.getUserId())
                    .symbol(order.getSymbol())
                    .side(order.getSide())
                    .type(order.getType())
                    .quantity(order.getQuantity())
                    .price(order.getPrice())
                    .status(order.getStatus())
                    .filledQuantity(order.getFilledQuantity())
                    .averagePrice(order.getAveragePrice())
                    .totalAmount(order.getTotalAmount())
                    .commission(order.getCommission())
                    .createdAt(order.getCreatedAt())
                    .updatedAt(order.getUpdatedAt())
                    .message("Order cancelled successfully")
                    .build();
                    
        } catch (Exception e) {
            log.error("Error cancelling order {}: {}", orderId, e.getMessage(), e);
            throw new RuntimeException("Failed to cancel order: " + e.getMessage(), e);
        }
    }
    
    private void validateLimitOrder(PlaceOrderDto dto) {
        if (dto.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than 0");
        }
        
        if (dto.getType() != Order.OrderType.LIMIT) {
            throw new IllegalArgumentException("Only limit orders are supported");
        }
        
        if (dto.getPrice() == null || dto.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Price is required for limit orders and must be greater than 0");
        }
        
        if (dto.getSide() == null) {
            throw new IllegalArgumentException("Order side is required");
        }
    }
    
    private Order createPendingOrder(UUID userId, PlaceOrderDto dto, BigDecimal totalAmount, BigDecimal commission) {
        return Order.builder()
                .userId(userId)
                .symbol(dto.getSymbol())
                .side(dto.getSide())
                .type(dto.getType())
                .quantity(dto.getQuantity())
                .price(dto.getPrice())
                .status(Order.OrderStatus.PENDING)
                .filledQuantity(BigDecimal.ZERO)
                .averagePrice(BigDecimal.ZERO)
                .totalAmount(totalAmount)
                .commission(commission)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    private Order createResidualPendingOrder(UUID userId, PlaceOrderDto originalDto, BigDecimal remainingQuantity, BigDecimal priceReference) {
        BigDecimal totalAmount = remainingQuantity.multiply(priceReference);
        BigDecimal commission = totalAmount.multiply(COMMISSION_RATE);
        Order residual = Order.builder()
                .userId(userId)
                .symbol(originalDto.getSymbol())
                .side(originalDto.getSide())
                .type(Order.OrderType.LIMIT)
                .quantity(remainingQuantity)
                .price(priceReference)
                .status(Order.OrderStatus.PENDING)
                .filledQuantity(BigDecimal.ZERO)
                .averagePrice(BigDecimal.ZERO)
                .totalAmount(totalAmount)
                .commission(commission)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        Order saved = orderRepository.save(residual);
        log.info("Created residual pending order {} for remaining quantity {}", saved.getOrderId(), remainingQuantity);
        return saved;
    }

    private PartialFillResult simulatePartialFill(PlaceOrderDto dto) {
        BigDecimal threshold = orderSimulationProperties.resolveLiquidityThreshold(dto.getSymbol());
        if (threshold == null || threshold.compareTo(BigDecimal.ZERO) <= 0) {
            return new PartialFillResult(dto.getQuantity(), BigDecimal.ZERO, false);
        }
        if (dto.getQuantity().compareTo(threshold) <= 0) {
            return new PartialFillResult(dto.getQuantity(), BigDecimal.ZERO, false);
        }
        BigDecimal filled = threshold;
        BigDecimal remaining = dto.getQuantity().subtract(filled);
        log.info("Partial fill simulation triggered for {} : filled {}, remaining {}", dto.getSymbol(), filled, remaining);
        return new PartialFillResult(filled, remaining, true);
    }

    private String buildMarketOrderMessage(Order.OrderStatus status, Order residualOrder) {
        if (status == Order.OrderStatus.PARTIALLY_FILLED) {
            if (residualOrder != null) {
                return "Order partially filled. Remaining quantity pending under order " + residualOrder.getOrderId();
            }
            return "Order partially filled. Remaining quantity cancelled.";
        }
        return "Order placed successfully";
    }
    
    @Transactional
    public void applyBuy(Order order, BigDecimal executedQuantity, BigDecimal price) {
        log.debug("Applying BUY order {} at price {} for qty {}", order.getOrderId(), price, executedQuantity);
        
        BigDecimal executedAmount = executedQuantity.multiply(price);
        BigDecimal commission = executedAmount.multiply(COMMISSION_RATE);
        BigDecimal totalCost = executedAmount.add(commission);
        
        Trade trade = createTrade(order, executedQuantity, price, executedAmount, commission);
        tradeRepository.save(trade);
        
        holdingService.updateOnBuy(order.getUserId(), order.getSymbol(), executedQuantity,
                                  executedAmount, commission);
        portfolioService.updateBalance(order.getUserId(), totalCost, true);
        portfolioService.recalculate(order.getUserId());
        
        log.debug("Successfully applied BUY order {}", order.getOrderId());
    }
    
    @Transactional
    public void applySell(Order order, BigDecimal executedQuantity, BigDecimal price) {
        log.debug("Applying SELL order {} at price {} for qty {}", order.getOrderId(), price, executedQuantity);
        
        BigDecimal executedAmount = executedQuantity.multiply(price);
        BigDecimal commission = executedAmount.multiply(COMMISSION_RATE);
        BigDecimal netProceeds = executedAmount.subtract(commission);
        
        Trade trade = createTrade(order, executedQuantity, price, executedAmount, commission);
        tradeRepository.save(trade);
        
        holdingService.updateOnSell(order.getUserId(), order.getSymbol(), executedQuantity,
                                   executedAmount, commission);
        portfolioService.updateBalance(order.getUserId(), netProceeds, false);
        portfolioService.recalculate(order.getUserId());
        
        log.debug("Successfully applied SELL order {}", order.getOrderId());
    }

    private record PartialFillResult(BigDecimal filledQuantity, BigDecimal remaining, boolean partial) {}
}
