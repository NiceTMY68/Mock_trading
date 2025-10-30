package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "watchlist_items", indexes = {
        @Index(name = "idx_watchlist_symbol", columnList = "watchlist_id,symbol", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WatchlistItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "watchlist_id", nullable = false)
    private Long watchlistId;

    @Column(name = "symbol", nullable = false)
    private String symbol;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
