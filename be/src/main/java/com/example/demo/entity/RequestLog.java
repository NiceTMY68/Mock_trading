package com.example.demo.entity;

import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "request_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private UUID requestId;

    @Column(nullable = true)
    private UUID userId;

    @Column(nullable = false)
    private String endpoint;

    @Column(nullable = true)
    private String provider;

    @Type(JsonType.class)
    @Column(columnDefinition = "json")
    private JsonNode normalizedParams;

    @Column(nullable = false)
    private boolean cached;

    @Column(nullable = true)
    private Long latencyMs;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Type(JsonType.class)
    @Column(columnDefinition = "json")
    private JsonNode providerMeta;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}

