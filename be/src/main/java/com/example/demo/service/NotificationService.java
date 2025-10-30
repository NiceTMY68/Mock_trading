package com.example.demo.service;

import com.example.demo.entity.Notification;
import com.example.demo.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public Notification createAlertNotification(UUID userId, String symbol, String message) {
        Notification notification = Notification.builder()
                .userId(userId)
                .type(Notification.Type.ALERT_TRIGGERED)
                .title("Price alert triggered")
                .message(message)
                .createdAt(Instant.now())
                .read(false)
                .build();
        Notification saved = notificationRepository.save(notification);
        log.info("Created alert notification {} for user {}", saved.getId(), userId);
        return saved;
    }
}
