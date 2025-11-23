package com.example.demo.service;

import com.example.demo.entity.Holding;
import com.example.demo.repository.HoldingRepository;
import com.example.demo.util.OptimisticLockRetry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class HoldingService {
    
    private final HoldingRepository holdingRepository;
    private final PriceService priceService;
    private final OptimisticLockRetry optimisticLockRetry;
    
    public void updateOnBuy(UUID userId, String symbol, BigDecimal qty, BigDecimal cost, BigDecimal commission) {
        log.debug("Updating holding on BUY: user={}, symbol={}, qty={}, cost={}, commission={}", 
                userId, symbol, qty, cost, commission);
        
        try {
            optimisticLockRetry.executeWithRetry(() -> {
                updateOnBuyInternal(userId, symbol, qty, cost, commission);
            }, "updateOnBuy");
        } catch (OptimisticLockingFailureException | DataIntegrityViolationException e) {
            log.error("Failed to update holding after retries: user={}, symbol={}", userId, symbol, e);
            throw new ResponseStatusException(HttpStatus.CONFLICT, 
                    "Concurrent update detected. Please retry the operation.");
        }
    }
    
    @Transactional
    private void updateOnBuyInternal(UUID userId, String symbol, BigDecimal qty, BigDecimal cost, BigDecimal commission) {
        Optional<Holding> existingHolding = holdingRepository.findByUserIdAndSymbol(userId, symbol);
        
        Holding holding;
        if (existingHolding.isPresent()) {
            holding = existingHolding.get();
            BigDecimal newQuantity = holding.getQuantity().add(qty);
            BigDecimal newTotalCost = holding.getTotalCost().add(cost).add(commission);
            BigDecimal newAverageCost = newTotalCost.divide(newQuantity, 8, RoundingMode.HALF_UP);
            
            holding.setQuantity(newQuantity);
            holding.setTotalCost(newTotalCost);
            holding.setAverageCost(newAverageCost);
        } else {
            BigDecimal totalCost = cost.add(commission);
            BigDecimal averageCost = totalCost.divide(qty, 8, RoundingMode.HALF_UP);
            
            holding = Holding.builder()
                    .userId(userId)
                    .symbol(symbol)
                    .quantity(qty)
                    .averageCost(averageCost)
                    .totalCost(totalCost)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
        }
        
        updateHoldingMarketValue(holding);
        holdingRepository.save(holding);
        
        log.debug("Updated holding: quantity={}, averageCost={}, totalCost={}", 
                holding.getQuantity(), holding.getAverageCost(), holding.getTotalCost());
    }
    
    public void updateOnSell(UUID userId, String symbol, BigDecimal qty, BigDecimal proceeds, BigDecimal commission) {
        log.debug("Updating holding on SELL: user={}, symbol={}, qty={}, proceeds={}, commission={}", 
                userId, symbol, qty, proceeds, commission);
        
        try {
            optimisticLockRetry.executeWithRetry(() -> {
                updateOnSellInternal(userId, symbol, qty, proceeds, commission);
            }, "updateOnSell");
        } catch (OptimisticLockingFailureException | DataIntegrityViolationException e) {
            log.error("Failed to update holding after retries: user={}, symbol={}", userId, symbol, e);
            throw new ResponseStatusException(HttpStatus.CONFLICT, 
                    "Concurrent update detected. Please retry the operation.");
        }
    }
    
    @Transactional
    private void updateOnSellInternal(UUID userId, String symbol, BigDecimal qty, BigDecimal proceeds, BigDecimal commission) {
        Optional<Holding> existingHolding = holdingRepository.findByUserIdAndSymbol(userId, symbol);
        
        if (existingHolding.isEmpty()) {
            throw new RuntimeException("Cannot sell: no holding exists for symbol: " + symbol);
        }
        
        Holding holding = existingHolding.get();
        
        if (holding.getQuantity().compareTo(qty) < 0) {
            throw new RuntimeException("Insufficient holdings: have " + holding.getQuantity() + ", need " + qty);
        }
        
        BigDecimal newQuantity = holding.getQuantity().subtract(qty);
        
        BigDecimal costReduction = holding.getTotalCost()
                .multiply(qty)
                .divide(holding.getQuantity(), 8, RoundingMode.HALF_UP);
        BigDecimal newTotalCost = holding.getTotalCost().subtract(costReduction);
        BigDecimal newAverageCost = newQuantity.compareTo(BigDecimal.ZERO) > 0 ? 
                newTotalCost.divide(newQuantity, 8, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        
        holding.setQuantity(newQuantity);
        holding.setTotalCost(newTotalCost);
        holding.setAverageCost(newAverageCost);
        
        updateHoldingMarketValue(holding);
        holdingRepository.save(holding);
        
        log.debug("Updated holding: quantity={}, averageCost={}, totalCost={}", 
                holding.getQuantity(), holding.getAverageCost(), holding.getTotalCost());
    }
    
    private void updateHoldingMarketValue(Holding holding) {
        Optional<BigDecimal> latestPrice = priceService.getLatestPrice(holding.getSymbol());
        
        if (latestPrice.isPresent()) {
            BigDecimal marketValue = holding.getQuantity().multiply(latestPrice.get());
            BigDecimal unrealizedPnl = marketValue.subtract(holding.getTotalCost());
            
            holding.setMarketValue(marketValue);
            holding.setUnrealizedPnl(unrealizedPnl);
        } else {
            log.warn("No latest price available for symbol: {}, using previous market value", holding.getSymbol());
        }
        
        holding.setUpdatedAt(Instant.now());
    }
}

