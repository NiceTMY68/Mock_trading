package com.example.demo.service;

import com.example.demo.entity.IdempotencyKey;
import com.example.demo.repository.IdempotencyKeyRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final IdempotencyKeyRepository idempotencyKeyRepository;

    @Value("${app.idempotency.expiry-hours:24}")
    private int idempotencyExpiryHours;

    public Optional<IdempotencyKey> findByIdempotencyKey(String key) {
        return idempotencyKeyRepository.findByKey(key)
                .filter(IdempotencyKey::isValid);
    }

    @Transactional
    public IdempotencyKey saveResponse(String key, UUID userId, String endpoint,
                                       JsonNode responseBody, Integer statusCode) {
        Instant expiresAt = Instant.now().plusSeconds(idempotencyExpiryHours * 3600L);

        IdempotencyKey idempotencyKey = IdempotencyKey.builder()
                .key(key)
                .userId(userId)
                .endpoint(endpoint)
                .responseBody(responseBody)
                .statusCode(statusCode)
                .expiresAt(expiresAt)
                .build();

        return idempotencyKeyRepository.save(idempotencyKey);
    }

    @Transactional
    public void deleteExpiredKeys() {
        idempotencyKeyRepository.deleteExpiredKeys(Instant.now());
        log.debug("Deleted expired idempotency keys");
    }
}

