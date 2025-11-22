package com.example.demo.service;

import com.example.demo.dto.OrderResponse;
import com.example.demo.dto.PlaceOrderDto;
import com.example.demo.entity.*;
import com.example.demo.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
    private final HoldingRepository holdingRepository;
    private final PortfolioRepository portfolioRepository;
    private final PriceService priceService;
    private final AuditService auditService;
    
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
            
            BigDecimal totalAmount = dto.getQuantity().multiply(latestPrice);
            BigDecimal commission = totalAmount.multiply(COMMISSION_RATE);
            BigDecimal totalCost = totalAmount.add(commission);
            
            if (dto.getSide() == Order.OrderSide.BUY) {
                validateSufficientFunds(userId, totalCost);
            }
            
            if (dto.getSide() == Order.OrderSide.SELL) {
                validateSufficientHoldings(userId, dto.getSymbol(), dto.getQuantity());
            }
            
            Order order = createOrder(userId, dto, latestPrice, totalAmount, commission);
            order = orderRepository.save(order);
            
            Trade trade = createTrade(order, latestPrice, commission);
            trade = tradeRepository.save(trade);
            
            updateHoldingsAndPortfolio(userId, dto.getSymbol(), dto.getSide(), dto.getQuantity(), latestPrice, commission);
            
            auditService.logRequest(
                UUID.randomUUID(),
                userId,
                "/api/orders/market",
                null
            );
            
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
                    .message("Order placed successfully")
                    .build();
                    
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
    
    private Order createOrder(UUID userId, PlaceOrderDto dto, BigDecimal price, BigDecimal totalAmount, BigDecimal commission) {
        return Order.builder()
                .userId(userId)
                .symbol(dto.getSymbol())
                .side(dto.getSide())
                .type(dto.getType())
                .quantity(dto.getQuantity())
                .price(price)
                .status(Order.OrderStatus.FILLED)
                .filledQuantity(dto.getQuantity())
                .averagePrice(price)
                .totalAmount(totalAmount)
                .commission(commission)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }
    
    private Trade createTrade(Order order, BigDecimal price, BigDecimal commission) {
        return Trade.builder()
                .orderId(order.getId())
                .userId(order.getUserId())
                .symbol(order.getSymbol())
                .side(order.getSide())
                .quantity(order.getQuantity())
                .price(price)
                .totalAmount(order.getTotalAmount())
                .commission(commission)
                .executedAt(Instant.now())
                .build();
    }
    
    @Transactional
    public void updateHoldingsAndPortfolio(UUID userId, String symbol, Order.OrderSide side, 
                                         BigDecimal quantity, BigDecimal price, BigDecimal commission) {
        
        // Update or create holding
        Optional<Holding> existingHolding = holdingRepository.findByUserIdAndSymbol(userId, symbol);
        Holding holding;
        
        if (existingHolding.isPresent()) {
            holding = existingHolding.get();
            updateExistingHolding(holding, side, quantity, price, commission);
        } else {
            holding = createNewHolding(userId, symbol, side, quantity, price, commission);
        }
        
        holdingRepository.save(holding);
        
        // Update portfolio
        updatePortfolio(userId, side, quantity.multiply(price).add(commission));
    }
    
    private void updateExistingHolding(Holding holding, Order.OrderSide side, BigDecimal quantity, 
                                     BigDecimal price, BigDecimal commission) {
        if (side == Order.OrderSide.BUY) {
            BigDecimal newQuantity = holding.getQuantity().add(quantity);
            BigDecimal newTotalCost = holding.getTotalCost().add(quantity.multiply(price)).add(commission);
            BigDecimal newAverageCost = newTotalCost.divide(newQuantity, 8, RoundingMode.HALF_UP);
            
            holding.setQuantity(newQuantity);
            holding.setTotalCost(newTotalCost);
            holding.setAverageCost(newAverageCost);
        } else {
            BigDecimal newQuantity = holding.getQuantity().subtract(quantity);
            if (newQuantity.compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException("Insufficient holdings");
            }
            
            BigDecimal costReduction = holding.getTotalCost().multiply(quantity).divide(holding.getQuantity(), 8, RoundingMode.HALF_UP);
            BigDecimal newTotalCost = holding.getTotalCost().subtract(costReduction);
            BigDecimal newAverageCost = newQuantity.compareTo(BigDecimal.ZERO) > 0 ? 
                    newTotalCost.divide(newQuantity, 8, RoundingMode.HALF_UP) : BigDecimal.ZERO;
            
            holding.setQuantity(newQuantity);
            holding.setTotalCost(newTotalCost);
            holding.setAverageCost(newAverageCost);
        }
        
        holding.setMarketValue(holding.getQuantity().multiply(price));
        holding.setUnrealizedPnl(holding.getMarketValue().subtract(holding.getTotalCost()));
    }
    
    private Holding createNewHolding(UUID userId, String symbol, Order.OrderSide side, 
                                   BigDecimal quantity, BigDecimal price, BigDecimal commission) {
        if (side == Order.OrderSide.SELL) {
            throw new RuntimeException("Cannot create new holding for sell order");
        }
        
        BigDecimal totalCost = quantity.multiply(price).add(commission);
        BigDecimal averageCost = totalCost.divide(quantity, 8, RoundingMode.HALF_UP);
        
        return Holding.builder()
                .userId(userId)
                .symbol(symbol)
                .quantity(quantity)
                .averageCost(averageCost)
                .totalCost(totalCost)
                .marketValue(quantity.multiply(price))
                .unrealizedPnl(quantity.multiply(price).subtract(totalCost))
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }
    
    private void updatePortfolio(UUID userId, Order.OrderSide side, BigDecimal amount) {
        Portfolio portfolio = portfolioRepository.findByUserId(userId)
                .orElseGet(() -> Portfolio.builder()
                        .userId(userId)
                        .virtualBalance(BigDecimal.valueOf(10000))
                        .totalInvested(BigDecimal.ZERO)
                        .totalMarketValue(BigDecimal.ZERO)
                        .totalPnl(BigDecimal.ZERO)
                        .totalPnlPercentage(BigDecimal.ZERO)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build());
        
        if (side == Order.OrderSide.BUY) {
            portfolio.setVirtualBalance(portfolio.getVirtualBalance().subtract(amount));
            portfolio.setTotalInvested(portfolio.getTotalInvested().add(amount));
        } else {
            portfolio.setVirtualBalance(portfolio.getVirtualBalance().add(amount));
            portfolio.setTotalInvested(portfolio.getTotalInvested().subtract(amount));
        }
        
        // Update total market value and PnL
        updatePortfolioValues(portfolio, userId);
        
        portfolioRepository.save(portfolio);
    }
    
    private void updatePortfolioValues(Portfolio portfolio, UUID userId) {
        BigDecimal totalMarketValue = holdingRepository.getTotalMarketValueByUserId(userId);
        if (totalMarketValue == null) {
            totalMarketValue = BigDecimal.ZERO;
        }
        
        portfolio.setTotalMarketValue(totalMarketValue);
        
        BigDecimal totalPnl = totalMarketValue.add(portfolio.getVirtualBalance()).subtract(BigDecimal.valueOf(10000));
        portfolio.setTotalPnl(totalPnl);
        
        if (portfolio.getTotalInvested().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal pnlPercentage = totalPnl.divide(portfolio.getTotalInvested(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            portfolio.setTotalPnlPercentage(pnlPercentage);
        } else {
            portfolio.setTotalPnlPercentage(BigDecimal.ZERO);
        }
    }
    
    @Transactional
    public OrderResponse createLimitOrder(UUID userId, PlaceOrderDto dto) {
        log.info("Creating limit order for user {}: {} {} {} at price {}", 
                userId, dto.getSide(), dto.getQuantity(), dto.getSymbol(), dto.getPrice());
        
        try {
            validateLimitOrder(dto);
            
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
            
            auditService.logRequest(UUID.randomUUID(), userId, "/api/orders/limit", null);
            
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
        
        BigDecimal commission = order.getTotalAmount().multiply(COMMISSION_RATE);
        
        order.setStatus(Order.OrderStatus.FILLED);
        order.setFilledQuantity(order.getQuantity());
        order.setAveragePrice(fillPrice);
        order.setUpdatedAt(Instant.now());
        
        orderRepository.save(order);
        
        Trade trade = createTrade(order, fillPrice, commission);
        tradeRepository.save(trade);
        
        updateHoldingsAndPortfolio(order.getUserId(), order.getSymbol(), order.getSide(), 
                                 order.getQuantity(), fillPrice, commission);
        
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
}
