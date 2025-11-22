package com.example.demo.service;

import com.example.demo.entity.Subscription;
import com.example.demo.entity.User;
import com.example.demo.repository.SubscriptionRepository;
import com.example.demo.repository.UserRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.model.Customer;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BillingService {
    
    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    
    @Value("${stripe.secret-key:sk_test_dummy_key_for_testing_only}")
    private String stripeSecretKey;
    
    @Value("${stripe.webhook-secret:whsec_test_dummy_webhook_secret_for_testing_only}")
    private String stripeWebhookSecret;
    
    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;
    
    @PostConstruct
    public void init() {
        if (stripeSecretKey != null && !stripeSecretKey.isEmpty()) {
            Stripe.apiKey = stripeSecretKey;
        }
    }
    
    public String createCheckoutSession(UUID userId, String planId, String successUrl, String cancelUrl) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));
            
            String customerId = getOrCreateStripeCustomer(user);
            
            SessionCreateParams.Builder sessionBuilder = SessionCreateParams.builder()
                    .setCustomer(customerId)
                    .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                    .setSuccessUrl(successUrl != null ? successUrl : baseUrl + "/billing/success")
                    .setCancelUrl(cancelUrl != null ? cancelUrl : baseUrl + "/billing/cancel")
                    .addLineItem(
                            SessionCreateParams.LineItem.builder()
                                    .setPrice(getPriceIdForPlan(planId))
                                    .setQuantity(1L)
                                    .build()
                    )
                    .putMetadata("userId", userId.toString())
                    .putMetadata("planId", planId);
            
            Session session = Session.create(sessionBuilder.build());
            
            log.info("Created checkout session {} for user {} with plan {}", 
                    session.getId(), userId, planId);
            
            return session.getUrl();
            
        } catch (StripeException e) {
            log.error("Failed to create checkout session for user {}: {}", userId, e.getMessage());
            throw new RuntimeException("Failed to create checkout session", e);
        }
    }
    
    public void handleStripeWebhook(String payload, String sigHeader) {
        try {
            Event event = Webhook.constructEvent(payload, sigHeader, stripeWebhookSecret);
            
            log.info("Received Stripe webhook: {} - {}", event.getType(), event.getId());
            
            switch (event.getType()) {
                case "checkout.session.completed" -> handleCheckoutSessionCompleted(event);
                case "customer.subscription.created" -> handleSubscriptionCreated(event);
                case "customer.subscription.updated" -> handleSubscriptionUpdated(event);
                case "customer.subscription.deleted" -> handleSubscriptionDeleted(event);
                case "invoice.payment_succeeded" -> handlePaymentSucceeded(event);
                case "invoice.payment_failed" -> handlePaymentFailed(event);
                default -> log.debug("Unhandled event type: {}", event.getType());
            }
            
        } catch (SignatureVerificationException e) {
            log.error("Invalid webhook signature: {}", e.getMessage());
            throw new RuntimeException("Invalid webhook signature", e);
        } catch (Exception e) {
            log.error("Error processing webhook: {}", e.getMessage(), e);
            throw new RuntimeException("Error processing webhook", e);
        }
    }
    
    private String getOrCreateStripeCustomer(User user) throws StripeException {
        Optional<Subscription> existingSubscription = subscriptionRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .filter(sub -> sub.getStripeCustomerId() != null)
                .findFirst();
        
        if (existingSubscription.isPresent()) {
            return existingSubscription.get().getStripeCustomerId();
        }
        
        Map<String, Object> customerParams = new HashMap<>();
        customerParams.put("email", user.getEmail());
        customerParams.put("name", user.getFullName());
        customerParams.put("metadata", Map.of("userId", user.getId().toString()));
        
        Customer customer = Customer.create(customerParams);
        
        log.info("Created Stripe customer {} for user {}", customer.getId(), user.getId());
        return customer.getId();
    }
    
    private String getPriceIdForPlan(String planId) {
        return switch (planId.toLowerCase()) {
            case "pro" -> "price_pro_monthly";
            case "premium" -> "price_premium_monthly";
            default -> throw new IllegalArgumentException("Invalid plan ID: " + planId);
        };
    }
    
    private void handleCheckoutSessionCompleted(Event event) {
        try {
            Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
            if (session == null) {
                log.warn("No session data in checkout.session.completed event");
                return;
            }
            
            String userId = session.getMetadata().get("userId");
            String planId = session.getMetadata().get("planId");
            
            log.info("Checkout session completed for user {} with plan {}", userId, planId);
            
        } catch (Exception e) {
            log.error("Error handling checkout session completed: {}", e.getMessage(), e);
        }
    }
    
    private void handleSubscriptionCreated(Event event) {
        try {
            com.stripe.model.Subscription stripeSubscription = (com.stripe.model.Subscription) event.getDataObjectDeserializer().getObject().orElse(null);
            if (stripeSubscription == null) {
                log.warn("No subscription data in customer.subscription.created event");
                return;
            }
            
            String customerId = stripeSubscription.getCustomer();
            String subscriptionId = stripeSubscription.getId();
            String status = stripeSubscription.getStatus();
            
            // Find user by customer ID
            Optional<Subscription> existingSub = subscriptionRepository.findByStripeCustomerId(customerId);
            if (existingSub.isEmpty()) {
                log.warn("No user found for Stripe customer: {}", customerId);
                return;
            }
            
            UUID userId = existingSub.get().getUserId();
            
            // Create subscription record
            Subscription subscription = Subscription.builder()
                    .userId(userId)
                    .stripeCustomerId(customerId)
                    .stripeSubscriptionId(subscriptionId)
                    .planId(determinePlanFromStripeSubscription(stripeSubscription))
                    .status(mapStripeStatusToSubscriptionStatus(status))
                    .currentPeriodEnd(Instant.ofEpochSecond(stripeSubscription.getCurrentPeriodEnd()))
                    .createdAt(Instant.now())
                    .build();
            
            subscriptionRepository.save(subscription);
            
            log.info("Created subscription {} for user {} with plan {}", 
                    subscriptionId, userId, subscription.getPlanId());
            
        } catch (Exception e) {
            log.error("Error handling subscription created: {}", e.getMessage(), e);
        }
    }
    
    private void handleSubscriptionUpdated(Event event) {
        try {
            com.stripe.model.Subscription stripeSubscription = (com.stripe.model.Subscription) event.getDataObjectDeserializer().getObject().orElse(null);
            if (stripeSubscription == null) {
                log.warn("No subscription data in customer.subscription.updated event");
                return;
            }
            
            String subscriptionId = stripeSubscription.getId();
            String status = stripeSubscription.getStatus();
            
            // Find and update subscription
            Optional<Subscription> subscription = subscriptionRepository.findByStripeSubscriptionId(subscriptionId);
            if (subscription.isPresent()) {
                Subscription sub = subscription.get();
                sub.setStatus(mapStripeStatusToSubscriptionStatus(status));
                sub.setCurrentPeriodEnd(Instant.ofEpochSecond(stripeSubscription.getCurrentPeriodEnd()));
                
                subscriptionRepository.save(sub);
                
                log.info("Updated subscription {} status to {}", subscriptionId, status);
            } else {
                log.warn("Subscription not found: {}", subscriptionId);
            }
            
        } catch (Exception e) {
            log.error("Error handling subscription updated: {}", e.getMessage(), e);
        }
    }
    
    private void handleSubscriptionDeleted(Event event) {
        try {
            com.stripe.model.Subscription stripeSubscription = (com.stripe.model.Subscription) event.getDataObjectDeserializer().getObject().orElse(null);
            if (stripeSubscription == null) {
                log.warn("No subscription data in customer.subscription.deleted event");
                return;
            }
            
            String subscriptionId = stripeSubscription.getId();
            
            // Find and cancel subscription
            Optional<Subscription> subscription = subscriptionRepository.findByStripeSubscriptionId(subscriptionId);
            if (subscription.isPresent()) {
                Subscription sub = subscription.get();
                sub.setStatus(Subscription.SubscriptionStatus.CANCELED);
                
                subscriptionRepository.save(sub);
                
                log.info("Canceled subscription {}", subscriptionId);
            } else {
                log.warn("Subscription not found: {}", subscriptionId);
            }
            
        } catch (Exception e) {
            log.error("Error handling subscription deleted: {}", e.getMessage(), e);
        }
    }
    
    private void handlePaymentSucceeded(Event event) {
        log.info("Payment succeeded for event: {}", event.getId());
    }
    
    private void handlePaymentFailed(Event event) {
        log.warn("Payment failed for event: {}", event.getId());
    }
    
    private String determinePlanFromStripeSubscription(com.stripe.model.Subscription stripeSubscription) {
        return "pro";
    }
    
    private Subscription.SubscriptionStatus mapStripeStatusToSubscriptionStatus(String stripeStatus) {
        return switch (stripeStatus) {
            case "active" -> Subscription.SubscriptionStatus.ACTIVE;
            case "canceled" -> Subscription.SubscriptionStatus.CANCELED;
            case "past_due" -> Subscription.SubscriptionStatus.PAST_DUE;
            case "incomplete" -> Subscription.SubscriptionStatus.INCOMPLETE;
            case "incomplete_expired" -> Subscription.SubscriptionStatus.INCOMPLETE_EXPIRED;
            case "trialing" -> Subscription.SubscriptionStatus.TRIALING;
            case "unpaid" -> Subscription.SubscriptionStatus.UNPAID;
            default -> Subscription.SubscriptionStatus.CANCELED;
        };
    }
}
