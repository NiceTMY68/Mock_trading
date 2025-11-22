package com.example.demo.controller;

import com.example.demo.dto.CreateAlertDto;
import com.example.demo.entity.Alert;
import com.example.demo.service.AlertService;
import com.example.demo.util.ControllerHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<?> create(@RequestBody CreateAlertDto dto, Authentication authentication) {
        UUID userId = getCurrentUserId();
        Alert alert = alertService.createAlert(userId, dto.getSymbol(), dto.getDirection(), dto.getThreshold());
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
}
