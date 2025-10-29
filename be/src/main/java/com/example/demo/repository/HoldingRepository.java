package com.example.demo.repository;

import com.example.demo.entity.Holding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HoldingRepository extends JpaRepository<Holding, Long> {
    
    Optional<Holding> findByUserIdAndSymbol(UUID userId, String symbol);
    
    List<Holding> findByUserIdOrderBySymbol(UUID userId);
    
    List<Holding> findByUserIdAndQuantityGreaterThanOrderBySymbol(UUID userId, BigDecimal minQuantity);
    
    @Query("SELECT h FROM Holding h WHERE h.userId = :userId AND h.quantity > 0 ORDER BY h.marketValue DESC")
    List<Holding> findNonZeroHoldingsByUserIdOrderByMarketValueDesc(@Param("userId") UUID userId);
    
    @Query("SELECT SUM(h.marketValue) FROM Holding h WHERE h.userId = :userId")
    BigDecimal getTotalMarketValueByUserId(@Param("userId") UUID userId);
    
    @Query("SELECT SUM(h.unrealizedPnl) FROM Holding h WHERE h.userId = :userId")
    BigDecimal getTotalUnrealizedPnlByUserId(@Param("userId") UUID userId);
    
    @Query("SELECT COUNT(h) FROM Holding h WHERE h.userId = :userId AND h.quantity > 0")
    Long countNonZeroHoldingsByUserId(@Param("userId") UUID userId);
    
    boolean existsByUserIdAndSymbol(UUID userId, String symbol);
}
