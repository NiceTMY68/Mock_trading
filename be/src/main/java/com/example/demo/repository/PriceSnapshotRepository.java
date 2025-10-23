package com.example.demo.repository;

import com.example.demo.entity.PriceSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface PriceSnapshotRepository extends JpaRepository<PriceSnapshot, Long> {
    
    List<PriceSnapshot> findByCoinSymbolOrderByTimestampDesc(String coinSymbol);
    
    List<PriceSnapshot> findByCoinSymbolAndTimestampBetweenOrderByTimestampDesc(
            String coinSymbol, Instant startTime, Instant endTime);
    
    @Query("SELECT p FROM PriceSnapshot p WHERE p.coinSymbol = :symbol AND p.timestamp >= :startTime ORDER BY p.timestamp DESC")
    List<PriceSnapshot> findRecentBySymbol(@Param("symbol") String symbol, @Param("startTime") Instant startTime);
    
    @Query("SELECT DISTINCT p.coinSymbol FROM PriceSnapshot p ORDER BY p.coinSymbol")
    List<String> findDistinctCoinSymbols();
    
    @Query("SELECT COUNT(p) FROM PriceSnapshot p WHERE p.coinSymbol = :symbol")
    Long countByCoinSymbol(@Param("symbol") String symbol);
    
    void deleteByCoinSymbolAndTimestampBefore(String coinSymbol, Instant timestamp);
}
