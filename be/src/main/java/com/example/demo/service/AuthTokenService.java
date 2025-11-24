package com.example.demo.service;

import com.example.demo.entity.PasswordResetToken;
import com.example.demo.repository.PasswordResetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
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
        String rawToken = generateSecureToken();
        String hashedToken = hashToken(rawToken);
        Instant expiresAt = Instant.now().plusSeconds(tokenExpiryHours * 3600L);

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .userId(userId)
                .token(hashedToken)
                .expiresAt(expiresAt)
                .used(false)
                .build();

        PasswordResetToken savedToken = passwordResetRepository.save(resetToken);
        
        // Return token with raw token for email (not persisted)
        return PasswordResetToken.builder()
                .id(savedToken.getId())
                .userId(savedToken.getUserId())
                .token(rawToken) // Return raw token for email
                .expiresAt(savedToken.getExpiresAt())
                .used(savedToken.isUsed())
                .createdAt(savedToken.getCreatedAt())
                .build();
    }

    @Transactional
    public PasswordResetToken createEmailVerificationToken(UUID userId) {
        String rawToken = generateSecureToken();
        String hashedToken = hashToken(rawToken);
        Instant expiresAt = Instant.now().plusSeconds(tokenExpiryHours * 3600L);

        PasswordResetToken verificationToken = PasswordResetToken.builder()
                .userId(userId)
                .token(hashedToken)
                .expiresAt(expiresAt)
                .used(false)
                .build();

        PasswordResetToken savedToken = passwordResetRepository.save(verificationToken);
        
        // Return token with raw token for email (not persisted)
        return PasswordResetToken.builder()
                .id(savedToken.getId())
                .userId(savedToken.getUserId())
                .token(rawToken) // Return raw token for email
                .expiresAt(savedToken.getExpiresAt())
                .used(savedToken.isUsed())
                .createdAt(savedToken.getCreatedAt())
                .build();
    }

    public PasswordResetToken validateToken(String token) {
        String hashedToken = hashToken(token);
        return passwordResetRepository.findByTokenAndUsedFalse(hashedToken)
                .filter(PasswordResetToken::isValid)
                .orElse(null);
    }

    @Transactional
    public void markTokenAsUsed(String token) {
        String hashedToken = hashToken(token);
        passwordResetRepository.findByToken(hashedToken)
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

    /**
     * Hash token using SHA-256 for secure storage in database
     * This prevents token exposure if database is compromised
     */
    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception e) {
            log.error("Error hashing token", e);
            throw new RuntimeException("Failed to hash token", e);
        }
    }
}

