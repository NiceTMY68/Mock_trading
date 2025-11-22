package com.example.demo.service;

import com.example.demo.entity.RequestLog;
import com.example.demo.repository.RequestLogRepository;
import com.example.demo.service.impl.AuditServiceImpl;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private RequestLogRepository requestLogRepository;

    @InjectMocks
    private AuditServiceImpl auditService;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
    }

    @Test
    void start_ShouldCreateRequestLog_WhenValidInput() {
        UUID requestId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String endpoint = "/api/v1/market/symbols";
        JsonNode normalizedParams = objectMapper.createObjectNode().put("symbol", "BTCUSDT");

        when(requestLogRepository.save(any(RequestLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UUID result = auditService.start(requestId, userId, endpoint, normalizedParams);

        assertThat(result).isEqualTo(requestId);

        ArgumentCaptor<RequestLog> captor = ArgumentCaptor.forClass(RequestLog.class);
        verify(requestLogRepository, times(1)).save(captor.capture());

        RequestLog saved = captor.getValue();
        assertThat(saved.getRequestId()).isEqualTo(requestId);
        assertThat(saved.getUserId()).isEqualTo(userId);
        assertThat(saved.getEndpoint()).isEqualTo(endpoint);
        assertThat(saved.getNormalizedParams()).isEqualTo(normalizedParams);
        assertThat(saved.isCached()).isFalse();
    }

    @Test
    void start_ShouldHandleNullUserId() {
        UUID requestId = UUID.randomUUID();
        String endpoint = "/api/v1/market/symbols";
        JsonNode normalizedParams = objectMapper.createObjectNode();

        when(requestLogRepository.save(any(RequestLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UUID result = auditService.start(requestId, null, endpoint, normalizedParams);

        assertThat(result).isEqualTo(requestId);

        ArgumentCaptor<RequestLog> captor = ArgumentCaptor.forClass(RequestLog.class);
        verify(requestLogRepository, times(1)).save(captor.capture());

        RequestLog saved = captor.getValue();
        assertThat(saved.getUserId()).isNull();
    }

    @Test
    void finish_ShouldUpdateRequestLog_WhenExists() {
        UUID requestId = UUID.randomUUID();
        String provider = "binance";
        boolean cached = true;
        JsonNode providerMeta = objectMapper.createObjectNode().put("count", 10);
        long latencyMs = 150L;
        int statusCode = 200;

        RequestLog existingLog = RequestLog.builder()
                .id(UUID.randomUUID())
                .requestId(requestId)
                .endpoint("/api/v1/market/symbols")
                .cached(false)
                .build();

        when(requestLogRepository.findByRequestId(requestId)).thenReturn(Optional.of(existingLog));
        when(requestLogRepository.save(any(RequestLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        auditService.finish(requestId, provider, cached, providerMeta, latencyMs, statusCode);

        ArgumentCaptor<RequestLog> captor = ArgumentCaptor.forClass(RequestLog.class);
        verify(requestLogRepository, times(1)).save(captor.capture());

        RequestLog updated = captor.getValue();
        assertThat(updated.getProvider()).isEqualTo(provider);
        assertThat(updated.isCached()).isEqualTo(cached);
        assertThat(updated.getProviderMeta()).isEqualTo(providerMeta);
        assertThat(updated.getLatencyMs()).isEqualTo(latencyMs);
        assertThat(updated.getStatusCode()).isEqualTo(statusCode);
    }

    @Test
    void finish_ShouldNotThrow_WhenRequestLogNotFound() {
        UUID requestId = UUID.randomUUID();
        String provider = "binance";
        boolean cached = false;
        JsonNode providerMeta = objectMapper.createObjectNode();
        long latencyMs = 100L;
        int statusCode = 404;

        when(requestLogRepository.findByRequestId(requestId)).thenReturn(Optional.empty());

        auditService.finish(requestId, provider, cached, providerMeta, latencyMs, statusCode);

        verify(requestLogRepository, never()).save(any(RequestLog.class));
    }

    @Test
    void start_ShouldNotThrow_WhenRepositoryFails() {
        UUID requestId = UUID.randomUUID();
        String endpoint = "/api/v1/market/symbols";
        JsonNode normalizedParams = objectMapper.createObjectNode();

        when(requestLogRepository.save(any(RequestLog.class))).thenThrow(new RuntimeException("DB error"));

        UUID result = auditService.start(requestId, null, endpoint, normalizedParams);

        assertThat(result).isEqualTo(requestId);
    }

    @Test
    void finish_ShouldNotThrow_WhenRepositoryFails() {
        UUID requestId = UUID.randomUUID();
        String provider = "binance";
        boolean cached = false;
        JsonNode providerMeta = objectMapper.createObjectNode();
        long latencyMs = 100L;
        int statusCode = 500;

        RequestLog existingLog = RequestLog.builder()
                .id(UUID.randomUUID())
                .requestId(requestId)
                .endpoint("/api/v1/market/symbols")
                .build();

        when(requestLogRepository.findByRequestId(requestId)).thenReturn(Optional.of(existingLog));
        when(requestLogRepository.save(any(RequestLog.class))).thenThrow(new RuntimeException("DB error"));

        auditService.finish(requestId, provider, cached, providerMeta, latencyMs, statusCode);
    }
}

