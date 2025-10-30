package com.example.demo.repository;

import com.example.demo.entity.WatchlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WatchlistItemRepository extends JpaRepository<WatchlistItem, Long> {
    List<WatchlistItem> findByWatchlistId(Long watchlistId);
    boolean existsByWatchlistIdAndSymbol(Long watchlistId, String symbol);
    void deleteByWatchlistIdAndSymbol(Long watchlistId, String symbol);
}
