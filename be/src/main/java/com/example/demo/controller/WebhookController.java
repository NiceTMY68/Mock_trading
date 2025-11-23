package com.example.demo.controller;

import com.example.demo.entity.WebhookEvent;
import com.example.demo.service.BillingService;
import com.example.demo.service.WebhookDeduplicationService;
import com.stripe.model.Event;
import com.stripe.net.Webhook;
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
    private final WebhookDeduplicationService webhookDeduplicationService;
    
    private static final String PROVIDER_STRIPE = "stripe";
    
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
            
            Event event = Webhook.constructEvent(payload, sigHeader, billingService.getWebhookSecret());
            String eventId = event.getId();
            
            WebhookEvent existingEvent = webhookDeduplicationService.findExistingEvent(eventId)
                    .orElse(null);
            
            if (existingEvent != null) {
                if (existingEvent.isProcessed()) {
                    log.info("Webhook event {} already processed, skipping", eventId);
                    return ResponseEntity.ok(Map.of("status", "success", "message", "Event already processed"));
                } else {
                    log.warn("Webhook event {} exists but not processed, marking as processed", eventId);
                    webhookDeduplicationService.markAsProcessed(eventId);
                    return ResponseEntity.ok(Map.of("status", "success", "message", "Event marked as processed"));
                }
            }
            
            com.fasterxml.jackson.databind.JsonNode payloadJson = webhookDeduplicationService.parsePayload(payload);
            webhookDeduplicationService.saveEvent(PROVIDER_STRIPE, eventId, payloadJson);
            
            billingService.handleStripeEvent(event);
            webhookDeduplicationService.markAsProcessed(eventId);
            
            log.info("Successfully processed Stripe webhook event {}", eventId);
            return ResponseEntity.ok(Map.of("status", "success"));
            
        } catch (com.stripe.exception.SignatureVerificationException e) {
            log.error("Invalid webhook signature: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid webhook signature"));
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