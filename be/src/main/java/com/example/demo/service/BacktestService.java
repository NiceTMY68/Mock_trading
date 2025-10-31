package com.example.demo.service;

import com.example.demo.dto.BacktestRequest;
import com.example.demo.dto.BacktestResult;
import com.example.demo.entity.Backtest;
import com.example.demo.entity.PriceSnapshot;
import com.example.demo.exception.BadRequestException;
import com.example.demo.repository.BacktestRepository;
import com.example.demo.repository.PriceSnapshotRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BacktestService {
    
    private static final BigDecimal DEFAULT_INITIAL_BALANCE = BigDecimal.valueOf(10000);
    @org.springframework.beans.factory.annotation.Value("${app.backtest.max-points:10000}")
    private int maxDataPoints;
    @org.springframework.beans.factory.annotation.Value("${app.backtest.max-range-days:365}")
    private int maxRangeDays;
    
    private final PriceSnapshotRepository priceSnapshotRepository;
    private final BacktestRepository backtestRepository;
    private final ObjectMapper objectMapper;
    
    @Transactional
    public BacktestResult runBacktest(BacktestRequest req, UUID userId) {
        validateRequest(req);
        
        List<PriceSnapshot> snapshots = loadSnapshots(req.getSymbol(), req.getStart(), req.getEnd());
        
        if (snapshots.size() < Math.max(req.getFastPeriod(), req.getSlowPeriod())) {
            throw new BadRequestException(
                String.format("Insufficient data points: %d. Need at least %d for strategy", 
                    snapshots.size(), Math.max(req.getFastPeriod(), req.getSlowPeriod()))
            );
        }
        
        int fastPeriod = req.getFastPeriod();
        int slowPeriod = req.getSlowPeriod();
        
        List<PriceData> priceData = calculateSMAs(snapshots, fastPeriod, slowPeriod);
        TradeSimulation simulation = simulateTrades(priceData, DEFAULT_INITIAL_BALANCE);
        
        Backtest backtest = persistBacktest(req, userId, simulation, snapshots.size(), fastPeriod, slowPeriod);
        
        return buildResult(backtest, simulation);
    }
    
    private void validateRequest(BacktestRequest req) {
        if (req.getSymbol() == null || req.getSymbol().isEmpty()) {
            throw new BadRequestException("Symbol is required");
        }
        
        if (req.getStart() == null || req.getEnd() == null) {
            throw new BadRequestException("Start and end times are required");
        }
        
        if (req.getEnd().isBefore(req.getStart()) || req.getEnd().equals(req.getStart())) {
            throw new BadRequestException("End time must be after start time");
        }
        
        if (req.getFastPeriod() == null || req.getSlowPeriod() == null) {
            throw new BadRequestException("Strategy parameters (fast, slow) are required");
        }
        
        if (req.getFastPeriod() <= 0 || req.getSlowPeriod() <= 0) {
            throw new BadRequestException("Strategy periods must be positive");
        }
        
        if (req.getFastPeriod() >= req.getSlowPeriod()) {
            throw new BadRequestException("Fast period must be less than slow period");
        }
        
        long daysBetween = java.time.Duration.between(req.getStart(), req.getEnd()).toDays();
        if (daysBetween > maxRangeDays) {
            throw new BadRequestException("Date range cannot exceed 365 days");
        }
    }
    
    private List<PriceSnapshot> loadSnapshots(String symbol, Instant start, Instant end) {
        List<PriceSnapshot> snapshots = priceSnapshotRepository
            .findByCoinSymbolAndTimestampBetweenOrderByTimestampDesc(symbol.toUpperCase(), start, end);
        
        if (snapshots.isEmpty()) {
            throw new BadRequestException(
                String.format("No price data found for symbol %s in the specified date range", symbol)
            );
        }
        
        if (snapshots.size() > maxDataPoints) {
            throw new BadRequestException(
                String.format("Too many data points: %d. Maximum allowed: %d", snapshots.size(), maxDataPoints)
            );
        }
        
        List<PriceSnapshot> sorted = new ArrayList<>(snapshots);
        sorted.sort((a, b) -> a.getTimestamp().compareTo(b.getTimestamp()));
        
        return sorted;
    }
    
    private List<PriceData> calculateSMAs(List<PriceSnapshot> snapshots, int fastPeriod, int slowPeriod) {
        List<PriceData> priceData = new ArrayList<>();
        
        for (int i = 0; i < snapshots.size(); i++) {
            PriceSnapshot snapshot = snapshots.get(i);
            BigDecimal price = snapshot.getClose();
            
            BigDecimal smaFast = null;
            BigDecimal smaSlow = null;
            
            if (i >= fastPeriod - 1) {
                smaFast = calculateSMA(snapshots, i - fastPeriod + 1, i, fastPeriod);
            }
            
            if (i >= slowPeriod - 1) {
                smaSlow = calculateSMA(snapshots, i - slowPeriod + 1, i, slowPeriod);
            }
            
            priceData.add(new PriceData(snapshot.getTimestamp(), price, smaFast, smaSlow));
        }
        
        return priceData;
    }
    
    private BigDecimal calculateSMA(List<PriceSnapshot> snapshots, int start, int end, int period) {
        BigDecimal sum = BigDecimal.ZERO;
        for (int i = start; i <= end; i++) {
            sum = sum.add(snapshots.get(i).getClose());
        }
        return sum.divide(BigDecimal.valueOf(period), 8, RoundingMode.HALF_UP);
    }
    
    private TradeSimulation simulateTrades(List<PriceData> priceData, BigDecimal initialBalance) {
        BigDecimal cash = initialBalance;
        BigDecimal holdings = BigDecimal.ZERO;
        BigDecimal entryPrice = null;
        BigDecimal entryValue = null;
        
        List<Trade> trades = new ArrayList<>();
        List<BigDecimal> equityCurve = new ArrayList<>();
        
        boolean inPosition = false;
        
        for (int i = 1; i < priceData.size(); i++) {
            PriceData prev = priceData.get(i - 1);
            PriceData curr = priceData.get(i);
            
            equityCurve.add(calculateEquity(cash, holdings, curr.price()));
            
            if (prev.smaFast() == null || prev.smaSlow() == null || 
                curr.smaFast() == null || curr.smaSlow() == null) {
                continue;
            }
            
            boolean prevAbove = prev.smaFast().compareTo(prev.smaSlow()) > 0;
            boolean currAbove = curr.smaFast().compareTo(curr.smaSlow()) > 0;
            
            if (!prevAbove && currAbove && !inPosition) {
                holdings = cash.divide(curr.price(), 8, RoundingMode.HALF_UP);
                entryPrice = curr.price();
                entryValue = cash;
                cash = BigDecimal.ZERO;
                inPosition = true;
            } else if (prevAbove && !currAbove && inPosition) {
                cash = holdings.multiply(curr.price());
                BigDecimal pnl = cash.subtract(entryValue);
                trades.add(new Trade(entryPrice, curr.price(), true, pnl));
                holdings = BigDecimal.ZERO;
                entryPrice = null;
                entryValue = null;
                inPosition = false;
            }
        }
        
        if (inPosition && entryPrice != null && entryValue != null) {
            BigDecimal exitPrice = priceData.get(priceData.size() - 1).price();
            cash = holdings.multiply(exitPrice);
            BigDecimal pnl = cash.subtract(entryValue);
            trades.add(new Trade(entryPrice, exitPrice, true, pnl));
        }
        
        BigDecimal finalBalance = calculateEquity(cash, holdings, priceData.get(priceData.size() - 1).price());
        
        return new TradeSimulation(initialBalance, finalBalance, trades, equityCurve);
    }
    
    private BigDecimal calculateEquity(BigDecimal cash, BigDecimal holdings, BigDecimal currentPrice) {
        return cash.add(holdings.multiply(currentPrice));
    }
    
    private BigDecimal calculateMaxDrawdown(List<BigDecimal> equityCurve) {
        if (equityCurve.isEmpty()) {
            return BigDecimal.ZERO;
        }
        
        BigDecimal maxEquity = equityCurve.get(0);
        BigDecimal maxDrawdown = BigDecimal.ZERO;
        
        for (BigDecimal equity : equityCurve) {
            if (equity.compareTo(maxEquity) > 0) {
                maxEquity = equity;
            }
            
            BigDecimal drawdown = maxEquity.subtract(equity)
                .divide(maxEquity, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
            
            if (drawdown.compareTo(maxDrawdown) > 0) {
                maxDrawdown = drawdown;
            }
        }
        
        return maxDrawdown;
    }
    
    private Backtest persistBacktest(BacktestRequest req, UUID userId, TradeSimulation simulation, 
                                     int dataPoints, int fastPeriod, int slowPeriod) {
        BigDecimal netReturn = simulation.finalBalance().subtract(simulation.initialBalance());
        BigDecimal returnPercent = netReturn.divide(simulation.initialBalance(), 4, RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100));
        
        long winningTrades = simulation.trades().stream()
            .filter(t -> t.pnl().compareTo(BigDecimal.ZERO) > 0)
            .count();
        
        BigDecimal winRate = simulation.trades().isEmpty() ? BigDecimal.ZERO :
            BigDecimal.valueOf(winningTrades)
                .divide(BigDecimal.valueOf(simulation.trades().size()), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
        
        BigDecimal maxDrawdown = calculateMaxDrawdown(simulation.equityCurve());
        
        ObjectNode strategyParams = objectMapper.createObjectNode();
        strategyParams.put("fast", fastPeriod);
        strategyParams.put("slow", slowPeriod);
        
        Backtest backtest = Backtest.builder()
            .userId(userId)
            .symbol(req.getSymbol().toUpperCase())
            .startTime(req.getStart())
            .endTime(req.getEnd())
            .strategyType("SMA_CROSSOVER")
            .strategyParams(strategyParams)
            .initialBalance(simulation.initialBalance())
            .finalBalance(simulation.finalBalance())
            .netReturn(netReturn)
            .returnPercent(returnPercent)
            .winRate(winRate)
            .totalTrades(simulation.trades().size())
            .winningTrades((int) winningTrades)
            .maxDrawdown(maxDrawdown)
            .dataPoints(dataPoints)
            .build();
        
        return backtestRepository.save(backtest);
    }
    
    private BacktestResult buildResult(Backtest backtest, TradeSimulation simulation) {
        return BacktestResult.builder()
            .backtestId(backtest.getId())
            .symbol(backtest.getSymbol())
            .initialBalance(backtest.getInitialBalance())
            .finalBalance(backtest.getFinalBalance())
            .netReturn(backtest.getNetReturn())
            .returnPercent(backtest.getReturnPercent())
            .winRate(backtest.getWinRate())
            .totalTrades(backtest.getTotalTrades())
            .winningTrades(backtest.getWinningTrades())
            .maxDrawdown(backtest.getMaxDrawdown())
            .dataPoints(backtest.getDataPoints())
            .build();
    }
    
    private record PriceData(Instant timestamp, BigDecimal price, BigDecimal smaFast, BigDecimal smaSlow) {}
    
    private record Trade(BigDecimal entryPrice, BigDecimal exitPrice, boolean isLong, BigDecimal pnl) {}
    
    private record TradeSimulation(
        BigDecimal initialBalance,
        BigDecimal finalBalance,
        List<Trade> trades,
        List<BigDecimal> equityCurve
    ) {}
}

