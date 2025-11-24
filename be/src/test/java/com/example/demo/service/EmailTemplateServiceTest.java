package com.example.demo.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EmailTemplateServiceTest {

    private EmailTemplateService emailTemplateService;

    @BeforeEach
    void setUp() {
        emailTemplateService = new EmailTemplateService();
    }

    @Test
    void loadHtmlTemplate_WithValidTemplate_ShouldReplaceVariables() {
        Map<String, String> variables = new HashMap<>();
        variables.put("resetUrl", "http://example.com/reset?token=abc123");
        variables.put("expiryHours", "1");

        String content = emailTemplateService.loadHtmlTemplate("password-reset", variables);

        assertThat(content).isNotNull();
        assertThat(content).contains("http://example.com/reset?token=abc123");
        assertThat(content).contains("1");
        assertThat(content).doesNotContain("{{resetUrl}}");
        assertThat(content).doesNotContain("{{expiryHours}}");
        assertThat(content).contains("<!DOCTYPE html>");
    }

    @Test
    void loadTextTemplate_WithValidTemplate_ShouldReplaceVariables() {
        Map<String, String> variables = new HashMap<>();
        variables.put("resetUrl", "http://example.com/reset?token=abc123");
        variables.put("expiryHours", "1");

        String content = emailTemplateService.loadTextTemplate("password-reset", variables);

        assertThat(content).isNotNull();
        assertThat(content).contains("http://example.com/reset?token=abc123");
        assertThat(content).contains("1");
        assertThat(content).doesNotContain("{{resetUrl}}");
        assertThat(content).doesNotContain("{{expiryHours}}");
    }

    @Test
    void loadTemplate_WithInvalidTemplate_ShouldThrowException() {
        Map<String, String> variables = new HashMap<>();
        variables.put("test", "value");

        assertThatThrownBy(() -> emailTemplateService.loadTemplate("nonexistent", "html", variables))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Email template not found");
    }

    @Test
    void loadTemplate_WithNullVariable_ShouldReplaceWithEmptyString() {
        Map<String, String> variables = new HashMap<>();
        variables.put("resetUrl", "http://example.com/reset");
        variables.put("expiryHours", null);

        String content = emailTemplateService.loadHtmlTemplate("password-reset", variables);

        assertThat(content).isNotNull();
        assertThat(content).contains("http://example.com/reset");
        assertThat(content).doesNotContain("{{expiryHours}}");
    }

    @Test
    void loadHtmlTemplate_EmailVerification_ShouldReplaceVariables() {
        Map<String, String> variables = new HashMap<>();
        variables.put("verificationUrl", "http://example.com/verify?token=xyz789");

        String content = emailTemplateService.loadHtmlTemplate("email-verification", variables);

        assertThat(content).isNotNull();
        assertThat(content).contains("http://example.com/verify?token=xyz789");
        assertThat(content).doesNotContain("{{verificationUrl}}");
        assertThat(content).contains("<!DOCTYPE html>");
    }

    @Test
    void loadTextTemplate_EmailVerification_ShouldReplaceVariables() {
        Map<String, String> variables = new HashMap<>();
        variables.put("verificationUrl", "http://example.com/verify?token=xyz789");

        String content = emailTemplateService.loadTextTemplate("email-verification", variables);

        assertThat(content).isNotNull();
        assertThat(content).contains("http://example.com/verify?token=xyz789");
        assertThat(content).doesNotContain("{{verificationUrl}}");
    }
}

