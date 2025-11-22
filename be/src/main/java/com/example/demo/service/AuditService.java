package com.example.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.lang.Nullable;

import java.util.UUID;

public interface AuditService {

    UUID start(UUID requestId, @Nullable UUID userId, String endpoint, JsonNode normalizedParams);

    void finish(UUID requestId, String provider, boolean cached, JsonNode providerMeta, long latencyMs, int statusCode);

    @Deprecated
    default void logRequest(UUID requestId, @Nullable UUID userId, String endpoint, JsonNode params) {
        start(requestId, userId, endpoint, params);
    }

    @Deprecated
    default void finishRequest(UUID requestId, boolean cached, String provider, JsonNode providerMeta, long latencyMs) {
        finish(requestId, provider, cached, providerMeta, latencyMs, 200);
    }
}
