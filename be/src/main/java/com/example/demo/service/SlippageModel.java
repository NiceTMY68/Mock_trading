package com.example.demo.service;

import com.example.demo.config.OrderSimulationProperties;
import com.example.demo.entity.Order;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Component
@RequiredArgsConstructor
public class SlippageModel {

    private final OrderSimulationProperties simulationProperties;

    public BigDecimal apply(Order.OrderSide side, BigDecimal basePrice) {
        if (basePrice == null) {
            return null;
        }
        BigDecimal slippagePercent = simulationProperties.getSlippagePercent();
        if (slippagePercent == null || slippagePercent.compareTo(BigDecimal.ZERO) <= 0) {
            return basePrice;
        }

        BigDecimal factor = side == Order.OrderSide.SELL
                ? BigDecimal.ONE.subtract(slippagePercent)
                : BigDecimal.ONE.add(slippagePercent);

        BigDecimal adjusted = basePrice.multiply(factor);
        int scale = Math.max(simulationProperties.getPriceScale(), basePrice.scale());
        BigDecimal normalized = adjusted.setScale(scale, RoundingMode.HALF_UP);

        log.debug("Applied slippage: base {} -> adjusted {} for side {}", basePrice, normalized, side);
        return normalized;
    }
}

