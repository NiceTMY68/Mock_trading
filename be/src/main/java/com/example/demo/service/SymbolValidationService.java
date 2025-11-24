package com.example.demo.service;

import com.example.demo.client.binance.model.BinanceSymbolInfo;
import com.example.demo.client.binance.service.BinanceRestClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class SymbolValidationService {

    private static final BigDecimal EPSILON = new BigDecimal("0.00000001");

    private final BinanceRestClient binanceRestClient;
    private final Map<String, BinanceSymbolInfo> symbolCache = new ConcurrentHashMap<>();

    public void validateOrder(String symbol, BigDecimal quantity, BigDecimal referencePrice) {
        BinanceSymbolInfo symbolInfo = resolveSymbolInfo(symbol);
        if (symbolInfo == null) {
            throw new IllegalArgumentException("Symbol " + symbol + " is not supported");
        }

        validateQuantityStep(symbolInfo, quantity);
        validateMinimumQuantity(symbolInfo, quantity);
        validateNotional(symbolInfo, quantity, referencePrice);
    }

    private BinanceSymbolInfo resolveSymbolInfo(String symbol) {
        if (symbol == null) {
            return null;
        }
        String normalized = symbol.toUpperCase();
        return symbolCache.computeIfAbsent(normalized, key ->
                binanceRestClient.getAllSymbols().stream()
                        .filter(info -> key.equalsIgnoreCase(info.getSymbol()))
                        .findFirst()
                        .orElse(null));
    }

    private void validateQuantityStep(BinanceSymbolInfo info, BigDecimal quantity) {
        Optional<BigDecimal> stepSize = findLotSizeFilter(info)
                .map(filter -> parseDecimal(filter.getStepSize()));

        stepSize.filter(step -> step.compareTo(BigDecimal.ZERO) > 0)
                .ifPresent(step -> {
                    BigDecimal remainder = quantity.remainder(step);
                    if (remainder.abs().compareTo(EPSILON) > 0) {
                        throw new IllegalArgumentException(
                                String.format("Quantity %s must be a multiple of tick size %s", quantity, step));
                    }
                });
    }

    private void validateMinimumQuantity(BinanceSymbolInfo info, BigDecimal quantity) {
        Optional<BigDecimal> minQty = findLotSizeFilter(info)
                .map(filter -> parseDecimal(filter.getMinQty()));

        minQty.filter(min -> min.compareTo(BigDecimal.ZERO) > 0)
                .ifPresent(min -> {
                    if (quantity.compareTo(min) < 0) {
                        throw new IllegalArgumentException(
                                String.format("Quantity %s is below minimum lot size %s", quantity, min));
                    }
                });
    }

    private void validateNotional(BinanceSymbolInfo info, BigDecimal quantity, BigDecimal referencePrice) {
        if (referencePrice == null) {
            return;
        }
        Optional<BigDecimal> minNotional = findMinNotionalFilter(info)
                .map(filter -> parseDecimal(filter.getMinNotional()));

        minNotional.filter(min -> min.compareTo(BigDecimal.ZERO) > 0)
                .ifPresent(min -> {
                    BigDecimal notional = quantity.multiply(referencePrice);
                    if (notional.compareTo(min) < 0) {
                        throw new IllegalArgumentException(
                                String.format("Order notional %s is below minimum notional %s", notional, min));
                    }
                });
    }

    private Optional<BinanceSymbolInfo.Filter> findLotSizeFilter(BinanceSymbolInfo info) {
        return info.getFilters() == null ? Optional.empty() : info.getFilters().stream()
                .filter(filter -> "LOT_SIZE".equalsIgnoreCase(filter.getFilterType()))
                .findFirst();
    }

    private Optional<BinanceSymbolInfo.Filter> findMinNotionalFilter(BinanceSymbolInfo info) {
        return info.getFilters() == null ? Optional.empty() : info.getFilters().stream()
                .filter(filter -> "MIN_NOTIONAL".equalsIgnoreCase(filter.getFilterType()))
                .findFirst();
    }

    private BigDecimal parseDecimal(String value) {
        try {
            return value == null ? BigDecimal.ZERO : new BigDecimal(value);
        } catch (NumberFormatException e) {
            log.warn("Unable to parse decimal value '{}': {}", value, e.getMessage());
            return BigDecimal.ZERO;
        }
    }
}

