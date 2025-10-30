package com.example.demo.util;

import com.example.demo.service.AuditService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AuditLoggingHelper {

    private final AuditService auditService;

    public AuditContext start(String endpoint, UUID userId, JsonNode normalizedParams) {
        UUID requestId = UUID.randomUUID();
        long startTime = System.currentTimeMillis();
        auditService.logRequest(requestId, userId, endpoint, normalizedParams);
        return new AuditContext(requestId, startTime, endpoint);
    }

    public void finishSuccess(AuditContext ctx, String provider, JsonNode providerMeta) {
        long latencyMs = System.currentTimeMillis() - ctx.startTime();
        auditService.finishRequest(ctx.requestId(), false, provider, providerMeta, latencyMs);
    }

    public void finishError(AuditContext ctx, String provider, String errorMessage) {
        long latencyMs = System.currentTimeMillis() - ctx.startTime();
        auditService.finishRequest(ctx.requestId(), false, provider,
                com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode().put("error", errorMessage),
                latencyMs);
    }

    public ResponseEntity<Map<String, Object>> ok(AuditContext ctx, Object data) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("requestId", ctx.requestId().toString());
        response.put("data", data);
        return ResponseEntity.ok(response);
    }

    public ResponseEntity<Map<String, Object>> error(AuditContext ctx, String errorMessage, HttpStatus status) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("requestId", ctx.requestId().toString());
        response.put("error", errorMessage);
        return ResponseEntity.status(status).body(response);
    }

    public record AuditContext(UUID requestId, long startTime, String endpoint) {}
}


