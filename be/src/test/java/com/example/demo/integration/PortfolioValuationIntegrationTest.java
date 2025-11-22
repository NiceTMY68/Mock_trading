package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.dto.PlaceOrderDto;
import com.example.demo.entity.Holding;
import com.example.demo.entity.Order;
import com.example.demo.entity.Portfolio;
import com.example.demo.entity.PriceSnapshot;
import com.example.demo.entity.User;
import com.example.demo.repository.*;
import com.example.demo.service.OrderService;
import com.example.demo.service.PortfolioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class PortfolioValuationIntegrationTest extends IntegrationTestBase {
    
    @Autowired
    private OrderService orderService;
    
    @Autowired
    private PortfolioService portfolioService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private OrderRepository orderRepository;
    
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
    private static final BigDecimal BTC_PRICE_1 = BigDecimal.valueOf(50000);
    private static final BigDecimal BTC_PRICE_2 = BigDecimal.valueOf(55000);
    private static final BigDecimal BTC_PRICE_3 = BigDecimal.valueOf(60000);
    
    @BeforeEach
    void setUp() {
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
    void sequentialBuys_ShouldCalculateCorrectAverageCost() {
        PriceSnapshot price1 = createPriceSnapshot("BTCUSDT", BTC_PRICE_1);
        priceSnapshotRepository.save(price1);
        
        BigDecimal qty1 = BigDecimal.valueOf(0.05);
        PlaceOrderDto buy1 = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(qty1)
                .build();
        orderService.placeMarketOrder(testUser.getId(), buy1);
        
        Optional<Holding> holding1 = holdingRepository.findByUserIdAndSymbol(testUser.getId(), "BTCUSDT");
        assertThat(holding1).isPresent();
        BigDecimal expectedCost1 = qty1.multiply(BTC_PRICE_1).multiply(new BigDecimal("1.001"));
        assertThat(holding1.get().getAverageCost()).isEqualByComparingTo(expectedCost1.divide(qty1, 8, java.math.RoundingMode.HALF_UP));
        assertThat(holding1.get().getQuantity()).isEqualByComparingTo(qty1);
        
        PriceSnapshot price2 = createPriceSnapshot("BTCUSDT", BTC_PRICE_2);
        priceSnapshotRepository.save(price2);
        
        BigDecimal qty2 = BigDecimal.valueOf(0.05);
        PlaceOrderDto buy2 = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(qty2)
                .build();
        orderService.placeMarketOrder(testUser.getId(), buy2);
        
        Optional<Holding> holding2 = holdingRepository.findByUserIdAndSymbol(testUser.getId(), "BTCUSDT");
        assertThat(holding2).isPresent();
        BigDecimal totalQty = qty1.add(qty2);
        BigDecimal totalCost1 = qty1.multiply(BTC_PRICE_1).multiply(new BigDecimal("1.001"));
        BigDecimal totalCost2 = qty2.multiply(BTC_PRICE_2).multiply(new BigDecimal("1.001"));
        BigDecimal expectedAverageCost = totalCost1.add(totalCost2).divide(totalQty, 8, java.math.RoundingMode.HALF_UP);
        
        assertThat(holding2.get().getQuantity()).isEqualByComparingTo(totalQty);
        assertThat(holding2.get().getAverageCost()).isEqualByComparingTo(expectedAverageCost);
    }
    
    @Test
    void sequentialBuysAndSell_ShouldUpdateHoldingCorrectly() {
        PriceSnapshot price1 = createPriceSnapshot("BTCUSDT", BTC_PRICE_1);
        priceSnapshotRepository.save(price1);
        
        BigDecimal qty1 = BigDecimal.valueOf(0.1);
        PlaceOrderDto buy1 = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(qty1)
                .build();
        orderService.placeMarketOrder(testUser.getId(), buy1);
        
        PriceSnapshot price2 = createPriceSnapshot("BTCUSDT", BTC_PRICE_2);
        priceSnapshotRepository.save(price2);
        
        BigDecimal qty2 = BigDecimal.valueOf(0.05);
        PlaceOrderDto buy2 = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(qty2)
                .build();
        orderService.placeMarketOrder(testUser.getId(), buy2);
        
        Optional<Holding> holdingAfterBuys = holdingRepository.findByUserIdAndSymbol(testUser.getId(), "BTCUSDT");
        assertThat(holdingAfterBuys).isPresent();
        BigDecimal totalQty = qty1.add(qty2);
        assertThat(holdingAfterBuys.get().getQuantity()).isEqualByComparingTo(totalQty);
        
        BigDecimal sellQty = BigDecimal.valueOf(0.05);
        PriceSnapshot price3 = createPriceSnapshot("BTCUSDT", BTC_PRICE_3);
        priceSnapshotRepository.save(price3);
        
        PlaceOrderDto sell = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.SELL)
                .type(Order.OrderType.MARKET)
                .quantity(sellQty)
                .build();
        orderService.placeMarketOrder(testUser.getId(), sell);
        
        Optional<Holding> holdingAfterSell = holdingRepository.findByUserIdAndSymbol(testUser.getId(), "BTCUSDT");
        assertThat(holdingAfterSell).isPresent();
        assertThat(holdingAfterSell.get().getQuantity()).isEqualByComparingTo(totalQty.subtract(sellQty));
        
        BigDecimal remainingQty = totalQty.subtract(sellQty);
        assertThat(holdingAfterSell.get().getQuantity()).isEqualByComparingTo(remainingQty);
    }
    
    @Test
    void recalculate_ShouldUpdatePortfolioMetrics() {
        PriceSnapshot price1 = createPriceSnapshot("BTCUSDT", BTC_PRICE_1);
        priceSnapshotRepository.save(price1);
        
        BigDecimal qty = BigDecimal.valueOf(0.1);
        PlaceOrderDto buy = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(qty)
                .build();
        orderService.placeMarketOrder(testUser.getId(), buy);
        
        PriceSnapshot newPrice = createPriceSnapshot("BTCUSDT", BTC_PRICE_3);
        priceSnapshotRepository.save(newPrice);
        
        portfolioService.recalculate(testUser.getId());
        
        Portfolio portfolio = portfolioRepository.findByUserId(testUser.getId()).orElseThrow();
        
        BigDecimal expectedMarketValue = qty.multiply(BTC_PRICE_3);
        assertThat(portfolio.getTotalMarketValue()).isEqualByComparingTo(expectedMarketValue);
        
        BigDecimal expectedPnl = portfolio.getTotalMarketValue()
                .add(portfolio.getVirtualBalance())
                .subtract(INITIAL_BALANCE);
        assertThat(portfolio.getTotalPnl()).isEqualByComparingTo(expectedPnl);
        
        if (portfolio.getTotalInvested().compareTo(BigDecimal.ZERO) > 0) {
            assertThat(portfolio.getTotalPnlPercentage()).isNotNull();
        }
    }
    
    @Test
    void multipleSymbols_ShouldCalculatePortfolioCorrectly() {
        PriceSnapshot btcPrice = createPriceSnapshot("BTCUSDT", BTC_PRICE_1);
        priceSnapshotRepository.save(btcPrice);
        
        PriceSnapshot ethPrice = createPriceSnapshot("ETHUSDT", BigDecimal.valueOf(3000));
        priceSnapshotRepository.save(ethPrice);
        
        PlaceOrderDto buyBtc = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(BigDecimal.valueOf(0.1))
                .build();
        orderService.placeMarketOrder(testUser.getId(), buyBtc);
        
        PlaceOrderDto buyEth = PlaceOrderDto.builder()
                .symbol("ETHUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(BigDecimal.valueOf(1.0))
                .build();
        orderService.placeMarketOrder(testUser.getId(), buyEth);
        
        PriceSnapshot newBtcPrice = createPriceSnapshot("BTCUSDT", BTC_PRICE_3);
        priceSnapshotRepository.save(newBtcPrice);
        
        PriceSnapshot newEthPrice = createPriceSnapshot("ETHUSDT", BigDecimal.valueOf(3500));
        priceSnapshotRepository.save(newEthPrice);
        
        portfolioService.recalculate(testUser.getId());
        
        Portfolio portfolio = portfolioRepository.findByUserId(testUser.getId()).orElseThrow();
        
        BigDecimal expectedBtcValue = BigDecimal.valueOf(0.1).multiply(BTC_PRICE_3);
        BigDecimal expectedEthValue = BigDecimal.valueOf(1.0).multiply(BigDecimal.valueOf(3500));
        BigDecimal expectedTotalMarketValue = expectedBtcValue.add(expectedEthValue);
        
        assertThat(portfolio.getTotalMarketValue()).isEqualByComparingTo(expectedTotalMarketValue);
    }
    
    private PriceSnapshot createPriceSnapshot(String symbol, BigDecimal price) {
        return PriceSnapshot.builder()
                .coinSymbol(symbol)
                .timestamp(Instant.now())
                .close(price)
                .open(price)
                .high(price)
                .low(price)
                .volume(BigDecimal.ONE)
                .build();
    }
}

