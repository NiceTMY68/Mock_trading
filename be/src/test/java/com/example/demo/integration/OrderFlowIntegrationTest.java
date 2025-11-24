package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.config.OrderSimulationProperties;
import com.example.demo.config.TestConfig;
import com.example.demo.dto.PlaceOrderDto;
import com.example.demo.entity.Order;
import com.example.demo.entity.Portfolio;
import com.example.demo.entity.PriceSnapshot;
import com.example.demo.entity.User;
import com.example.demo.repository.*;
import com.example.demo.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Transactional
@TestPropertySource(properties = {
    "order.simulation.slippage-percent=0.01",
    "order.simulation.default-liquidity-threshold=0"
})
@Import(TestConfig.class)
class OrderFlowIntegrationTest extends IntegrationTestBase {
    
    @Autowired
    private OrderService orderService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private PortfolioRepository portfolioRepository;
    
    @Autowired
    private HoldingRepository holdingRepository;
    
    @Autowired
    private TradeRepository tradeRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private PriceSnapshotRepository priceSnapshotRepository;

    @Autowired
    private OrderSimulationProperties orderSimulationProperties;
    
    private User testUser;
    private Portfolio testPortfolio;
    
    @BeforeEach
    void setUp() {
        priceSnapshotRepository.deleteAll();
        tradeRepository.deleteAll();
        holdingRepository.deleteAll();
        orderRepository.deleteAll();
        portfolioRepository.deleteAll();
        userRepository.deleteAll();
        
        testUser = User.builder()
            .email("trader@test.com")
            .passwordHash(passwordEncoder.encode("password"))
            .fullName("Test Trader")
            .role("PRO")
            .enabled(true)
            .build();
        testUser = userRepository.save(testUser);
        
        testPortfolio = Portfolio.builder()
            .userId(testUser.getId())
            .virtualBalance(BigDecimal.valueOf(10000))
            .totalMarketValue(BigDecimal.ZERO)
            .totalPnl(BigDecimal.ZERO)
            .build();
        testPortfolio = portfolioRepository.save(testPortfolio);
        
        seedPriceData();
    }
    
    private void seedPriceData() {
        java.time.Instant now = java.time.Instant.now();
        PriceSnapshot btcSnapshot = PriceSnapshot.builder()
            .coinSymbol("BTCUSDT")
            .timestamp(now)
            .open(BigDecimal.valueOf(50000))
            .high(BigDecimal.valueOf(51000))
            .low(BigDecimal.valueOf(49000))
            .close(BigDecimal.valueOf(50000))
            .volume(BigDecimal.valueOf(1000))
            .build();
        
        PriceSnapshot ethSnapshot = PriceSnapshot.builder()
            .coinSymbol("ETHUSDT")
            .timestamp(now)
            .open(BigDecimal.valueOf(3000))
            .high(BigDecimal.valueOf(3100))
            .low(BigDecimal.valueOf(2900))
            .close(BigDecimal.valueOf(3000))
            .volume(BigDecimal.valueOf(5000))
            .build();
        
        priceSnapshotRepository.save(btcSnapshot);
        priceSnapshotRepository.save(ethSnapshot);
    }
    
    @Test
    void placeMarketOrder_BuyOrder_ShouldExecuteImmediately() {
        PlaceOrderDto dto = PlaceOrderDto.builder()
            .symbol("BTCUSDT")
            .side(Order.OrderSide.BUY)
            .type(Order.OrderType.MARKET)
            .quantity(BigDecimal.valueOf(0.1))
            .build();
        
        var response = orderService.placeMarketOrder(testUser.getId(), dto);
        
        assertThat(response).isNotNull();
        assertThat(response.getOrderId()).isNotNull();
        assertThat(response.getStatus()).isEqualTo(Order.OrderStatus.FILLED);
        assertThat(response.getFilledQuantity()).isEqualByComparingTo(BigDecimal.valueOf(0.1));
        assertThat(response.getTotalAmount()).isGreaterThan(BigDecimal.ZERO);
        
        Order savedOrder = orderRepository.findByOrderId(response.getOrderId()).orElseThrow();
        assertThat(savedOrder.getStatus()).isEqualTo(Order.OrderStatus.FILLED);
        assertThat(savedOrder.getSymbol()).isEqualTo("BTCUSDT");
        
        var holding = holdingRepository.findByUserIdAndSymbol(testUser.getId(), "BTCUSDT");
        assertThat(holding).isPresent();
        assertThat(holding.get().getQuantity()).isEqualByComparingTo(BigDecimal.valueOf(0.1));
        
        var trades = tradeRepository.findByUserIdOrderByExecutedAtDesc(testUser.getId());
        assertThat(trades).isNotEmpty();
        assertThat(trades.get(0).getQuantity()).isEqualByComparingTo(BigDecimal.valueOf(0.1));
    }
    
    @Test
    void placeMarketOrder_SellOrder_ShouldReduceHolding() {
        PlaceOrderDto buyDto = PlaceOrderDto.builder()
            .symbol("ETHUSDT")
            .side(Order.OrderSide.BUY)
            .type(Order.OrderType.MARKET)
            .quantity(BigDecimal.valueOf(1.0))
            .build();
        orderService.placeMarketOrder(testUser.getId(), buyDto);
        
        PlaceOrderDto sellDto = PlaceOrderDto.builder()
            .symbol("ETHUSDT")
            .side(Order.OrderSide.SELL)
            .type(Order.OrderType.MARKET)
            .quantity(BigDecimal.valueOf(0.5))
            .build();
        
        var response = orderService.placeMarketOrder(testUser.getId(), sellDto);
        
        assertThat(response.getStatus()).isEqualTo(Order.OrderStatus.FILLED);
        assertThat(response.getFilledQuantity()).isEqualByComparingTo(BigDecimal.valueOf(0.5));
        
        var holding = holdingRepository.findByUserIdAndSymbol(testUser.getId(), "ETHUSDT");
        assertThat(holding).isPresent();
        assertThat(holding.get().getQuantity()).isEqualByComparingTo(BigDecimal.valueOf(0.5));
    }
    
    @Test
    void placeMarketOrder_SellWithoutHolding_ShouldFail() {
        PlaceOrderDto dto = PlaceOrderDto.builder()
            .symbol("BTCUSDT")
            .side(Order.OrderSide.SELL)
            .type(Order.OrderType.MARKET)
            .quantity(BigDecimal.valueOf(0.1))
            .build();
        
        assertThatThrownBy(() -> orderService.placeMarketOrder(testUser.getId(), dto))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Insufficient holdings");
    }

    @Test
    void placeMarketOrder_InvalidTickSize_ShouldReturnError() {
        PlaceOrderDto dto = PlaceOrderDto.builder()
            .symbol("BTCUSDT")
            .side(Order.OrderSide.BUY)
            .type(Order.OrderType.MARKET)
            .quantity(new BigDecimal("0.00015")) // not multiple of 0.0001
            .build();

        assertThatThrownBy(() -> orderService.placeMarketOrder(testUser.getId(), dto))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("tick size");
    }

    @Test
    void placeMarketOrder_WithSlippage_ShouldAdjustExecutionPrice() {
        PlaceOrderDto dto = PlaceOrderDto.builder()
            .symbol("BTCUSDT")
            .side(Order.OrderSide.BUY)
            .type(Order.OrderType.MARKET)
            .quantity(BigDecimal.valueOf(0.1))
            .build();

        var response = orderService.placeMarketOrder(testUser.getId(), dto);

        BigDecimal expectedPrice = BigDecimal.valueOf(50000)
            .multiply(BigDecimal.valueOf(1.01))
            .setScale(8);

        assertThat(response.getAveragePrice()).isEqualByComparingTo(expectedPrice);
        assertThat(response.getTotalAmount()).isEqualByComparingTo(
                response.getFilledQuantity().multiply(expectedPrice));
    }

    @Test
    void placeMarketOrder_PartialFill_ShouldCreatePendingResidualOrder() {
        orderSimulationProperties.getLiquidityThresholds().put("BTCUSDT", new BigDecimal("0.09"));
        try {
            PlaceOrderDto dto = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(new BigDecimal("0.18"))
                .keepRemainingOnPartialFill(true)
                .build();

            var response = orderService.placeMarketOrder(testUser.getId(), dto);

            assertThat(response.getStatus()).isEqualTo(Order.OrderStatus.PARTIALLY_FILLED);
            assertThat(response.getFilledQuantity()).isEqualByComparingTo(new BigDecimal("0.09"));
            assertThat(response.getMessage()).contains("pending");

            List<Order> orders = orderRepository.findAll();
            assertThat(orders).hasSize(2);

            Order filledOrder = orders.stream()
                .filter(o -> o.getStatus() == Order.OrderStatus.PARTIALLY_FILLED)
                .findFirst()
                .orElseThrow();
            Order pendingResidual = orders.stream()
                .filter(o -> o.getStatus() == Order.OrderStatus.PENDING)
                .findFirst()
                .orElseThrow();

            assertThat(filledOrder.getFilledQuantity()).isEqualByComparingTo(new BigDecimal("0.09"));
            assertThat(pendingResidual.getQuantity()).isEqualByComparingTo(new BigDecimal("0.09"));
            assertThat(pendingResidual.getType()).isEqualTo(Order.OrderType.LIMIT);
        } finally {
            orderSimulationProperties.getLiquidityThresholds().remove("BTCUSDT");
        }
    }
    
    @Test
    void createLimitOrder_ShouldCreatePendingOrder() {
        PlaceOrderDto dto = PlaceOrderDto.builder()
            .symbol("BTCUSDT")
            .side(Order.OrderSide.BUY)
            .type(Order.OrderType.LIMIT)
            .quantity(BigDecimal.valueOf(0.1))
            .price(BigDecimal.valueOf(30000))
            .build();
        
        var response = orderService.createLimitOrder(testUser.getId(), dto);
        
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(Order.OrderStatus.PENDING);
        assertThat(response.getPrice()).isEqualByComparingTo(BigDecimal.valueOf(30000));
        assertThat(response.getFilledQuantity()).isEqualByComparingTo(BigDecimal.ZERO);
        
        Order savedOrder = orderRepository.findByOrderId(response.getOrderId()).orElseThrow();
        assertThat(savedOrder.getStatus()).isEqualTo(Order.OrderStatus.PENDING);
    }
    
    @Test
    void cancelOrder_PendingLimitOrder_ShouldSucceed() {
        PlaceOrderDto dto = PlaceOrderDto.builder()
            .symbol("BTCUSDT")
            .side(Order.OrderSide.BUY)
            .type(Order.OrderType.LIMIT)
            .quantity(BigDecimal.valueOf(0.1))
            .price(BigDecimal.valueOf(30000))
            .build();
        
        var orderResponse = orderService.createLimitOrder(testUser.getId(), dto);
        
        orderService.cancelOrder(testUser.getId(), orderResponse.getOrderId());
        
        Order canceledOrder = orderRepository.findByOrderId(orderResponse.getOrderId()).orElseThrow();
        assertThat(canceledOrder.getStatus()).isEqualTo(Order.OrderStatus.CANCELLED);
    }
    
    @Test
    void placeMultipleOrders_ShouldUpdatePortfolio() {
        PlaceOrderDto buy1 = PlaceOrderDto.builder()
            .symbol("BTCUSDT")
            .side(Order.OrderSide.BUY)
            .type(Order.OrderType.MARKET)
            .quantity(BigDecimal.valueOf(0.1))
            .build();
        orderService.placeMarketOrder(testUser.getId(), buy1);
        
        PlaceOrderDto buy2 = PlaceOrderDto.builder()
            .symbol("ETHUSDT")
            .side(Order.OrderSide.BUY)
            .type(Order.OrderType.MARKET)
            .quantity(BigDecimal.valueOf(1.0))
            .build();
        orderService.placeMarketOrder(testUser.getId(), buy2);
        
        var holdings = holdingRepository.findByUserIdOrderBySymbol(testUser.getId());
        assertThat(holdings).hasSize(2);
        
        Portfolio portfolio = portfolioRepository.findByUserId(testUser.getId()).orElseThrow();
        assertThat(portfolio.getVirtualBalance()).isLessThan(BigDecimal.valueOf(10000));
        
        var orders = orderRepository.findByUserIdOrderByCreatedAtDesc(testUser.getId());
        assertThat(orders).hasSize(2);
        assertThat(orders).allMatch(o -> o.getStatus() == Order.OrderStatus.FILLED);
    }
}
