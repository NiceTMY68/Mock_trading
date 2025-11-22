package com.example.demo.service;

import com.example.demo.entity.Watchlist;
import com.example.demo.entity.WatchlistItem;
import com.example.demo.repository.WatchlistItemRepository;
import com.example.demo.repository.WatchlistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WatchlistService {

    private final WatchlistRepository watchlistRepository;
    private final WatchlistItemRepository watchlistItemRepository;

    @Transactional
    public void addToWatchlist(UUID userId, String symbol) {
        Watchlist watchlist = watchlistRepository.findByUserId(userId)
                .orElseGet(() -> watchlistRepository.save(Watchlist.builder()
                        .userId(userId)
                        .createdAt(Instant.now())
                        .build()));

        if (!watchlistItemRepository.existsByWatchlistIdAndSymbol(watchlist.getId(), symbol)) {
            watchlistItemRepository.save(WatchlistItem.builder()
                    .watchlistId(watchlist.getId())
                    .symbol(symbol)
                    .createdAt(Instant.now())
                    .build());
            log.info("Added {} to watchlist for user {}", symbol, userId);
        }
    }

    @Transactional
    public void removeFromWatchlist(UUID userId, String symbol) {
        watchlistRepository.findByUserId(userId).ifPresent(w -> {
            watchlistItemRepository.deleteByWatchlistIdAndSymbol(w.getId(), symbol);
            log.info("Removed {} from watchlist for user {}", symbol, userId);
        });
    }

    public List<WatchlistItem> getWatchlist(UUID userId) {
        return watchlistRepository.findByUserId(userId)
                .map(w -> watchlistItemRepository.findByWatchlistId(w.getId()))
                .orElse(List.of());
    }
}