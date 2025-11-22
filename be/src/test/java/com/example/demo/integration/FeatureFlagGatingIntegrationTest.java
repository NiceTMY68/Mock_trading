package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.dto.BacktestRequest;
import com.example.demo.dto.PlaceOrderDto;
import com.example.demo.entity.Order;
import com.example.demo.entity.Subscription;
import com.example.demo.entity.User;
import com.example.demo.repository.SubscriptionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
public class FeatureFlagGatingIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    private User freeUser;
    private User premiumUser;
    private String freeUserToken;
    private String premiumUserToken;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        subscriptionRepository.deleteAll();

        freeUser = User.builder()
                .email("free@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .fullName("Free User")
                .role("USER")
                .enabled(true)
                .build();
        userRepository.save(freeUser);
        freeUserToken = jwtUtil.generateToken(freeUser);

        premiumUser = User.builder()
                .email("premium@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .fullName("Premium User")
                .role("USER")
                .enabled(true)
                .build();
        userRepository.save(premiumUser);

        Subscription premiumSubscription = Subscription.builder()
                .userId(premiumUser.getId())
                .planId("pro")
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plusSeconds(86400))
                .createdAt(Instant.now())
                .build();
        subscriptionRepository.save(premiumSubscription);

        premiumUserToken = jwtUtil.generateToken(premiumUser);
    }

    @Test
    void backtestEndpoint_ShouldReturn403_WhenUserWithoutSubscription() throws Exception {
        BacktestRequest request = BacktestRequest.builder()
                .symbol("BTCUSDT")
                .start(Instant.parse("2024-01-01T00:00:00Z"))
                .end(Instant.parse("2024-01-31T23:59:59Z"))
                .strategy(Map.of("fast", 20, "slow", 50))
                .build();

        mockMvc.perform(post("/api/backtest")
                        .header("Authorization", "Bearer " + freeUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Backtesting requires premium subscription"));
    }

    @Test
    void backtestEndpoint_ShouldNotReturn403_WhenUserWithPremiumSubscription() throws Exception {
        BacktestRequest request = BacktestRequest.builder()
                .symbol("BTCUSDT")
                .start(Instant.parse("2024-01-01T00:00:00Z"))
                .end(Instant.parse("2024-01-31T23:59:59Z"))
                .strategy(Map.of("fast", 20, "slow", 50))
                .build();

        int statusCode = mockMvc.perform(post("/api/backtest")
                        .header("Authorization", "Bearer " + premiumUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn()
                .getResponse()
                .getStatus();

        assertThat(statusCode).isNotEqualTo(403);
    }

    @Test
    void placeOrderEndpoint_ShouldReturn403_WhenUserWithoutSubscription() throws Exception {
        PlaceOrderDto orderDto = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(java.math.BigDecimal.valueOf(0.001))
                .build();

        mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + freeUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderDto)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Trading requires premium subscription"));
    }

    @Test
    void placeOrderEndpoint_ShouldNotReturn403_WhenUserWithPremiumSubscription() throws Exception {
        PlaceOrderDto orderDto = PlaceOrderDto.builder()
                .symbol("BTCUSDT")
                .side(Order.OrderSide.BUY)
                .type(Order.OrderType.MARKET)
                .quantity(java.math.BigDecimal.valueOf(0.001))
                .build();

        int statusCode = mockMvc.perform(post("/api/orders")
                        .header("Authorization", "Bearer " + premiumUserToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(orderDto)))
                .andReturn()
                .getResponse()
                .getStatus();

        assertThat(statusCode).isNotEqualTo(403);
    }

    @Test
    void websocketSubscribeEndpoint_ShouldReturn403_WhenUserWithoutSubscription() throws Exception {
        mockMvc.perform(post("/api/v1/binance/websocket/subscribe/BTCUSDT/trade")
                        .header("Authorization", "Bearer " + freeUserToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Streaming data requires premium subscription"));
    }

    @Test
    void websocketSubscribeEndpoint_ShouldNotReturn403_WhenUserWithPremiumSubscription() throws Exception {
        int statusCode = mockMvc.perform(post("/api/v1/binance/websocket/subscribe/BTCUSDT/trade")
                        .header("Authorization", "Bearer " + premiumUserToken))
                .andReturn()
                .getResponse()
                .getStatus();

        assertThat(statusCode).isNotEqualTo(403);
    }
}

