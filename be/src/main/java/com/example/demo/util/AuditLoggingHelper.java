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
        auditService.start(requestId, userId, endpoint, normalizedParams);
        return new AuditContext(requestId, startTime, endpoint);
    }

    public void finish(AuditContext ctx, String provider, boolean cached, JsonNode providerMeta, int statusCode) {
        long latencyMs = System.currentTimeMillis() - ctx.startTime();
        auditService.finish(ctx.requestId(), provider, cached, providerMeta, latencyMs, statusCode);
    }

    public ResponseEntity<Map<String, Object>> ok(AuditContext ctx, Object data) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("requestId", ctx.requestId().toString());
        response.put("data", data);
        return ResponseEntity.ok(response);
    }

    public ResponseEntity<Map<String, Object>> ok(AuditContext ctx, Object data, String provider, boolean cached, JsonNode providerMeta) {
        finish(ctx, provider, cached, providerMeta, HttpStatus.OK.value());
        return ok(ctx, data);
    }

    public ResponseEntity<Map<String, Object>> okWithExtra(AuditContext ctx, Object data, Map<String, Object> extraFields, String provider, boolean cached, JsonNode providerMeta) {
        finish(ctx, provider, cached, providerMeta, HttpStatus.OK.value());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("requestId", ctx.requestId().toString());
        response.put("data", data);
        response.putAll(extraFields);
        return ResponseEntity.ok(response);
    }

    public ResponseEntity<Map<String, Object>> error(AuditContext ctx, String errorMessage, HttpStatus status, String provider) {
        JsonNode errorMeta = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode().put("error", errorMessage);
        finish(ctx, provider, false, errorMeta, status.value());
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("requestId", ctx.requestId().toString());
        response.put("error", errorMessage);
        return ResponseEntity.status(status).body(response);
    }

    public record AuditContext(UUID requestId, long startTime, String endpoint) {}
}
