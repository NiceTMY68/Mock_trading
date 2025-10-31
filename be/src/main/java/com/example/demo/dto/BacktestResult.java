package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BacktestResult {
    
    private UUID backtestId;
    private String symbol;
    private BigDecimal initialBalance;
    private BigDecimal finalBalance;
    private BigDecimal netReturn;
    private BigDecimal returnPercent;
    private BigDecimal winRate;
    private Integer totalTrades;
    private Integer winningTrades;
    private BigDecimal maxDrawdown;
    private Integer dataPoints;
}

