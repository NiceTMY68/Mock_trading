package com.example.demo.repository;

import com.example.demo.entity.Trade;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TradeRepository extends JpaRepository<Trade, Long> {
    
    Optional<Trade> findByTradeId(UUID tradeId);
    
    List<Trade> findByUserIdOrderByExecutedAtDesc(UUID userId);
    
    Page<Trade> findByUserIdOrderByExecutedAtDesc(UUID userId, Pageable pageable);
    
    List<Trade> findByUserIdAndSymbolOrderByExecutedAtDesc(UUID userId, String symbol);
    
    List<Trade> findByOrderId(Long orderId);
    
    @Query("SELECT t FROM Trade t WHERE t.userId = :userId AND t.symbol = :symbol AND t.executedAt >= :fromDate ORDER BY t.executedAt DESC")
    List<Trade> findByUserIdAndSymbolAndExecutedAtAfterOrderByExecutedAtDesc(
            @Param("userId") UUID userId, 
            @Param("symbol") String symbol, 
            @Param("fromDate") Instant fromDate);
    
    @Query("SELECT SUM(t.quantity) FROM Trade t WHERE t.userId = :userId AND t.symbol = :symbol AND t.side = 'BUY'")
    BigDecimal getTotalBuyQuantityByUserIdAndSymbol(@Param("userId") UUID userId, @Param("symbol") String symbol);
    
    @Query("SELECT SUM(t.quantity) FROM Trade t WHERE t.userId = :userId AND t.symbol = :symbol AND t.side = 'SELL'")
    BigDecimal getTotalSellQuantityByUserIdAndSymbol(@Param("userId") UUID userId, @Param("symbol") String symbol);
    
    @Query("SELECT SUM(t.totalAmount) FROM Trade t WHERE t.userId = :userId AND t.symbol = :symbol AND t.side = 'BUY'")
    BigDecimal getTotalBuyAmountByUserIdAndSymbol(@Param("userId") UUID userId, @Param("symbol") String symbol);
    
    @Query("SELECT SUM(t.totalAmount) FROM Trade t WHERE t.userId = :userId AND t.symbol = :symbol AND t.side = 'SELL'")
    BigDecimal getTotalSellAmountByUserIdAndSymbol(@Param("userId") UUID userId, @Param("symbol") String symbol);
}
