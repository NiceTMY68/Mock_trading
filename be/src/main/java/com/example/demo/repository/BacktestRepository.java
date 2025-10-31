package com.example.demo.repository;

import com.example.demo.entity.Backtest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BacktestRepository extends JpaRepository<Backtest, UUID> {
    
    List<Backtest> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    List<Backtest> findBySymbolOrderByCreatedAtDesc(String symbol);
}

