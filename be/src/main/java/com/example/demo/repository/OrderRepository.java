package com.example.demo.repository;

import com.example.demo.entity.Order;
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
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    Optional<Order> findByOrderId(UUID orderId);
    
    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    Page<Order> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    
    List<Order> findByUserIdAndStatusOrderByCreatedAtDesc(UUID userId, Order.OrderStatus status);
    
    List<Order> findByUserIdAndSymbolOrderByCreatedAtDesc(UUID userId, String symbol);
    
    @Query("SELECT o FROM Order o WHERE o.userId = :userId AND o.symbol = :symbol AND o.status IN :statuses ORDER BY o.createdAt DESC")
    List<Order> findByUserIdAndSymbolAndStatusInOrderByCreatedAtDesc(
            @Param("userId") UUID userId, 
            @Param("symbol") String symbol, 
            @Param("statuses") List<Order.OrderStatus> statuses);
    
    @Query("SELECT COUNT(o) FROM Order o WHERE o.userId = :userId AND o.createdAt >= :fromDate")
    Long countOrdersByUserIdSince(@Param("userId") UUID userId, @Param("fromDate") Instant fromDate);
    
    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.userId = :userId AND o.side = 'BUY' AND o.status = 'FILLED' AND o.createdAt >= :fromDate")
    BigDecimal getTotalBuyAmountByUserIdSince(@Param("userId") UUID userId, @Param("fromDate") Instant fromDate);
    
    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.userId = :userId AND o.side = 'SELL' AND o.status = 'FILLED' AND o.createdAt >= :fromDate")
    BigDecimal getTotalSellAmountByUserIdSince(@Param("userId") UUID userId, @Param("fromDate") Instant fromDate);
    
    List<Order> findByStatusOrderByCreatedAtAsc(Order.OrderStatus status);
}
