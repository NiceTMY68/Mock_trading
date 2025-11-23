package com.example.demo.service;

public interface EmailService {

    void sendPasswordResetEmail(String toEmail, String resetToken, String resetUrl);

    void sendEmailVerificationEmail(String toEmail, String verificationToken, String verificationUrl);
}

