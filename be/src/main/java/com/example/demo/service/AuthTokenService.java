package com.example.demo.service;

import com.example.demo.entity.PasswordResetToken;
import com.example.demo.entity.User;
import com.example.demo.repository.PasswordResetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthTokenService {

    private final PasswordResetRepository passwordResetRepository;

    @Value("${app.auth.token.expiry-hours:1}")
    private int tokenExpiryHours;

    private static final SecureRandom secureRandom = new SecureRandom();
    private static final int TOKEN_LENGTH = 32;

    @Transactional
    public PasswordResetToken createPasswordResetToken(UUID userId) {
        String token = generateSecureToken();
        Instant expiresAt = Instant.now().plusSeconds(tokenExpiryHours * 3600L);

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .userId(userId)
                .token(token)
                .expiresAt(expiresAt)
                .used(false)
                .build();

        return passwordResetRepository.save(resetToken);
    }

    @Transactional
    public PasswordResetToken createEmailVerificationToken(UUID userId) {
        String token = generateSecureToken();
        Instant expiresAt = Instant.now().plusSeconds(tokenExpiryHours * 3600L);

        PasswordResetToken verificationToken = PasswordResetToken.builder()
                .userId(userId)
                .token(token)
                .expiresAt(expiresAt)
                .used(false)
                .build();

        return passwordResetRepository.save(verificationToken);
    }

    public PasswordResetToken validateToken(String token) {
        return passwordResetRepository.findByTokenAndUsedFalse(token)
                .filter(PasswordResetToken::isValid)
                .orElse(null);
    }

    @Transactional
    public void markTokenAsUsed(String token) {
        passwordResetRepository.findByToken(token)
                .ifPresent(resetToken -> {
                    resetToken.setUsed(true);
                    passwordResetRepository.save(resetToken);
                });
    }

    @Transactional
    public void invalidateUserTokens(UUID userId) {
        passwordResetRepository.deleteByUserId(userId);
    }

    private String generateSecureToken() {
        byte[] randomBytes = new byte[TOKEN_LENGTH];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }
}

