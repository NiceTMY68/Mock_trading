package com.example.demo.service.impl;

import com.example.demo.service.EmailService;
import com.example.demo.service.EmailTemplateService;
import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.retry.support.RetryTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SendgridEmailService implements EmailService {

    private final EmailTemplateService emailTemplateService;
    private final RetryTemplate emailRetryTemplate;

    @Value("${email.sendgrid.api-key:}")
    private String sendgridApiKey;

    @Value("${email.sendgrid.from-email:noreply@example.com}")
    private String fromEmail;

    @Value("${email.sendgrid.from-name:Crypto Mock Trading}")
    private String fromName;

    @Value("${email.sendgrid.enabled:false}")
    private boolean enabled;

    @Value("${app.auth.token.expiry-hours:1}")
    private int tokenExpiryHours;

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken, String resetUrl) {
        if (!enabled || sendgridApiKey == null || sendgridApiKey.isEmpty()) {
            log.warn("Email service disabled or not configured. Would send password reset email to {} with token {}", toEmail, resetToken);
            log.info("Password reset URL: {}", resetUrl);
            return;
        }

        try {
            emailRetryTemplate.execute(context -> {
                log.debug("Attempting to send password reset email to {} (attempt {})", toEmail, context.getRetryCount() + 1);
                return sendPasswordResetEmailInternal(toEmail, resetUrl);
            });
        } catch (Exception e) {
            log.error("Failed to send password reset email to {} after retries: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send password reset email", e);
        }
    }

    @Override
    public void sendEmailVerificationEmail(String toEmail, String verificationToken, String verificationUrl) {
        if (!enabled || sendgridApiKey == null || sendgridApiKey.isEmpty()) {
            log.warn("Email service disabled or not configured. Would send verification email to {} with token {}", toEmail, verificationToken);
            log.info("Email verification URL: {}", verificationUrl);
            return;
        }

        try {
            emailRetryTemplate.execute(context -> {
                log.debug("Attempting to send verification email to {} (attempt {})", toEmail, context.getRetryCount() + 1);
                return sendEmailVerificationEmailInternal(toEmail, verificationUrl);
            });
        } catch (Exception e) {
            log.error("Failed to send verification email to {} after retries: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send verification email", e);
        }
    }

    private Response sendPasswordResetEmailInternal(String toEmail, String resetUrl) throws Exception {
        Email from = new Email(fromEmail, fromName);
        Email to = new Email(toEmail);
        String subject = "Password Reset Request";

        // Load templates with variables
        Map<String, String> variables = new HashMap<>();
        variables.put("resetUrl", resetUrl);
        variables.put("expiryHours", String.valueOf(tokenExpiryHours));

        String htmlContent = emailTemplateService.loadHtmlTemplate("password-reset", variables);
        String textContent = emailTemplateService.loadTextTemplate("password-reset", variables);

        Content htmlContentObj = new Content("text/html", htmlContent);
        Content textContentObj = new Content("text/plain", textContent);
        Mail mail = new Mail(from, subject, to, htmlContentObj);
        mail.addContent(textContentObj);

        SendGrid sg = new SendGrid(sendgridApiKey);
        Request request = new Request();
        request.setMethod(Method.POST);
        request.setEndpoint("mail/send");
        request.setBody(mail.build());

        Response response = sg.api(request);
        
        if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
            log.info("Password reset email sent successfully to {}: status={}", toEmail, response.getStatusCode());
        } else {
            log.warn("Password reset email sent with non-success status to {}: status={}, body={}", 
                    toEmail, response.getStatusCode(), response.getBody());
            throw new RuntimeException("SendGrid API returned non-success status: " + response.getStatusCode());
        }

        return response;
    }

    private Response sendEmailVerificationEmailInternal(String toEmail, String verificationUrl) throws Exception {
        Email from = new Email(fromEmail, fromName);
        Email to = new Email(toEmail);
        String subject = "Verify Your Email Address";

        // Load templates with variables
        Map<String, String> variables = new HashMap<>();
        variables.put("verificationUrl", verificationUrl);

        String htmlContent = emailTemplateService.loadHtmlTemplate("email-verification", variables);
        String textContent = emailTemplateService.loadTextTemplate("email-verification", variables);

        Content htmlContentObj = new Content("text/html", htmlContent);
        Content textContentObj = new Content("text/plain", textContent);
        Mail mail = new Mail(from, subject, to, htmlContentObj);
        mail.addContent(textContentObj);

        SendGrid sg = new SendGrid(sendgridApiKey);
        Request request = new Request();
        request.setMethod(Method.POST);
        request.setEndpoint("mail/send");
        request.setBody(mail.build());

        Response response = sg.api(request);
        
        if (response.getStatusCode() >= 200 && response.getStatusCode() < 300) {
            log.info("Verification email sent successfully to {}: status={}", toEmail, response.getStatusCode());
        } else {
            log.warn("Verification email sent with non-success status to {}: status={}, body={}", 
                    toEmail, response.getStatusCode(), response.getBody());
            throw new RuntimeException("SendGrid API returned non-success status: " + response.getStatusCode());
        }

        return response;
    }
}

