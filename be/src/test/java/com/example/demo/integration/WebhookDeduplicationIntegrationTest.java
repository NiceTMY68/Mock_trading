package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.entity.WebhookEvent;
import com.example.demo.repository.WebhookEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mockStatic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "security.require-ssl=false",
    "stripe.webhook-secret=whsec_test_secret_for_deduplication_test"
})
class WebhookDeduplicationIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WebhookEventRepository webhookEventRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String testEventId;
    private String testPayload;
    private String testSignature;

    @BeforeEach
    void setUp() {
        webhookEventRepository.deleteAll();

        testEventId = "evt_test_1234567890";
        testPayload = createTestPayload(testEventId);
        testSignature = createTestSignature(testPayload);
    }

    @Test
    void handleWebhook_FirstTime_ShouldProcessAndSave() throws Exception {
        try (var webhookMock = mockStatic(com.stripe.net.Webhook.class)) {
            com.stripe.model.Event mockEvent = org.mockito.Mockito.mock(com.stripe.model.Event.class);
            org.mockito.Mockito.when(mockEvent.getId()).thenReturn(testEventId);
            org.mockito.Mockito.when(mockEvent.getType()).thenReturn("checkout.session.completed");
            
            webhookMock.when(() -> com.stripe.net.Webhook.constructEvent(
                    anyString(), anyString(), anyString())).thenReturn(mockEvent);

            mockMvc.perform(post("/api/webhooks/stripe")
                            .header("Stripe-Signature", testSignature)
                            .contentType("application/json")
                            .content(testPayload))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("success"));

            WebhookEvent savedEvent = webhookEventRepository.findByEventId(testEventId)
                    .orElseThrow(() -> new AssertionError("Event should be saved"));

            assertThat(savedEvent.getEventId()).isEqualTo(testEventId);
            assertThat(savedEvent.getProvider()).isEqualTo("stripe");
            assertThat(savedEvent.isProcessed()).isTrue();
            assertThat(savedEvent.getPayload()).isNotNull();
        }
    }

    @Test
    void handleWebhook_Duplicate_ShouldReturnSuccessWithoutProcessing() throws Exception {
        try (var webhookMock = mockStatic(com.stripe.net.Webhook.class)) {
            com.stripe.model.Event mockEvent = org.mockito.Mockito.mock(com.stripe.model.Event.class);
            org.mockito.Mockito.when(mockEvent.getId()).thenReturn(testEventId);
            org.mockito.Mockito.when(mockEvent.getType()).thenReturn("checkout.session.completed");
            
            webhookMock.when(() -> com.stripe.net.Webhook.constructEvent(
                    anyString(), anyString(), anyString())).thenReturn(mockEvent);

            WebhookEvent existingEvent = WebhookEvent.builder()
                    .provider("stripe")
                    .eventId(testEventId)
                    .processed(true)
                    .payload(objectMapper.readTree(testPayload))
                    .build();
            webhookEventRepository.save(existingEvent);

            mockMvc.perform(post("/api/webhooks/stripe")
                            .header("Stripe-Signature", testSignature)
                            .contentType("application/json")
                            .content(testPayload))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("success"))
                    .andExpect(jsonPath("$.message").value("Event already processed"));

            long eventCount = webhookEventRepository.count();
            assertThat(eventCount).isEqualTo(1);
        }
    }

    @Test
    void handleWebhook_UnprocessedEvent_ShouldMarkAsProcessed() throws Exception {
        try (var webhookMock = mockStatic(com.stripe.net.Webhook.class)) {
            com.stripe.model.Event mockEvent = org.mockito.Mockito.mock(com.stripe.model.Event.class);
            org.mockito.Mockito.when(mockEvent.getId()).thenReturn(testEventId);
            org.mockito.Mockito.when(mockEvent.getType()).thenReturn("checkout.session.completed");
            
            webhookMock.when(() -> com.stripe.net.Webhook.constructEvent(
                    anyString(), anyString(), anyString())).thenReturn(mockEvent);

            WebhookEvent unprocessedEvent = WebhookEvent.builder()
                    .provider("stripe")
                    .eventId(testEventId)
                    .processed(false)
                    .payload(objectMapper.readTree(testPayload))
                    .build();
            webhookEventRepository.save(unprocessedEvent);

            mockMvc.perform(post("/api/webhooks/stripe")
                            .header("Stripe-Signature", testSignature)
                            .contentType("application/json")
                            .content(testPayload))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("success"))
                    .andExpect(jsonPath("$.message").value("Event marked as processed"));

            WebhookEvent updatedEvent = webhookEventRepository.findByEventId(testEventId)
                    .orElseThrow(() -> new AssertionError("Event should exist"));
            assertThat(updatedEvent.isProcessed()).isTrue();
        }
    }

    private String createTestPayload(String eventId) {
        return String.format(
                "{\"id\":\"%s\",\"type\":\"checkout.session.completed\",\"data\":{\"object\":{\"id\":\"cs_test\",\"metadata\":{\"userId\":\"test-user-id\",\"planId\":\"pro\"}}}}",
                eventId
        );
    }

    private String createTestSignature(String payload) {
        return "t=1234567890,v1=test_signature";
    }
}

