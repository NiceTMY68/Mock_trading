package com.example.demo.controller;

import com.example.demo.service.BillingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class WebhookController {
    
    private final BillingService billingService;
    
    @PostMapping("/stripe")
    public ResponseEntity<Map<String, String>> handleStripeWebhook(
            HttpServletRequest request) {
        
        try {
            String payload = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            String sigHeader = request.getHeader("Stripe-Signature");
            
            if (sigHeader == null) {
                log.warn("Missing Stripe signature header");
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Missing Stripe signature header"));
            }
            
            billingService.handleStripeWebhook(payload, sigHeader);
            
            log.info("Successfully processed Stripe webhook");
            return ResponseEntity.ok(Map.of("status", "success"));
            
        } catch (IOException e) {
            log.error("Error reading request body: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Error reading request body"));
        } catch (Exception e) {
            log.error("Error processing Stripe webhook: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Error processing webhook"));
        }
    }
    
    @GetMapping("/stripe/test")
    public ResponseEntity<Map<String, String>> testWebhookEndpoint() {
        log.info("Stripe webhook endpoint is accessible");
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Stripe webhook endpoint is working"
        ));
    }
}
