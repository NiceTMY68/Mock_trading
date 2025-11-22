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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class MarketOrderIntegrationTest extends IntegrationTestBase {
    
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
    private static final BigDecimal BTC_PRICE = BigDecimal.valueOf(50000);
    
    @BeforeEach
    void setUp() {
        // Clean up
        tradeRepository.deleteAll();
        holdingRepository.deleteAll();
        orderRepository.deleteAll();
        portfolioRepository.deleteAll();
        priceSnapshotRepository.deleteAll();
        userRepository.deleteAll();
        
        // Create test user
        testUser = User.builder()
                .email("trader@test.com")
                .passwordHash(passwordEncoder.encode("password"))
                .fullName("Test Trader")
                .role("USER")
                .enabled(true)
                .build();
        testUser = userRepository.save(testUser);
        
        // Create portfolio with initial balance
        testPortfolio = Portfolio.builder()
                .userId(testUser.getId())
                .virtualBalance(INITIAL_BALANCE)
                .totalInvested(BigDecimal.ZERO)
                .totalMarketValue(BigDecimal.ZERO)
                .totalPnl(BigDecimal.ZERO)
                .totalPnlPercentage(BigDecimal.ZERO)
                .build();
        testPortfolio = portfolioRepository.save(testPortfolio);
        
        // Create price snapshot for BTC
        PriceSnapshot snapshot = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(Instant.now())
                .close(BTC_PRICE)
                .open(BTC_PRICE)
                .high(BTC_PRICE)
                .low(BTC_PRICE)
                .volume(BigDecimal.ONE)
                .build();
        priceSnapshotRepository.save(snapshot);
    }
    
    @Test
    void placeMarketOrder_BuyOrder_ShouldUpdateBalanceAndHoldings() {
        BigDecimal quantity = BigDecimal.valueOf(0.1);
        PlaceOrderDto dto = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(quantity)
                .build();
        
        // Place order
        OrderResponse response = orderService.placeMarketOrder(testUser.getId(), dto);
        
        // Verify order
        assertThat(response).isNotNull();
        assertThat(response.getOrderId()).isNotNull();
        assertThat(response.getStatus()).isEqualTo(Order.OrderStatus.FILLED);
        assertThat(response.getSymbol()).isEqualTo("BTCUSDT");
        assertThat(response.getSide()).isEqualTo(Order.OrderSide.BUY);
        assertThat(response.getQuantity()).isEqualByComparingTo(quantity);
        assertThat(response.getFilledQuantity()).isEqualByComparingTo(quantity);
        assertThat(response.getCommission()).isGreaterThan(BigDecimal.ZERO);
        
        // Verify order in database
        Optional<Order> savedOrder = orderRepository.findByOrderId(response.getOrderId());
        assertThat(savedOrder).isPresent();
        assertThat(savedOrder.get().getStatus()).isEqualTo(Order.OrderStatus.FILLED);
        
        // Verify trade was created
        List<Trade> trades = tradeRepository.findByOrderId(savedOrder.get().getId());
        assertThat(trades).hasSize(1);
        Trade trade = trades.get(0);
        assertThat(trade.getSymbol()).isEqualTo("BTCUSDT");
        assertThat(trade.getSide()).isEqualTo(Order.OrderSide.BUY);
        assertThat(trade.getQuantity()).isEqualByComparingTo(quantity);
        
        // Verify holding was created/updated
        Optional<Holding> holding = holdingRepository.findByUserIdAndSymbol(testUser.getId(), "BTCUSDT");
        assertThat(holding).isPresent();
        assertThat(holding.get().getQuantity()).isEqualByComparingTo(quantity);
        assertThat(holding.get().getTotalCost()).isGreaterThan(BigDecimal.ZERO);
        assertThat(holding.get().getAverageCost()).isGreaterThan(BigDecimal.ZERO);
        
        // Verify portfolio balance was deducted
        Portfolio updatedPortfolio = portfolioRepository.findByUserId(testUser.getId()).orElseThrow();
        assertThat(updatedPortfolio.getVirtualBalance())
                .isLessThan(INITIAL_BALANCE);
        assertThat(updatedPortfolio.getTotalInvested()).isGreaterThan(BigDecimal.ZERO);
    }
    
    @Test
    void placeMarketOrder_SellOrder_ShouldUpdateBalanceAndHoldings() {
        // First, buy some BTC with smaller quantity to leave balance for sell test
        BigDecimal buyQuantity = BigDecimal.valueOf(0.1);
        PlaceOrderDto buyDto = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(buyQuantity)
                .build();
        orderService.placeMarketOrder(testUser.getId(), buyDto);
        
        // Get balance after buy
        Portfolio portfolioAfterBuy = portfolioRepository.findByUserId(testUser.getId()).orElseThrow();
        BigDecimal balanceAfterBuy = portfolioAfterBuy.getVirtualBalance();
        
        // Now sell half
        BigDecimal sellQuantity = BigDecimal.valueOf(0.05);
        PlaceOrderDto sellDto = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.SELL)
                .type(Order.OrderType.MARKET)
                .quantity(sellQuantity)
                .build();
        
        OrderResponse response = orderService.placeMarketOrder(testUser.getId(), sellDto);
        
        // Verify order
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(Order.OrderStatus.FILLED);
        assertThat(response.getSide()).isEqualTo(Order.OrderSide.SELL);
        
        // Verify holding was reduced
        Optional<Holding> updatedHolding = holdingRepository.findByUserIdAndSymbol(testUser.getId(), "BTCUSDT");
        assertThat(updatedHolding).isPresent();
        assertThat(updatedHolding.get().getQuantity()).isEqualByComparingTo(buyQuantity.subtract(sellQuantity));
        
        // Verify portfolio balance increased (from sell proceeds)
        Portfolio updatedPortfolio = portfolioRepository.findByUserId(testUser.getId()).orElseThrow();
        // Balance should be higher than after the buy (we got money back from selling)
        assertThat(updatedPortfolio.getVirtualBalance()).isGreaterThan(balanceAfterBuy);
    }
    
    @Test
    void placeMarketOrder_InsufficientFunds_ShouldThrowException() {
        // Try to buy more than we can afford
        BigDecimal expensiveQuantity = BigDecimal.valueOf(1.0); // 1 BTC = $50,000 > $10,000
        PlaceOrderDto dto = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(expensiveQuantity)
                .build();
        
        assertThatThrownBy(() -> orderService.placeMarketOrder(testUser.getId(), dto))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Insufficient funds");
    }
}

