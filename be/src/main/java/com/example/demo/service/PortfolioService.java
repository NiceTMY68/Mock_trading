package com.example.demo.service;

import com.example.demo.entity.Holding;
import com.example.demo.entity.Portfolio;
import com.example.demo.repository.HoldingRepository;
import com.example.demo.repository.PortfolioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PortfolioService {
    
    private final PortfolioRepository portfolioRepository;
    private final HoldingRepository holdingRepository;
    private final PriceService priceService;
    
    private static final BigDecimal INITIAL_BALANCE = BigDecimal.valueOf(10000);
    
    @Transactional
    public void recalculate(UUID userId) {
        log.debug("Recalculating portfolio for user: {}", userId);
        
        Portfolio portfolio = portfolioRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultPortfolio(userId));
        
        List<Holding> holdings = holdingRepository.findByUserIdOrderBySymbol(userId);
        
        BigDecimal totalMarketValue = BigDecimal.ZERO;
        BigDecimal totalUnrealizedPnl = BigDecimal.ZERO;
        
        for (Holding holding : holdings) {
            Optional<BigDecimal> latestPrice = priceService.getLatestPrice(holding.getSymbol());
            
            if (latestPrice.isPresent()) {
                BigDecimal marketValue = holding.getQuantity().multiply(latestPrice.get());
                BigDecimal unrealizedPnl = marketValue.subtract(holding.getTotalCost());
                
                holding.setMarketValue(marketValue);
                holding.setUnrealizedPnl(unrealizedPnl);
                holding.setUpdatedAt(Instant.now());
                holdingRepository.save(holding);
                
                totalMarketValue = totalMarketValue.add(marketValue);
                totalUnrealizedPnl = totalUnrealizedPnl.add(unrealizedPnl);
            } else {
                log.warn("No latest price for symbol: {}, using existing market value", holding.getSymbol());
                if (holding.getMarketValue() != null) {
                    totalMarketValue = totalMarketValue.add(holding.getMarketValue());
                }
                if (holding.getUnrealizedPnl() != null) {
                    totalUnrealizedPnl = totalUnrealizedPnl.add(holding.getUnrealizedPnl());
                }
            }
        }
        
        portfolio.setTotalMarketValue(totalMarketValue);
        
        BigDecimal totalPnl = totalMarketValue.add(portfolio.getVirtualBalance()).subtract(INITIAL_BALANCE);
        portfolio.setTotalPnl(totalPnl);
        
        if (portfolio.getTotalInvested().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal pnlPercentage = totalPnl.divide(portfolio.getTotalInvested(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            portfolio.setTotalPnlPercentage(pnlPercentage);
        } else {
            portfolio.setTotalPnlPercentage(BigDecimal.ZERO);
        }
        
        portfolio.setUpdatedAt(Instant.now());
        portfolioRepository.save(portfolio);
        
        log.debug("Portfolio recalculated: totalMarketValue={}, totalPnl={}, totalPnlPercentage={}", 
                totalMarketValue, totalPnl, portfolio.getTotalPnlPercentage());
    }
    
    @Transactional
    public void updateBalance(UUID userId, BigDecimal amount, boolean isBuy) {
        Portfolio portfolio = portfolioRepository.findByUserId(userId)
                .orElseGet(() -> createDefaultPortfolio(userId));
        
        if (isBuy) {
            portfolio.setVirtualBalance(portfolio.getVirtualBalance().subtract(amount));
            portfolio.setTotalInvested(portfolio.getTotalInvested().add(amount));
        } else {
            portfolio.setVirtualBalance(portfolio.getVirtualBalance().add(amount));
            BigDecimal newTotalInvested = portfolio.getTotalInvested().subtract(amount);
            if (newTotalInvested.compareTo(BigDecimal.ZERO) < 0) {
                newTotalInvested = BigDecimal.ZERO;
            }
            portfolio.setTotalInvested(newTotalInvested);
        }
        
        portfolio.setUpdatedAt(Instant.now());
        portfolioRepository.save(portfolio);
    }
    
    private Portfolio createDefaultPortfolio(UUID userId) {
        return Portfolio.builder()
                .userId(userId)
                .virtualBalance(INITIAL_BALANCE)
                .totalInvested(BigDecimal.ZERO)
                .totalMarketValue(BigDecimal.ZERO)
                .totalPnl(BigDecimal.ZERO)
                .totalPnlPercentage(BigDecimal.ZERO)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }
}

