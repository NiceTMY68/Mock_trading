package com.example.demo.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "webhook_events", indexes = {
    @Index(name = "idx_webhook_event_id", columnList = "event_id", unique = true),
    @Index(name = "idx_webhook_provider", columnList = "provider")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "provider", length = 50, nullable = false)
    private String provider;

    @Column(name = "event_id", nullable = false, unique = true, length = 255)
    private String eventId;

    @Column(name = "processed", nullable = false)
    @Builder.Default
    private boolean processed = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", columnDefinition = "jsonb")
    private JsonNode payload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}

