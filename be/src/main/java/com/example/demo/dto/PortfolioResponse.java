package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioResponse {
    
    private BigDecimal virtualBalance;
    private BigDecimal totalInvested;
    private BigDecimal totalMarketValue;
    private BigDecimal totalPnl;
    private BigDecimal totalPnlPercentage;
    private List<HoldingResponse> holdings;
    private Instant updatedAt;
}
