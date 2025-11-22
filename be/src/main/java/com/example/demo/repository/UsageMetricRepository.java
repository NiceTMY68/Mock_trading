package com.example.demo.repository;

import com.example.demo.entity.UsageMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface UsageMetricRepository extends JpaRepository<UsageMetric, Long> {
    
    List<UsageMetric> findByMetricKeyOrderByCreatedAtDesc(String metricKey);
    
    List<UsageMetric> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    List<UsageMetric> findByMetricKeyAndUserIdOrderByCreatedAtDesc(String metricKey, UUID userId);
    
    @Query("SELECT SUM(u.amount) FROM UsageMetric u WHERE u.metricKey = :metricKey AND u.createdAt >= :since")
    Long sumAmountByMetricKeySince(@Param("metricKey") String metricKey, @Param("since") Instant since);
    
    @Query("SELECT SUM(u.amount) FROM UsageMetric u WHERE u.metricKey = :metricKey AND u.userId = :userId AND u.createdAt >= :since")
    Long sumAmountByMetricKeyAndUserIdSince(
        @Param("metricKey") String metricKey, 
        @Param("userId") UUID userId, 
        @Param("since") Instant since
    );
    
    @Query("SELECT COUNT(u) FROM UsageMetric u WHERE u.metricKey = :metricKey AND u.createdAt >= :since")
    Long countByMetricKeySince(@Param("metricKey") String metricKey, @Param("since") Instant since);
    
    @Query("SELECT u.userId, SUM(u.amount) FROM UsageMetric u WHERE u.metricKey = :metricKey AND u.createdAt >= :since GROUP BY u.userId ORDER BY SUM(u.amount) DESC")
    List<Object[]> getTopUsersByMetricKeySince(@Param("metricKey") String metricKey, @Param("since") Instant since);
    
    @Query("SELECT COUNT(u) FROM UsageMetric u WHERE u.metricKey = :metricKey AND u.userId = :userId")
    Long countByMetricKeyAndUserId(@Param("metricKey") String metricKey, @Param("userId") UUID userId);
    
    @Query("SELECT SUM(u.amount) FROM UsageMetric u WHERE u.metricKey = :metricKey AND u.userId = :userId")
    Long sumAmountByMetricKeyAndUserId(@Param("metricKey") String metricKey, @Param("userId") UUID userId);
}

