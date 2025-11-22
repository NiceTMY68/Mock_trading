package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.entity.RequestLog;
import com.example.demo.repository.RequestLogRepository;
import com.example.demo.service.AuditService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class AuditServiceIntegrationTest extends IntegrationTestBase {

    @Autowired
    private AuditService auditService;

    @Autowired
    private RequestLogRepository requestLogRepository;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        requestLogRepository.deleteAll();
    }

    @Test
    void startAndFinish_ShouldPersistRequestLog_WhenValidFlow() {
        UUID requestId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String endpoint = "/api/v1/market/symbols";
        JsonNode normalizedParams = objectMapper.createObjectNode().put("symbol", "BTCUSDT");
        String provider = "binance";
        boolean cached = false;
        JsonNode providerMeta = objectMapper.createObjectNode().put("count", 100);
        long latencyMs = 150L;
        int statusCode = 200;

        auditService.start(requestId, userId, endpoint, normalizedParams);

        Optional<RequestLog> saved = requestLogRepository.findByRequestId(requestId);
        assertThat(saved).isPresent();
        RequestLog log = saved.get();
        assertThat(log.getRequestId()).isEqualTo(requestId);
        assertThat(log.getUserId()).isEqualTo(userId);
        assertThat(log.getEndpoint()).isEqualTo(endpoint);
        assertThat(log.getNormalizedParams()).isNotNull();
        assertThat(log.isCached()).isFalse();
        assertThat(log.getStatusCode()).isNull();

        auditService.finish(requestId, provider, cached, providerMeta, latencyMs, statusCode);

        Optional<RequestLog> updated = requestLogRepository.findByRequestId(requestId);
        assertThat(updated).isPresent();
        RequestLog finished = updated.get();
        assertThat(finished.getProvider()).isEqualTo(provider);
        assertThat(finished.isCached()).isEqualTo(cached);
        assertThat(finished.getProviderMeta()).isNotNull();
        assertThat(finished.getLatencyMs()).isEqualTo(latencyMs);
        assertThat(finished.getStatusCode()).isEqualTo(statusCode);
    }

    @Test
    void start_ShouldPersistRequestLog_WhenNullUserId() {
        UUID requestId = UUID.randomUUID();
        String endpoint = "/api/v1/market/symbols";
        JsonNode normalizedParams = objectMapper.createObjectNode();

        auditService.start(requestId, null, endpoint, normalizedParams);

        Optional<RequestLog> saved = requestLogRepository.findByRequestId(requestId);
        assertThat(saved).isPresent();
        assertThat(saved.get().getUserId()).isNull();
    }
}

