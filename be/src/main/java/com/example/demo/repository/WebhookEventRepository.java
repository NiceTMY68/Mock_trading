package com.example.demo.repository;

import com.example.demo.entity.WebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WebhookEventRepository extends JpaRepository<WebhookEvent, UUID> {

    Optional<WebhookEvent> findByEventId(String eventId);

    @Modifying
    @Query("UPDATE WebhookEvent we SET we.processed = true WHERE we.eventId = :eventId")
    void markAsProcessed(@Param("eventId") String eventId);

    @Modifying
    @Query("DELETE FROM WebhookEvent we WHERE we.createdAt < :cutoff")
    void deleteOldEvents(@Param("cutoff") Instant cutoff);
}

