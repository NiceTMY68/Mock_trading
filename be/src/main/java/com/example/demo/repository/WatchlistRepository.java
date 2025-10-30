package com.example.demo.repository;

import com.example.demo.entity.Watchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WatchlistRepository extends JpaRepository<Watchlist, Long> {
    Optional<Watchlist> findByUserId(UUID userId);
}
