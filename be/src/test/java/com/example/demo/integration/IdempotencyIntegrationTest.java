package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.dto.PlaceOrderDto;
import com.example.demo.entity.IdempotencyKey;
import com.example.demo.entity.Order;
import com.example.demo.entity.Portfolio;
import com.example.demo.entity.PriceSnapshot;
import com.example.demo.entity.Subscription;
import com.example.demo.entity.User;
import com.example.demo.repository.IdempotencyKeyRepository;
import com.example.demo.repository.OrderRepository;
import com.example.demo.repository.PortfolioRepository;
import com.example.demo.repository.PriceSnapshotRepository;
import com.example.demo.repository.SubscriptionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "security.require-ssl=false",
    "app.idempotency.expiry-hours=24"
})
class IdempotencyIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private IdempotencyKeyRepository idempotencyKeyRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private PriceSnapshotRepository priceSnapshotRepository;

    @Autowired
    private PortfolioRepository portfolioRepository;

    private User testUser;
    private String testPassword = "password123";
    private String idempotencyKey;

    @BeforeEach
    void setUp() {
        orderRepository.deleteAll();
        idempotencyKeyRepository.deleteAll();
        priceSnapshotRepository.deleteAll();
        portfolioRepository.deleteAll();
        subscriptionRepository.deleteAll();
        userRepository.deleteAll();

        testUser = User.builder()
                .email("trader@test.com")
                .passwordHash(passwordEncoder.encode(testPassword))
                .fullName("Test Trader")
                .role("PRO")
                .enabled(true)
                .emailVerified(true)
                .build();
        testUser = userRepository.save(testUser);

        Subscription subscription = Subscription.builder()
                .userId(testUser.getId())
                .planId("pro")
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plusSeconds(86400))
                .createdAt(Instant.now())
                .build();
        subscriptionRepository.save(subscription);

        Portfolio portfolio = Portfolio.builder()
                .userId(testUser.getId())
                .virtualBalance(new BigDecimal("10000"))
                .totalMarketValue(BigDecimal.ZERO)
                .totalPnl(BigDecimal.ZERO)
                .build();
        portfolioRepository.save(portfolio);

        seedPriceData();

        idempotencyKey = UUID.randomUUID().toString();
    }

    private void seedPriceData() {
        Instant now = Instant.now();
        PriceSnapshot snapshot = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(now)
                .open(new BigDecimal("50000.00"))
                .high(new BigDecimal("51000.00"))
                .low(new BigDecimal("49000.00"))
                .close(new BigDecimal("50000.00"))
                .volume(new BigDecimal("1000"))
                .build();
        priceSnapshotRepository.save(snapshot);
    }

    @Test
    void placeOrder_WithIdempotencyKey_ShouldReturnSameResponseOnRetry() throws Exception {
        PlaceOrderDto orderDto = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(BigDecimal.valueOf(0.001))
                .build();

        String token = jwtUtil.generateToken(testUser);

        String firstResponse = mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(orderDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderId").exists())
                .andExpect(header().doesNotExist("X-Idempotency-Replayed"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        UUID firstOrderId = extractOrderId(firstResponse);

        String secondResponse = mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(orderDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderId").value(firstOrderId.toString()))
                .andExpect(header().string("X-Idempotency-Replayed", "true"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        UUID secondOrderId = extractOrderId(secondResponse);

        assertThat(secondOrderId).isEqualTo(firstOrderId);

        long orderCount = orderRepository.count();
        assertThat(orderCount).isEqualTo(1);

        IdempotencyKey savedKey = idempotencyKeyRepository.findByKey(idempotencyKey)
                .orElseThrow(() -> new AssertionError("Idempotency key should be saved"));
        assertThat(savedKey.getUserId()).isEqualTo(testUser.getId());
        assertThat(savedKey.getEndpoint()).isEqualTo("/api/orders");
        assertThat(savedKey.getStatusCode()).isEqualTo(200);
        assertThat(savedKey.getResponseBody()).isNotNull();
    }

    @Test
    void placeOrder_WithoutIdempotencyKey_ShouldCreateNewOrder() throws Exception {
        PlaceOrderDto orderDto = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(BigDecimal.valueOf(0.001))
                .build();

        String token = jwtUtil.generateToken(testUser);

        mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(orderDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(header().doesNotExist("X-Idempotency-Replayed"));

        long orderCount = orderRepository.count();
        assertThat(orderCount).isEqualTo(1);
    }

    @Test
    void placeOrder_WithDifferentIdempotencyKey_ShouldCreateNewOrder() throws Exception {
        PlaceOrderDto orderDto = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(BigDecimal.valueOf(0.001))
                .build();

        String token = jwtUtil.generateToken(testUser);

        String firstKey = UUID.randomUUID().toString();
        String secondKey = UUID.randomUUID().toString();

        mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", firstKey)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(orderDto)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + token)
                        .header("Idempotency-Key", secondKey)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(orderDto)))
                .andExpect(status().isOk());

        long orderCount = orderRepository.count();
        assertThat(orderCount).isEqualTo(2);
    }

    private UUID extractOrderId(String response) throws Exception {
        com.fasterxml.jackson.databind.JsonNode jsonNode = objectMapper.readTree(response);
        String orderIdStr = jsonNode.get("data").get("orderId").asText();
        return UUID.fromString(orderIdStr);
    }
}

