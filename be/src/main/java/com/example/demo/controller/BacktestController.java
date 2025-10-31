package com.example.demo.controller;

import com.example.demo.dto.BacktestRequest;
import com.example.demo.dto.BacktestResult;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.BacktestService;
import com.example.demo.util.AuditLoggingHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/backtest")
@RequiredArgsConstructor
public class BacktestController {
    
    private final BacktestService backtestService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final AuditLoggingHelper auditLoggingHelper;
    
    private UUID getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                String email = auth.getName();
                return userRepository.findByEmail(email).map(User::getId).orElse(null);
            }
        } catch (Exception e) {
            log.debug("Could not get current user", e);
        }
        return null;
    }
    
    @PostMapping
    public ResponseEntity<?> runBacktest(@Valid @RequestBody BacktestRequest request) {
        var ctx = auditLoggingHelper.start("/api/backtest", getCurrentUserId(), 
            objectMapper.valueToTree(request));
        try {
            UUID userId = getCurrentUserId();
            BacktestResult result = backtestService.runBacktest(request, userId);
            auditLoggingHelper.finishSuccess(ctx, "backtest", 
                objectMapper.createObjectNode()
                    .put("symbol", result.getSymbol())
                    .put("totalTrades", result.getTotalTrades())
                    .put("returnPercent", result.getReturnPercent().toString()));
            return auditLoggingHelper.ok(ctx, result);
        } catch (Exception e) {
            log.error("Error running backtest: {}", e.getMessage(), e);
            auditLoggingHelper.finishError(ctx, "backtest", e.getMessage());
            return auditLoggingHelper.error(ctx, e.getMessage(), org.springframework.http.HttpStatus.BAD_REQUEST);
        }
    }
}

