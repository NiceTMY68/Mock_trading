package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Notification;
import com.example.demo.entity.User;
import com.example.demo.repository.AlertRepository;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.AlertService;
import com.example.demo.service.PriceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "app.alert.checker.delay=1000"
})
class AlertSchedulerIntegrationTest extends IntegrationTestBase {

    @Autowired
    private AlertService alertService;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private PriceService priceService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private UUID testUserId;

    @BeforeEach
    void setUp() {
        alertRepository.deleteAll();
        notificationRepository.deleteAll();
        userRepository.deleteAll();

        User testUser = User.builder()
                .email("alerttest@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .fullName("Alert Test User")
                .role("USER")
                .enabled(true)
                .build();
        userRepository.save(testUser);
        testUserId = testUser.getId();
    }

    @Test
    void processActiveAlerts_WhenPriceCrossesThreshold_ShouldCreateNotificationAndDeactivateAlert() {
        Alert alert = Alert.builder()
                .userId(testUserId)
                .symbol("BTCUSDT")
                .direction(Alert.Direction.ABOVE)
                .threshold(new BigDecimal("50000"))
                .active(true)
                .createdAt(Instant.now())
                .build();
        alertRepository.save(alert);

        priceService.saveSnapshots(
                java.util.List.of(
                        com.example.demo.dto.KlinePointDto.builder()
                                .timestamp(Instant.now())
                                .open(new BigDecimal("49000"))
                                .high(new BigDecimal("51000"))
                                .close(new BigDecimal("50500"))
                                .low(new BigDecimal("49000"))
                                .volume(new BigDecimal("100"))
                                .interval("1m")
                                .build()
                ),
                "BTCUSDT"
        );

        alertService.processActiveAlerts();

        Optional<Alert> updatedAlert = alertRepository.findById(alert.getId());
        assertThat(updatedAlert).isPresent();
        assertThat(updatedAlert.get().isActive()).isFalse();
        assertThat(updatedAlert.get().getTriggeredAt()).isNotNull();

        java.util.List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(testUserId);
        assertThat(notifications).hasSize(1);
        assertThat(notifications.get(0).getType()).isEqualTo(Notification.Type.ALERT_TRIGGERED);
        assertThat(notifications.get(0).getTitle()).isEqualTo("Price alert triggered");
        assertThat(notifications.get(0).getMessage()).contains("BTCUSDT");
        assertThat(notifications.get(0).getMessage()).contains("50500");
    }

    @Test
    void processActiveAlerts_WhenPriceBelowThreshold_ShouldNotTrigger() {
        Alert alert = Alert.builder()
                .userId(testUserId)
                .symbol("BTCUSDT")
                .direction(Alert.Direction.ABOVE)
                .threshold(new BigDecimal("50000"))
                .active(true)
                .createdAt(Instant.now())
                .build();
        alertRepository.save(alert);

        priceService.saveSnapshots(
                java.util.List.of(
                        com.example.demo.dto.KlinePointDto.builder()
                                .timestamp(Instant.now())
                                .open(new BigDecimal("49000"))
                                .high(new BigDecimal("49500"))
                                .close(new BigDecimal("49000"))
                                .low(new BigDecimal("48000"))
                                .volume(new BigDecimal("100"))
                                .interval("1m")
                                .build()
                ),
                "BTCUSDT"
        );

        alertService.processActiveAlerts();

        Optional<Alert> updatedAlert = alertRepository.findById(alert.getId());
        assertThat(updatedAlert).isPresent();
        assertThat(updatedAlert.get().isActive()).isTrue();
        assertThat(updatedAlert.get().getTriggeredAt()).isNull();

        java.util.List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(testUserId);
        assertThat(notifications).isEmpty();
    }

    @Test
    void processActiveAlerts_WhenBelowDirection_ShouldTriggerWhenPriceFalls() {
        Alert alert = Alert.builder()
                .userId(testUserId)
                .symbol("BTCUSDT")
                .direction(Alert.Direction.BELOW)
                .threshold(new BigDecimal("50000"))
                .active(true)
                .createdAt(Instant.now())
                .build();
        alertRepository.save(alert);

        priceService.saveSnapshots(
                java.util.List.of(
                        com.example.demo.dto.KlinePointDto.builder()
                                .timestamp(Instant.now())
                                .open(new BigDecimal("51000"))
                                .high(new BigDecimal("51000"))
                                .close(new BigDecimal("49000"))
                                .low(new BigDecimal("48000"))
                                .volume(new BigDecimal("100"))
                                .interval("1m")
                                .build()
                ),
                "BTCUSDT"
        );

        alertService.processActiveAlerts();

        Optional<Alert> updatedAlert = alertRepository.findById(alert.getId());
        assertThat(updatedAlert).isPresent();
        assertThat(updatedAlert.get().isActive()).isFalse();
        assertThat(updatedAlert.get().getTriggeredAt()).isNotNull();

        java.util.List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(testUserId);
        assertThat(notifications).hasSize(1);
    }
}

