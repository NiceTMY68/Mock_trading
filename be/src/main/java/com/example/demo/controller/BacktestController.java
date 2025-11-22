package com.example.demo.controller;

import com.example.demo.dto.BacktestRequest;
import com.example.demo.dto.BacktestResult;
import com.example.demo.service.BacktestService;
import com.example.demo.util.AuditLoggingHelper;
import com.example.demo.util.ControllerHelper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/backtest")
@RequiredArgsConstructor
@Tag(name = "Backtesting", description = "Run backtests on historical price data using SMA crossover strategy")
public class BacktestController {
    
    private final BacktestService backtestService;
    private final ObjectMapper objectMapper;
    private final AuditLoggingHelper auditLoggingHelper;
    private final ControllerHelper controllerHelper;
    
    private UUID getCurrentUserId() {
        return controllerHelper.getCurrentUserId();
    }
    
    @Operation(
        summary = "Run backtest",
        description = "Execute a backtest using SMA20/50 crossover strategy on historical price data. " +
            "Returns performance metrics including net return, win rate, and max drawdown.",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            content = @Content(
                schema = @Schema(implementation = BacktestRequest.class),
                examples = @ExampleObject(
                    name = "BTCUSDT backtest",
                    value = "{\"symbol\":\"BTCUSDT\",\"start\":\"2024-01-01T00:00:00Z\",\"end\":\"2024-03-01T00:00:00Z\",\"strategy\":{\"fast\":20,\"slow\":50}}"
                )
            )
        ),
        responses = {
            @ApiResponse(responseCode = "200", description = "Backtest completed successfully",
                content = @Content(schema = @Schema(implementation = BacktestResult.class))),
            @ApiResponse(responseCode = "400", description = "Invalid parameters or insufficient data")
        }
    )
    @PostMapping
    public ResponseEntity<?> runBacktest(@Valid @RequestBody BacktestRequest request) {
        var ctx = auditLoggingHelper.start("/api/backtest", getCurrentUserId(), 
            objectMapper.valueToTree(request));
        try {
            UUID userId = getCurrentUserId();
            BacktestResult result = backtestService.runBacktest(request, userId);
            JsonNode providerMeta = objectMapper.createObjectNode()
                    .put("symbol", result.getSymbol())
                    .put("totalTrades", result.getTotalTrades())
                    .put("returnPercent", result.getReturnPercent().toString());
            return auditLoggingHelper.ok(ctx, result, "backtest", false, providerMeta);
        } catch (Exception e) {
            log.error("Error running backtest: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, e.getMessage(), org.springframework.http.HttpStatus.BAD_REQUEST, "backtest");
        }
    }
}

