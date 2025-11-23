package com.example.demo.repository;

import com.example.demo.entity.IdempotencyKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IdempotencyKeyRepository extends JpaRepository<IdempotencyKey, UUID> {

    Optional<IdempotencyKey> findByKey(String key);

    @Modifying
    @Query("DELETE FROM IdempotencyKey ik WHERE ik.expiresAt < :cutoff")
    void deleteExpiredKeys(@Param("cutoff") Instant cutoff);

    @Query("SELECT COUNT(ik) FROM IdempotencyKey ik WHERE ik.userId = :userId")
    Long countByUserId(@Param("userId") UUID userId);
}

