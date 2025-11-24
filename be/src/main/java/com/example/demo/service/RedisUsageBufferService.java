package com.example.demo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * Service to buffer usage metrics in Redis using INCR operations.
 * This avoids database write storms by batching increments in Redis
 * and flushing them periodically to the database.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RedisUsageBufferService {

    private final StringRedisTemplate redisTemplate;

    private static final String BUFFER_KEY_PREFIX = "usage:buffer:";
    private static final String METADATA_KEY_PREFIX = "usage:metadata:";
    private static final int BUFFER_TTL_HOURS = 24; // Prevent Redis memory leak if flush fails

    /**
     * Increment usage metric in Redis buffer.
     * Uses composite key: usage:buffer:{metricKey}:{userId}:{metadataHash}
     * 
     * @param metricKey Metric key (e.g., "news.api.calls")
     * @param userId User ID (can be null)
     * @param amount Amount to increment
     * @param metadata Optional metadata string
     * @return The new value after increment
     */
    public Long increment(String metricKey, UUID userId, int amount, String metadata) {
        try {
            String key = buildBufferKey(metricKey, userId, metadata);
            String metadataKey = buildMetadataKey(metricKey, userId, metadata);
            
            // Increment the counter atomically
            Long newValue = redisTemplate.opsForValue().increment(key, amount);
            
            // Set TTL to prevent memory leak
            redisTemplate.expire(key, BUFFER_TTL_HOURS, TimeUnit.HOURS);
            
            // Store metadata separately (only if not null and not already stored)
            if (metadata != null && !redisTemplate.hasKey(metadataKey)) {
                redisTemplate.opsForValue().set(metadataKey, metadata, BUFFER_TTL_HOURS, TimeUnit.HOURS);
            }
            
            log.debug("Buffered usage increment: key={}, userId={}, amount={}, newValue={}", 
                    metricKey, userId, amount, newValue);
            
            return newValue;
        } catch (Exception e) {
            log.error("Failed to buffer usage metric: key={}, userId={}, amount={}", 
                    metricKey, userId, amount, e);
            throw new RuntimeException("Failed to buffer usage metric", e);
        }
    }

    /**
     * Get all buffered metrics grouped by metric key, user ID, and metadata.
     * 
     * @return Map of buffer keys to their current values, and metadata map
     */
    public Map<String, BufferedMetric> getAllBufferedMetrics() {
        try {
            Set<String> keys = redisTemplate.keys(BUFFER_KEY_PREFIX + "*");
            if (keys == null || keys.isEmpty()) {
                return Collections.emptyMap();
            }

            Map<String, BufferedMetric> metrics = new HashMap<>();
            
            for (String key : keys) {
                String value = redisTemplate.opsForValue().get(key);
                if (value != null) {
                    Long amount = Long.parseLong(value);
                    if (amount > 0) {
                        // Parse key to extract components
                        String[] parts = parseBufferKey(key);
                        if (parts != null) {
                            String metricKey = parts[0];
                            String userIdStr = parts[1];
                            String metadataHash = parts[2];
                            
                            UUID userId = "null".equals(userIdStr) ? null : UUID.fromString(userIdStr);
                            
                            // Retrieve metadata
                            String metadataKey = buildMetadataKeyFromHash(metricKey, userId, metadataHash);
                            String metadata = redisTemplate.opsForValue().get(metadataKey);
                            
                            // Use composite key for grouping
                            String compositeKey = buildCompositeKey(metricKey, userId, metadata);
                            
                            // Aggregate if same composite key exists
                            BufferedMetric existing = metrics.get(compositeKey);
                            if (existing != null) {
                                // Aggregate amounts
                                existing = BufferedMetric.builder()
                                        .metricKey(existing.getMetricKey())
                                        .userId(existing.getUserId())
                                        .amount(existing.getAmount() + amount)
                                        .metadata(existing.getMetadata())
                                        .build();
                                metrics.put(compositeKey, existing);
                            } else {
                                // Create new
                                BufferedMetric newMetric = BufferedMetric.builder()
                                        .metricKey(metricKey)
                                        .userId(userId)
                                        .amount(amount)
                                        .metadata(metadata)
                                        .build();
                                metrics.put(compositeKey, newMetric);
                            }
                        }
                    }
                }
            }
            
            return metrics;
        } catch (Exception e) {
            log.error("Failed to get buffered metrics", e);
            throw new RuntimeException("Failed to get buffered metrics", e);
        }
    }

    /**
     * Clear all buffered metrics from Redis.
     * Should be called after successful flush to database.
     */
    public void clearBufferedMetrics() {
        try {
            Set<String> bufferKeys = redisTemplate.keys(BUFFER_KEY_PREFIX + "*");
            Set<String> metadataKeys = redisTemplate.keys(METADATA_KEY_PREFIX + "*");
            
            if (bufferKeys != null && !bufferKeys.isEmpty()) {
                redisTemplate.delete(bufferKeys);
                log.debug("Cleared {} buffer keys", bufferKeys.size());
            }
            
            if (metadataKeys != null && !metadataKeys.isEmpty()) {
                redisTemplate.delete(metadataKeys);
                log.debug("Cleared {} metadata keys", metadataKeys.size());
            }
        } catch (Exception e) {
            log.error("Failed to clear buffered metrics", e);
            throw new RuntimeException("Failed to clear buffered metrics", e);
        }
    }

    /**
     * Build Redis key for buffer: usage:buffer:{metricKey}:{userId}:{metadataHash}
     */
    private String buildBufferKey(String metricKey, UUID userId, String metadata) {
        String userIdStr = userId != null ? userId.toString() : "null";
        String metadataHash = hashMetadata(metadata);
        return BUFFER_KEY_PREFIX + metricKey + ":" + userIdStr + ":" + metadataHash;
    }

    /**
     * Build Redis key for metadata storage
     */
    private String buildMetadataKey(String metricKey, UUID userId, String metadata) {
        String userIdStr = userId != null ? userId.toString() : "null";
        String metadataHash = hashMetadata(metadata);
        return METADATA_KEY_PREFIX + metricKey + ":" + userIdStr + ":" + metadataHash;
    }

    /**
     * Build metadata key from components (for retrieval using hash)
     */
    private String buildMetadataKeyFromHash(String metricKey, UUID userId, String metadataHash) {
        String userIdStr = userId != null ? userId.toString() : "null";
        return METADATA_KEY_PREFIX + metricKey + ":" + userIdStr + ":" + metadataHash;
    }

    /**
     * Build composite key for grouping metrics
     */
    private String buildCompositeKey(String metricKey, UUID userId, String metadata) {
        String userIdStr = userId != null ? userId.toString() : "null";
        String metadataStr = metadata != null ? metadata : "null";
        return metricKey + ":" + userIdStr + ":" + metadataStr;
    }

    /**
     * Parse buffer key to extract components
     * Format: usage:buffer:{metricKey}:{userId}:{metadataHash}
     * Note: metricKey may contain colons, so we split from the end
     */
    private String[] parseBufferKey(String key) {
        if (!key.startsWith(BUFFER_KEY_PREFIX)) {
            return null;
        }
        
        String suffix = key.substring(BUFFER_KEY_PREFIX.length());
        
        // Split from the end: find last colon (metadataHash) and second-to-last colon (userId)
        int lastColon = suffix.lastIndexOf(':');
        if (lastColon == -1) {
            return null;
        }
        
        String metadataHash = suffix.substring(lastColon + 1);
        String beforeLastColon = suffix.substring(0, lastColon);
        
        int secondLastColon = beforeLastColon.lastIndexOf(':');
        if (secondLastColon == -1) {
            return null;
        }
        
        String userIdStr = beforeLastColon.substring(secondLastColon + 1);
        String metricKey = beforeLastColon.substring(0, secondLastColon);
        
        return new String[]{metricKey, userIdStr, metadataHash};
    }

    /**
     * Hash metadata string to create a stable hash for use in Redis key.
     * Uses MD5 for speed (security not a concern here).
     */
    private String hashMetadata(String metadata) {
        if (metadata == null) {
            return "null";
        }
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hash = md.digest(metadata.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            log.error("Failed to hash metadata", e);
            // Fallback: use first 16 chars of metadata (truncated)
            return metadata.length() > 16 ? metadata.substring(0, 16) : metadata;
        }
    }

    /**
     * Represents a buffered metric ready to be flushed to database.
     */
    @lombok.Data
    @lombok.Builder
    public static class BufferedMetric {
        private String metricKey;
        private UUID userId;
        private Long amount;
        private String metadata;
    }
}

