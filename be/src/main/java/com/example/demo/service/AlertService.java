package com.example.demo.service;

import com.example.demo.entity.Alert;
import com.example.demo.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final PriceService priceService;
    private final NotificationService notificationService;

    @Transactional
    public Alert createAlert(UUID userId, String symbol, Alert.Direction direction, BigDecimal threshold) {
        Alert alert = Alert.builder()
                .userId(userId)
                .symbol(symbol)
                .direction(direction)
                .threshold(threshold)
                .active(true)
                .createdAt(Instant.now())
                .build();
        return alertRepository.save(alert);
    }

    public List<Alert> listAlerts(UUID userId) {
        return alertRepository.findByUserId(userId);
    }

    @Transactional
    public void deleteAlert(Long alertId, UUID userId) {
        alertRepository.findById(alertId).ifPresent(a -> {
            if (a.getUserId().equals(userId)) {
                alertRepository.deleteById(alertId);
            }
        });
    }

    @Transactional
    public void processActiveAlerts() {
        List<Alert> alerts = alertRepository.findByActiveTrue();
        for (Alert alert : alerts) {
            try {
                BigDecimal price = priceService.getLatestPrice(alert.getSymbol()).orElse(null);
                if (price == null) continue;
                boolean trigger =
                        (alert.getDirection() == Alert.Direction.ABOVE && price.compareTo(alert.getThreshold()) >= 0) ||
                        (alert.getDirection() == Alert.Direction.BELOW && price.compareTo(alert.getThreshold()) <= 0);
                if (trigger) {
                    alert.setActive(false);
                    alert.setTriggeredAt(Instant.now());
                    alertRepository.save(alert);
                    notificationService.createAlertNotification(alert.getUserId(), alert.getSymbol(),
                            "Symbol " + alert.getSymbol() + " reached " + price.toPlainString() + " (" + alert.getDirection() + " " + alert.getThreshold().toPlainString() + ")");
                }
            } catch (Exception e) {
                log.warn("Failed processing alert {}: {}", alert.getId(), e.getMessage());
            }
        }
    }
}