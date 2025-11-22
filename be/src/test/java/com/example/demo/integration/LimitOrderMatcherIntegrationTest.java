package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.dto.OrderResponse;
import com.example.demo.dto.PlaceOrderDto;
import com.example.demo.entity.Holding;
import com.example.demo.entity.Order;
import com.example.demo.entity.Portfolio;
import com.example.demo.entity.PriceSnapshot;
import com.example.demo.entity.Trade;
import com.example.demo.entity.User;
import com.example.demo.repository.*;
import com.example.demo.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class LimitOrderMatcherIntegrationTest extends IntegrationTestBase {
    
    @Autowired
    private OrderService orderService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private TradeRepository tradeRepository;
    
    @Autowired
    private HoldingRepository holdingRepository;
    
    @Autowired
    private PortfolioRepository portfolioRepository;
    
    @Autowired
    private PriceSnapshotRepository priceSnapshotRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    private User testUser;
    private Portfolio testPortfolio;
    private static final BigDecimal INITIAL_BALANCE = BigDecimal.valueOf(10000);
    private static final BigDecimal BTC_PRICE_HIGH = BigDecimal.valueOf(50000);
    private static final BigDecimal BTC_PRICE_LOW = BigDecimal.valueOf(45000);
    
    @BeforeEach
    void setUp() {
        tradeRepository.deleteAll();
        holdingRepository.deleteAll();
        orderRepository.deleteAll();
        portfolioRepository.deleteAll();
        priceSnapshotRepository.deleteAll();
        userRepository.deleteAll();
        
        testUser = User.builder()
                .email("trader@test.com")
                .passwordHash(passwordEncoder.encode("password"))
                .fullName("Test Trader")
                .role("USER")
                .enabled(true)
                .build();
        testUser = userRepository.save(testUser);
        
        testPortfolio = Portfolio.builder()
                .userId(testUser.getId())
                .virtualBalance(INITIAL_BALANCE)
                .totalInvested(BigDecimal.ZERO)
                .totalMarketValue(BigDecimal.ZERO)
                .totalPnl(BigDecimal.ZERO)
                .totalPnlPercentage(BigDecimal.ZERO)
                .build();
        testPortfolio = portfolioRepository.save(testPortfolio);
    }
    
    @Test
    void processPendingLimitOrders_BuyOrder_ShouldFillWhenPriceDrops() {
        BigDecimal quantity = BigDecimal.valueOf(0.1);
        BigDecimal limitPrice = BigDecimal.valueOf(48000);
        
        PlaceOrderDto dto = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.LIMIT)
                .quantity(quantity)
                .price(limitPrice)
                .build();
        
        OrderResponse response = orderService.createLimitOrder(testUser.getId(), dto);
        
        assertThat(response.getStatus()).isEqualTo(Order.OrderStatus.PENDING);
        assertThat(response.getPrice()).isEqualByComparingTo(limitPrice);
        
        Optional<Order> pendingOrder = orderRepository.findByOrderId(response.getOrderId());
        assertThat(pendingOrder).isPresent();
        assertThat(pendingOrder.get().getStatus()).isEqualTo(Order.OrderStatus.PENDING);
        
        PriceSnapshot highPriceSnapshot = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(Instant.now().minusSeconds(10))
                .close(BTC_PRICE_HIGH)
                .open(BTC_PRICE_HIGH)
                .high(BTC_PRICE_HIGH)
                .low(BTC_PRICE_HIGH)
                .volume(BigDecimal.ONE)
                .build();
        priceSnapshotRepository.save(highPriceSnapshot);
        
        orderService.processPendingLimitOrders();
        
        Optional<Order> orderAfterFirstCheck = orderRepository.findByOrderId(response.getOrderId());
        assertThat(orderAfterFirstCheck).isPresent();
        assertThat(orderAfterFirstCheck.get().getStatus()).isEqualTo(Order.OrderStatus.PENDING);
        
        PriceSnapshot lowPriceSnapshot = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(Instant.now())
                .close(BTC_PRICE_LOW)
                .open(BTC_PRICE_LOW)
                .high(BTC_PRICE_LOW)
                .low(BTC_PRICE_LOW)
                .volume(BigDecimal.ONE)
                .build();
        priceSnapshotRepository.save(lowPriceSnapshot);
        
        orderService.processPendingLimitOrders();
        
        Optional<Order> filledOrder = orderRepository.findByOrderId(response.getOrderId());
        assertThat(filledOrder).isPresent();
        assertThat(filledOrder.get().getStatus()).isEqualTo(Order.OrderStatus.FILLED);
        assertThat(filledOrder.get().getFilledQuantity()).isEqualByComparingTo(quantity);
        assertThat(filledOrder.get().getAveragePrice()).isEqualByComparingTo(BTC_PRICE_LOW);
        
        List<Trade> trades = tradeRepository.findByOrderId(filledOrder.get().getId());
        assertThat(trades).hasSize(1);
        
        Optional<Holding> holding = holdingRepository.findByUserIdAndSymbol(testUser.getId(), "BTCUSDT");
        assertThat(holding).isPresent();
        assertThat(holding.get().getQuantity()).isEqualByComparingTo(quantity);
    }
    
    @Test
    void processPendingLimitOrders_SellOrder_ShouldFillWhenPriceRises() {
        BigDecimal buyQuantity = BigDecimal.valueOf(0.2);
        
        PlaceOrderDto buyDto = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(buyQuantity)
                .build();
        
        PriceSnapshot initialPrice = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(Instant.now().minusSeconds(20))
                .close(BTC_PRICE_LOW)
                .open(BTC_PRICE_LOW)
                .high(BTC_PRICE_LOW)
                .low(BTC_PRICE_LOW)
                .volume(BigDecimal.ONE)
                .build();
        priceSnapshotRepository.save(initialPrice);
        
        orderService.placeMarketOrder(testUser.getId(), buyDto);
        
        BigDecimal sellQuantity = BigDecimal.valueOf(0.1);
        BigDecimal limitPrice = BigDecimal.valueOf(48000);
        
        PlaceOrderDto sellDto = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.SELL)
                .type(Order.OrderType.LIMIT)
                .quantity(sellQuantity)
                .price(limitPrice)
                .build();
        
        OrderResponse response = orderService.createLimitOrder(testUser.getId(), sellDto);
        assertThat(response.getStatus()).isEqualTo(Order.OrderStatus.PENDING);
        
        PriceSnapshot lowPriceSnapshot = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(Instant.now().minusSeconds(10))
                .close(BTC_PRICE_LOW)
                .open(BTC_PRICE_LOW)
                .high(BTC_PRICE_LOW)
                .low(BTC_PRICE_LOW)
                .volume(BigDecimal.ONE)
                .build();
        priceSnapshotRepository.save(lowPriceSnapshot);
        
        orderService.processPendingLimitOrders();
        
        Optional<Order> orderAfterFirstCheck = orderRepository.findByOrderId(response.getOrderId());
        assertThat(orderAfterFirstCheck).isPresent();
        assertThat(orderAfterFirstCheck.get().getStatus()).isEqualTo(Order.OrderStatus.PENDING);
        
        PriceSnapshot highPriceSnapshot = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(Instant.now())
                .close(BTC_PRICE_HIGH)
                .open(BTC_PRICE_HIGH)
                .high(BTC_PRICE_HIGH)
                .low(BTC_PRICE_HIGH)
                .volume(BigDecimal.ONE)
                .build();
        priceSnapshotRepository.save(highPriceSnapshot);
        
        orderService.processPendingLimitOrders();
        
        Optional<Order> filledOrder = orderRepository.findByOrderId(response.getOrderId());
        assertThat(filledOrder).isPresent();
        assertThat(filledOrder.get().getStatus()).isEqualTo(Order.OrderStatus.FILLED);
        assertThat(filledOrder.get().getFilledQuantity()).isEqualByComparingTo(sellQuantity);
        
        Optional<Holding> holding = holdingRepository.findByUserIdAndSymbol(testUser.getId(), "BTCUSDT");
        assertThat(holding).isPresent();
        assertThat(holding.get().getQuantity()).isEqualByComparingTo(buyQuantity.subtract(sellQuantity));
    }
    
    @Test
    void processPendingLimitOrders_ShouldNotFillWhenPriceNotMet() {
        BigDecimal quantity = BigDecimal.valueOf(0.1);
        BigDecimal limitPrice = BigDecimal.valueOf(45000);
        
        PlaceOrderDto dto = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.LIMIT)
                .quantity(quantity)
                .price(limitPrice)
                .build();
        
        OrderResponse response = orderService.createLimitOrder(testUser.getId(), dto);
        
        PriceSnapshot highPriceSnapshot = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(Instant.now())
                .close(BTC_PRICE_HIGH)
                .open(BTC_PRICE_HIGH)
                .high(BTC_PRICE_HIGH)
                .low(BTC_PRICE_HIGH)
                .volume(BigDecimal.ONE)
                .build();
        priceSnapshotRepository.save(highPriceSnapshot);
        
        orderService.processPendingLimitOrders();
        
        Optional<Order> order = orderRepository.findByOrderId(response.getOrderId());
        assertThat(order).isPresent();
        assertThat(order.get().getStatus()).isEqualTo(Order.OrderStatus.PENDING);
        
        List<Trade> trades = tradeRepository.findByOrderId(order.get().getId());
        assertThat(trades).isEmpty();
    }
}

