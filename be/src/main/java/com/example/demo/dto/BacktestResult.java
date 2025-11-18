package com.example.demo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
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
@Schema(description = "Backtest result with performance metrics")
public class BacktestResult {
    
    @Schema(description = "Unique backtest identifier")
    private UUID backtestId;
    
    @Schema(description = "Trading symbol", example = "BTCUSDT")
    private String symbol;
    
    @Schema(description = "Initial balance", example = "10000.00")
    private BigDecimal initialBalance;
    
    @Schema(description = "Final balance after backtest", example = "11500.00")
    private BigDecimal finalBalance;
    
    @Schema(description = "Net return (profit/loss)", example = "1500.00")
    private BigDecimal netReturn;
    
    @Schema(description = "Return percentage", example = "15.00")
    private BigDecimal returnPercent;
    
    @Schema(description = "Win rate percentage", example = "65.50")
    private BigDecimal winRate;
    
    @Schema(description = "Total number of trades", example = "12")
    private Integer totalTrades;
    
    @Schema(description = "Number of winning trades", example = "8")
    private Integer winningTrades;
    
    @Schema(description = "Maximum drawdown percentage", example = "8.50")
    private BigDecimal maxDrawdown;
    
    @Schema(description = "Number of data points used", example = "1500")
    private Integer dataPoints;
}

