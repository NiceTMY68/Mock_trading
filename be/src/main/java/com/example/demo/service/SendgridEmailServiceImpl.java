package com.example.demo.service;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SendgridEmailServiceImpl implements EmailService {

    @Value("${email.sendgrid.api-key:}")
    private String sendgridApiKey;

    @Value("${email.sendgrid.from-email:noreply@example.com}")
    private String fromEmail;

    @Value("${email.sendgrid.from-name:Crypto Mock Trading}")
    private String fromName;

    @Value("${email.sendgrid.enabled:false}")
    private boolean enabled;

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken, String resetUrl) {
        if (!enabled || sendgridApiKey == null || sendgridApiKey.isEmpty()) {
            log.warn("Email service disabled or not configured. Would send password reset email to {} with token {}", toEmail, resetToken);
            log.info("Password reset URL: {}", resetUrl);
            return;
        }

        try {
            Email from = new Email(fromEmail, fromName);
            Email to = new Email(toEmail);
            String subject = "Password Reset Request";
            String htmlContent = buildPasswordResetEmailContent(resetUrl);

            Content content = new Content("text/html", htmlContent);
            Mail mail = new Mail(from, subject, to, content);

            SendGrid sg = new SendGrid(sendgridApiKey);
            Request request = new Request();
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            var response = sg.api(request);
            log.info("Password reset email sent to {}: status={}", toEmail, response.getStatusCode());

        } catch (Exception e) {
            log.error("Error sending password reset email to {}: {}", toEmail, e.getMessage(), e);
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
            Email from = new Email(fromEmail, fromName);
            Email to = new Email(toEmail);
            String subject = "Verify Your Email Address";
            String htmlContent = buildEmailVerificationContent(verificationUrl);

            Content content = new Content("text/html", htmlContent);
            Mail mail = new Mail(from, subject, to, content);

            SendGrid sg = new SendGrid(sendgridApiKey);
            Request request = new Request();
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());

            var response = sg.api(request);
            log.info("Verification email sent to {}: status={}", toEmail, response.getStatusCode());

        } catch (Exception e) {
            log.error("Error sending verification email to {}: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send verification email", e);
        }
    }

    private String buildPasswordResetEmailContent(String resetUrl) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                    .button:hover { background-color: #0056b3; }
                    .footer { margin-top: 30px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Password Reset Request</h2>
                    <p>You requested to reset your password. Click the button below to reset it:</p>
                    <a href="%s" class="button">Reset Password</a>
                    <p>If you didn't request this, please ignore this email.</p>
                    <p>This link will expire in 1 hour.</p>
                    <div class="footer">
                        <p>If the button doesn't work, copy and paste this link into your browser:</p>
                        <p>%s</p>
                    </div>
                </div>
            </body>
            </html>
            """, resetUrl, resetUrl);
    }

    private String buildEmailVerificationContent(String verificationUrl) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
                    .button:hover { background-color: #218838; }
                    .footer { margin-top: 30px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Verify Your Email Address</h2>
                    <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
                    <a href="%s" class="button">Verify Email</a>
                    <p>If you didn't create an account, please ignore this email.</p>
                    <div class="footer">
                        <p>If the button doesn't work, copy and paste this link into your browser:</p>
                        <p>%s</p>
                    </div>
                </div>
            </body>
            </html>
            """, verificationUrl, verificationUrl);
    }
}

