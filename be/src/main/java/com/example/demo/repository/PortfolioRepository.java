package com.example.demo.repository;

import com.example.demo.entity.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {
    
    Optional<Portfolio> findByUserId(UUID userId);
    
    @Query("SELECT p FROM Portfolio p WHERE p.userId = :userId")
    Optional<Portfolio> findPortfolioByUserId(@Param("userId") UUID userId);
    
    boolean existsByUserId(UUID userId);
}
