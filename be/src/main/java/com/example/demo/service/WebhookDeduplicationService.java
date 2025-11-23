package com.example.demo.service;

import com.example.demo.entity.WebhookEvent;
import com.example.demo.repository.WebhookEventRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookDeduplicationService {

    private final WebhookEventRepository webhookEventRepository;
    private final ObjectMapper objectMapper;

    public Optional<WebhookEvent> findExistingEvent(String eventId) {
        return webhookEventRepository.findByEventId(eventId);
    }

    @Transactional
    public WebhookEvent saveEvent(String provider, String eventId, JsonNode payload) {
        WebhookEvent webhookEvent = WebhookEvent.builder()
                .provider(provider)
                .eventId(eventId)
                .payload(payload)
                .processed(false)
                .build();

        return webhookEventRepository.save(webhookEvent);
    }

    @Transactional
    public void markAsProcessed(String eventId) {
        webhookEventRepository.markAsProcessed(eventId);
        log.debug("Marked webhook event {} as processed", eventId);
    }

    public JsonNode parsePayload(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (Exception e) {
            log.warn("Failed to parse webhook payload as JSON: {}", e.getMessage());
            return null;
        }
    }
}

