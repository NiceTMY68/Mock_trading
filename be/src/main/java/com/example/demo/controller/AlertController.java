package com.example.demo.controller;

import com.example.demo.entity.Alert;
import com.example.demo.service.AlertService;
import com.example.demo.util.ControllerHelper;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;
    private final ControllerHelper controllerHelper;

    @GetMapping
    public ResponseEntity<?> list(Authentication authentication) {
        UUID userId = getCurrentUserId();
        List<Alert> alerts = alertService.listAlerts(userId);
        return ResponseEntity.ok(alerts);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateAlertRequest req, Authentication authentication) {
        UUID userId = getCurrentUserId();
        Alert alert = alertService.createAlert(userId, req.getSymbol(), req.getDirection(), req.getThreshold());
        return ResponseEntity.ok(alert);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        UUID userId = getCurrentUserId();
        alertService.deleteAlert(id, userId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private UUID getCurrentUserId() {
        return controllerHelper.getCurrentUserId();
    }

    @Data
    public static class CreateAlertRequest {
        @NotBlank
        private String symbol;
        @NotNull
        private Alert.Direction direction;
        @NotNull
        private BigDecimal threshold;
    }
}
