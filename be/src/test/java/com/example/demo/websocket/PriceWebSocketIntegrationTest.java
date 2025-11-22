package com.example.demo.websocket;

import com.example.demo.dto.KlinePointDto;
import com.example.demo.entity.PriceSnapshot;
import com.example.demo.entity.Subscription;
import com.example.demo.entity.User;
import com.example.demo.repository.SubscriptionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.PriceWebSocketService;
import com.example.demo.util.JwtUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.lang.NonNull;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.math.BigDecimal;
import java.net.URI;
import java.time.Instant;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PriceWebSocketIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PriceWebSocketService priceWebSocketService;

    private WebSocketSession activeSession;

    @AfterEach
    void tearDown() throws Exception {
        if (activeSession != null && activeSession.isOpen()) {
            activeSession.close();
        }
        subscriptionRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @SuppressWarnings("removal")
    void websocketClientShouldSubscribeAndReceivePriceUpdates() throws Exception {
        User user = userRepository.save(User.builder()
                .email("ws-user@example.com")
                .passwordHash("test")
                .fullName("WebSocket User")
                .role("PRO")
                .enabled(true)
                .createdAt(Instant.now())
                .build());

        subscriptionRepository.save(Subscription.builder()
                .userId(user.getId())
                .planId("pro")
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(Instant.now().plusSeconds(3600))
                .createdAt(Instant.now())
                .build());

        String token = jwtUtil.generateToken(user);

        BlockingQueue<String> messages = new LinkedBlockingQueue<>();
        StandardWebSocketClient client = new StandardWebSocketClient();
        URI uri = new URI("ws://localhost:" + port + "/ws/prices?token=" + token);

        activeSession = client.doHandshake(new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(@NonNull WebSocketSession session,
                                             @NonNull TextMessage message) {
                messages.add(message.getPayload());
            }
        }, new WebSocketHttpHeaders(), uri).get(5, TimeUnit.SECONDS);

        String connected = messages.poll(5, TimeUnit.SECONDS);
        assertThat(connected).isNotNull().contains("\"type\":\"connected\"");

        activeSession.sendMessage(new TextMessage("{\"action\":\"subscribe\",\"symbols\":[\"BTCUSDT\"]}"));

        String subscribed = messages.poll(5, TimeUnit.SECONDS);
        assertThat(subscribed).isNotNull().contains("\"type\":\"subscribed\"");

        PriceSnapshot snapshot = PriceSnapshot.builder()
                .coinSymbol("BTCUSDT")
                .timestamp(Instant.now())
                .open(new BigDecimal("50000"))
                .close(new BigDecimal("50200"))
                .high(new BigDecimal("50300"))
                .low(new BigDecimal("49950"))
                .volume(new BigDecimal("123.45"))
                .build();

        priceWebSocketService.publishSnapshot(snapshot);

        String update = messages.poll(5, TimeUnit.SECONDS);
        assertThat(update).isNotNull()
                .contains("\"type\":\"price\"")
                .contains("\"symbol\":\"BTCUSDT\"");

        KlinePointDto klinePoint = KlinePointDto.builder()
                .timestamp(Instant.now())
                .open(new BigDecimal("50200"))
                .close(new BigDecimal("50400"))
                .high(new BigDecimal("50500"))
                .low(new BigDecimal("50100"))
                .volume(new BigDecimal("200.50"))
                .interval("1m")
                .build();

        priceWebSocketService.publishPrice("BTCUSDT", klinePoint);

        String klineUpdate = messages.poll(5, TimeUnit.SECONDS);
        assertThat(klineUpdate).isNotNull()
                .contains("\"type\":\"price\"")
                .contains("\"symbol\":\"BTCUSDT\"")
                .contains("\"close\":50400");
    }
}

