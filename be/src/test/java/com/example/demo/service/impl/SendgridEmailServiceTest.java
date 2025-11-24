package com.example.demo.service.impl;

import com.example.demo.service.EmailTemplateService;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SendgridEmailServiceTest {

    @Mock
    private EmailTemplateService emailTemplateService;

    @Mock
    private RetryTemplate emailRetryTemplate;

    @Mock
    private SendGrid sendGrid;

    @InjectMocks
    private SendgridEmailService emailService;

    private static final String TEST_EMAIL = "test@example.com";
    private static final String TEST_API_KEY = "test-api-key";
    private static final String TEST_FROM_EMAIL = "noreply@example.com";
    private static final String TEST_FROM_NAME = "Test App";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "sendgridApiKey", TEST_API_KEY);
        ReflectionTestUtils.setField(emailService, "fromEmail", TEST_FROM_EMAIL);
        ReflectionTestUtils.setField(emailService, "fromName", TEST_FROM_NAME);
        ReflectionTestUtils.setField(emailService, "enabled", true);
        ReflectionTestUtils.setField(emailService, "tokenExpiryHours", 1);
    }

    @Test
    void sendPasswordResetEmail_WhenDisabled_ShouldNotSend() {
        ReflectionTestUtils.setField(emailService, "enabled", false);

        emailService.sendPasswordResetEmail(TEST_EMAIL, "token", "http://example.com/reset");

        verify(emailRetryTemplate, never()).execute(any());
    }

    @Test
    void sendPasswordResetEmail_WhenApiKeyEmpty_ShouldNotSend() {
        ReflectionTestUtils.setField(emailService, "sendgridApiKey", "");

        emailService.sendPasswordResetEmail(TEST_EMAIL, "token", "http://example.com/reset");

        verify(emailRetryTemplate, never()).execute(any());
    }

    @Test
    void sendPasswordResetEmail_WhenEnabled_ShouldInvokeRetry() throws Exception {
        String resetUrl = "http://example.com/reset?token=abc123";

        Response successResponse = new Response(202, "Accepted", null);
        when(emailRetryTemplate.execute(any())).thenReturn(successResponse);

        emailService.sendPasswordResetEmail(TEST_EMAIL, "token", resetUrl);

        verify(emailRetryTemplate, times(1)).execute(any());
        // Note: Template loading and SendGrid API calls happen inside the retry callback.
        // This test verifies the retry mechanism is invoked when email service is enabled.
    }

    @Test
    void sendPasswordResetEmail_WhenRetryFails_ShouldThrowException() {
        String resetUrl = "http://example.com/reset?token=abc123";

        when(emailRetryTemplate.execute(any())).thenThrow(new RuntimeException("SendGrid API error"));

        assertThatThrownBy(() -> emailService.sendPasswordResetEmail(TEST_EMAIL, "token", resetUrl))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to send password reset email");

        verify(emailRetryTemplate, times(1)).execute(any());
    }

    @Test
    void sendEmailVerificationEmail_WhenEnabled_ShouldInvokeRetry() throws Exception {
        String verificationUrl = "http://example.com/verify?token=xyz789";

        Response successResponse = new Response(202, "Accepted", null);
        when(emailRetryTemplate.execute(any())).thenReturn(successResponse);

        emailService.sendEmailVerificationEmail(TEST_EMAIL, "token", verificationUrl);

        verify(emailRetryTemplate, times(1)).execute(any());
        // Note: Template loading and SendGrid API calls happen inside the retry callback.
        // This test verifies the retry mechanism is invoked when email service is enabled.
    }

    @Test
    void sendEmailVerificationEmail_WhenRetryFails_ShouldThrowException() {
        String verificationUrl = "http://example.com/verify?token=xyz789";

        when(emailRetryTemplate.execute(any())).thenThrow(new RuntimeException("SendGrid API error"));

        assertThatThrownBy(() -> emailService.sendEmailVerificationEmail(TEST_EMAIL, "token", verificationUrl))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to send verification email");

        verify(emailRetryTemplate, times(1)).execute(any());
    }
}

