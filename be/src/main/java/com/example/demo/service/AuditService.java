package com.example.demo.service;

import com.example.demo.entity.RequestLog;
import com.example.demo.repository.RequestLogRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuditService {

    private static final Logger logger = LoggerFactory.getLogger(AuditService.class);

    @Autowired
    private RequestLogRepository requestLogRepository;

    /**
     * Log the start of a request
     * @param requestId Unique request identifier
     * @param userId User ID (nullable for public endpoints)
     * @param endpoint The API endpoint being called
     * @param params Normalized parameters as JSON
     */
    @Transactional
    public void logRequest(UUID requestId, @Nullable UUID userId, String endpoint, JsonNode params) {
        try {
            RequestLog requestLog = RequestLog.builder()
                    .requestId(requestId)
                    .userId(userId)
                    .endpoint(endpoint)
                    .normalizedParams(params)
                    .cached(false) // Will be updated in finishRequest
                    .build();

            requestLogRepository.save(requestLog);
            logger.debug("Logged request: {} for endpoint: {}", requestId, endpoint);
        } catch (Exception e) {
            logger.error("Failed to log request: {}", requestId, e);
            // Don't throw exception - audit failure shouldn't break the API
        }
    }

    /**
     * Update request log with completion details
     * @param requestId The request identifier
     * @param cached Whether the response was served from cache
     * @param provider The provider name (e.g., "binance", "newsdata")
     * @param providerMeta Additional metadata from the provider
     * @param latencyMs Request latency in milliseconds
     */
    @Transactional
    public void finishRequest(UUID requestId, boolean cached, String provider, JsonNode providerMeta, long latencyMs) {
        try {
            requestLogRepository.findByRequestId(requestId).ifPresent(requestLog -> {
                requestLog.setCached(cached);
                requestLog.setProvider(provider);
                requestLog.setProviderMeta(providerMeta);
                requestLog.setLatencyMs(latencyMs);
                requestLogRepository.save(requestLog);
                logger.debug("Finished request: {} - cached: {}, latency: {}ms", requestId, cached, latencyMs);
            });
        } catch (Exception e) {
            logger.error("Failed to finish request log: {}", requestId, e);
            // Don't throw exception - audit failure shouldn't break the API
        }
    }

    /**
     * Get request log by requestId
     * @param requestId The request identifier
     * @return RequestLog or null if not found
     */
    public RequestLog getRequestLog(UUID requestId) {
        return requestLogRepository.findByRequestId(requestId).orElse(null);
    }
}

