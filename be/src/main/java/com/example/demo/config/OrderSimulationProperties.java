package com.example.demo.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Data
@Configuration
@ConfigurationProperties(prefix = "order.simulation")
public class OrderSimulationProperties {

    /**
     * Percent applied to market order executions to simulate slippage.
     * Example: 0.001 = 0.1% worse price for buys, better for sells.
     */
    private BigDecimal slippagePercent = new BigDecimal("0.001");

    /**
     * Default liquidity threshold (quantity) before partial fill occurs.
     * When zero or negative, partial fill simulation is disabled by default.
     */
    private BigDecimal defaultLiquidityThreshold = BigDecimal.ZERO;

    /**
     * Symbol-specific liquidity thresholds (quantity). Symbol keys should be upper case.
     */
    private Map<String, BigDecimal> liquidityThresholds = new HashMap<>();

    /**
     * Number of decimal places for simulated prices after slippage.
     */
    private int priceScale = 8;

    public BigDecimal resolveLiquidityThreshold(String symbol) {
        if (symbol == null) {
            return defaultLiquidityThreshold;
        }
        return liquidityThresholds.getOrDefault(symbol.toUpperCase(), defaultLiquidityThreshold);
    }
}

