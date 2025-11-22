package com.example.demo.service.impl;

import com.example.demo.entity.RequestLog;
import com.example.demo.repository.RequestLogRepository;
import com.example.demo.service.AuditService;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuditServiceImpl implements AuditService {

    private static final Logger logger = LoggerFactory.getLogger(AuditServiceImpl.class);

    @Autowired
    private RequestLogRepository requestLogRepository;

    @Override
    @Transactional
    public UUID start(UUID requestId, @Nullable UUID userId, String endpoint, JsonNode normalizedParams) {
        try {
            RequestLog requestLog = RequestLog.builder()
                    .requestId(requestId)
                    .userId(userId)
                    .endpoint(endpoint)
                    .normalizedParams(normalizedParams)
                    .cached(false)
                    .build();

            requestLogRepository.save(requestLog);
            logger.debug("Started request: {} for endpoint: {}", requestId, endpoint);
            return requestId;
        } catch (Exception e) {
            logger.error("Failed to start request log: {}", requestId, e);
            return requestId;
        }
    }

    @Override
    @Transactional
    public void finish(UUID requestId, String provider, boolean cached, JsonNode providerMeta, long latencyMs, int statusCode) {
        try {
            requestLogRepository.findByRequestId(requestId).ifPresent(requestLog -> {
                requestLog.setCached(cached);
                requestLog.setProvider(provider);
                requestLog.setProviderMeta(providerMeta);
                requestLog.setLatencyMs(latencyMs);
                requestLog.setStatusCode(statusCode);
                requestLogRepository.save(requestLog);
                logger.debug("Finished request: {} - cached: {}, latency: {}ms, status: {}", requestId, cached, latencyMs, statusCode);
            });
        } catch (Exception e) {
            logger.error("Failed to finish request log: {}", requestId, e);
        }
    }
}

