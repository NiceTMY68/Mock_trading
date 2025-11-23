package com.example.demo.service;

import com.example.demo.entity.Subscription;
import com.example.demo.entity.User;
import com.example.demo.repository.SubscriptionRepository;
import com.example.demo.repository.UserRepository;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BillingServiceTest {
    
    @Mock
    private SubscriptionRepository subscriptionRepository;
    
    @Mock
    private UserRepository userRepository;
    
    @InjectMocks
    private BillingService billingService;
    
    private UUID testUserId;
    private User testUser;
    private String testPayload;
    private String testSigHeader;
    
    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        testUser = User.builder()
                .id(testUserId)
                .email("test@example.com")
                .fullName("Test User")
                .build();
        
        ReflectionTestUtils.setField(billingService, "stripeSecretKey", "sk_test_dummy");
        ReflectionTestUtils.setField(billingService, "stripeWebhookSecret", "whsec_test_dummy");
        ReflectionTestUtils.setField(billingService, "baseUrl", "http://localhost:8080");
        
        testPayload = "{\"type\":\"checkout.session.completed\",\"id\":\"evt_test\"}";
        testSigHeader = "t=1234567890,v1=test_signature";
    }
    
    @Test
    void handleStripeWebhook_ShouldThrowException_WhenInvalidSignature() {
        try (MockedStatic<Webhook> webhookMock = mockStatic(Webhook.class)) {
            webhookMock.when(() -> Webhook.constructEvent(anyString(), anyString(), anyString()))
                    .thenThrow(new SignatureVerificationException("Invalid signature", "sig_header"));
            
            assertThatThrownBy(() -> billingService.handleStripeWebhook(testPayload, testSigHeader))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Invalid webhook signature");
        }
    }
    
    @Test
    void handleStripeWebhook_ShouldProcessCheckoutSessionCompleted_WhenValidSignature() throws SignatureVerificationException {
        try (MockedStatic<Webhook> webhookMock = mockStatic(Webhook.class)) {
            Event mockEvent = mock(Event.class);
            when(mockEvent.getType()).thenReturn("checkout.session.completed");
            when(mockEvent.getId()).thenReturn("evt_test");
            
            Session mockSession = mock(Session.class);
            Map<String, String> metadata = new HashMap<>();
            metadata.put("userId", testUserId.toString());
            metadata.put("planId", "pro");
            when(mockSession.getMetadata()).thenReturn(metadata);
            
            var deserializer = mock(com.stripe.model.EventDataObjectDeserializer.class);
            when(deserializer.getObject()).thenReturn(Optional.of(mockSession));
            when(mockEvent.getDataObjectDeserializer()).thenReturn(deserializer);
            
            webhookMock.when(() -> Webhook.constructEvent(anyString(), anyString(), anyString()))
                    .thenReturn(mockEvent);
            
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
            when(subscriptionRepository.findByStripeCustomerId(anyString())).thenReturn(Optional.empty());
            
            // Method throws SignatureVerificationException but mock doesn't throw it
            // Adding throws to method signature would require changing all test methods
            billingService.handleStripeWebhook(testPayload, testSigHeader);
            
            verify(mockEvent, times(1)).getType();
        }
    }
    
    @Test
    void handleStripeWebhook_ShouldCreateSubscription_WhenCheckoutSessionCompleted() throws SignatureVerificationException {
        try (MockedStatic<Webhook> webhookMock = mockStatic(Webhook.class)) {
            Event mockEvent = mock(Event.class);
            when(mockEvent.getType()).thenReturn("checkout.session.completed");
            when(mockEvent.getId()).thenReturn("evt_test");
            
            Session mockSession = mock(Session.class);
            Map<String, String> metadata = new HashMap<>();
            metadata.put("userId", testUserId.toString());
            metadata.put("planId", "pro");
            when(mockSession.getMetadata()).thenReturn(metadata);
            when(mockSession.getCustomer()).thenReturn("cus_test");
            
            var deserializer = mock(mockEvent.getDataObjectDeserializer().getClass());
            when(deserializer.getObject()).thenReturn(Optional.of(mockSession));
            when(mockEvent.getDataObjectDeserializer()).thenReturn(deserializer);
            
            webhookMock.when(() -> Webhook.constructEvent(anyString(), anyString(), anyString()))
                    .thenReturn(mockEvent);
            
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
            when(subscriptionRepository.findByStripeCustomerId("cus_test")).thenReturn(Optional.empty());
            when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(invocation -> invocation.getArgument(0));
            
            // Method throws SignatureVerificationException but mock doesn't throw it
            // Adding throws to method signature would require changing all test methods
            billingService.handleStripeWebhook(testPayload, testSigHeader);
            
            verify(subscriptionRepository, atLeastOnce()).save(any(Subscription.class));
        }
    }
    
    @Test
    void handleStripeWebhook_ShouldHandleSubscriptionCreated_WhenValidEvent() throws SignatureVerificationException {
        try (MockedStatic<Webhook> webhookMock = mockStatic(Webhook.class)) {
            Event mockEvent = mock(Event.class);
            when(mockEvent.getType()).thenReturn("customer.subscription.created");
            when(mockEvent.getId()).thenReturn("evt_test");
            
            com.stripe.model.Subscription mockStripeSubscription = mock(com.stripe.model.Subscription.class);
            when(mockStripeSubscription.getId()).thenReturn("sub_test");
            when(mockStripeSubscription.getCustomer()).thenReturn("cus_test");
            when(mockStripeSubscription.getStatus()).thenReturn("active");
            when(mockStripeSubscription.getCurrentPeriodEnd()).thenReturn(Instant.now().plusSeconds(86400).getEpochSecond());
            
            var deserializer = mock(mockEvent.getDataObjectDeserializer().getClass());
            when(deserializer.getObject()).thenReturn(Optional.of(mockStripeSubscription));
            when(mockEvent.getDataObjectDeserializer()).thenReturn(deserializer);
            
            webhookMock.when(() -> Webhook.constructEvent(anyString(), anyString(), anyString()))
                    .thenReturn(mockEvent);
            
            Subscription existingSub = Subscription.builder()
                    .userId(testUserId)
                    .stripeCustomerId("cus_test")
                    .build();
            when(subscriptionRepository.findByStripeCustomerId("cus_test")).thenReturn(Optional.of(existingSub));
            when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(invocation -> invocation.getArgument(0));
            
            // Method throws SignatureVerificationException but mock doesn't throw it
            // Adding throws to method signature would require changing all test methods
            billingService.handleStripeWebhook(testPayload, testSigHeader);
            
            verify(subscriptionRepository, atLeastOnce()).save(any(Subscription.class));
        }
    }
    
    @Test
    void handleStripeWebhook_ShouldHandleUnhandledEventType_WithoutError() throws SignatureVerificationException {
        try (MockedStatic<Webhook> webhookMock = mockStatic(Webhook.class)) {
            Event mockEvent = mock(Event.class);
            when(mockEvent.getType()).thenReturn("unknown.event.type");
            when(mockEvent.getId()).thenReturn("evt_test");
            
            webhookMock.when(() -> Webhook.constructEvent(anyString(), anyString(), anyString()))
                    .thenReturn(mockEvent);
            
            // Method throws SignatureVerificationException but mock doesn't throw it
            // Adding throws to method signature would require changing all test methods
            billingService.handleStripeWebhook(testPayload, testSigHeader);
            
            verify(mockEvent, times(1)).getType();
        }
    }
}
