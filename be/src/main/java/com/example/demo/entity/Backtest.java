package com.example.demo.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "backtests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Backtest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "user_id", nullable = true)
    private UUID userId;
    
    @Column(name = "symbol", nullable = false, length = 20)
    private String symbol;
    
    @Column(name = "start_time", nullable = false)
    private Instant startTime;
    
    @Column(name = "end_time", nullable = false)
    private Instant endTime;
    
    @Column(name = "strategy_type", nullable = false, length = 50)
    private String strategyType;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "strategy_params", columnDefinition = "json")
    private JsonNode strategyParams;
    
    @Column(name = "initial_balance", precision = 18, scale = 8)
    private BigDecimal initialBalance;
    
    @Column(name = "final_balance", precision = 18, scale = 8)
    private BigDecimal finalBalance;
    
    @Column(name = "net_return", precision = 18, scale = 8)
    private BigDecimal netReturn;
    
    @Column(name = "return_percent", precision = 10, scale = 4)
    private BigDecimal returnPercent;
    
    @Column(name = "win_rate", precision = 5, scale = 2)
    private BigDecimal winRate;
    
    @Column(name = "total_trades")
    private Integer totalTrades;
    
    @Column(name = "winning_trades")
    private Integer winningTrades;
    
    @Column(name = "max_drawdown", precision = 10, scale = 4)
    private BigDecimal maxDrawdown;
    
    @Column(name = "data_points")
    private Integer dataPoints;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}

