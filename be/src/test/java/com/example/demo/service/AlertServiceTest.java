package com.example.demo.service;

import com.example.demo.entity.Alert;
import com.example.demo.entity.Notification;
import com.example.demo.repository.AlertRepository;
import com.example.demo.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlertServiceTest {

    @Mock
    private AlertRepository alertRepository;
    @Mock
    private PriceService priceService;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AlertService alertService;

    private UUID userId;

    @BeforeEach
    void setup() {
        userId = UUID.randomUUID();
    }

    @Test
    void processActiveAlerts_WhenAboveThreshold_ShouldCreateNotificationAndDeactivate() {
        Alert alert = Alert.builder()
                .id(1L)
                .userId(userId)
                .symbol("BTCUSDT")
                .direction(Alert.Direction.ABOVE)
                .threshold(new BigDecimal("50000"))
                .active(true)
                .createdAt(Instant.now())
                .build();

        when(alertRepository.findByActiveTrue()).thenReturn(List.of(alert));
        when(priceService.getLatestPrice("BTCUSDT")).thenReturn(Optional.of(new BigDecimal("50500")));
        when(alertRepository.save(any(Alert.class))).thenAnswer(inv -> inv.getArgument(0));
        when(notificationService.createAlertNotification(any(UUID.class), any(), any())).thenReturn(
                Notification.builder().id(10L).userId(userId).title("t").message("m").createdAt(Instant.now()).read(false).type(Notification.Type.ALERT_TRIGGERED).build()
        );

        alertService.processActiveAlerts();

        assertThat(alert.isActive()).isFalse();
        assertThat(alert.getTriggeredAt()).isNotNull();
        verify(notificationService, times(1)).createAlertNotification(eq(userId), eq("BTCUSDT"), any());
    }
}
