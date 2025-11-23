package com.example.demo.service;

import com.example.demo.entity.RefreshToken;
import com.example.demo.entity.User;
import com.example.demo.repository.RefreshTokenRepository;
import jakarta.persistence.EntityManager;
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
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final EntityManager entityManager;

    @Value("${app.refresh-token.expiry-days:30}")
    private int refreshTokenExpiryDays;

    @Value("${app.refresh-token.max-per-user:5}")
    private int maxTokensPerUser;

    private static final SecureRandom secureRandom = new SecureRandom();
    private static final int TOKEN_LENGTH = 64;

    @Transactional
    public RefreshToken generateRefreshToken(User user) {
        String rawToken = generateSecureToken();
        String hashedToken = hashToken(rawToken);

        Instant expiresAt = Instant.now().plusSeconds(refreshTokenExpiryDays * 24L * 3600L);

        RefreshToken refreshToken = RefreshToken.builder()
                .userId(user.getId())
                .token(hashedToken)
                .expiresAt(expiresAt)
                .revoked(false)
                .build();

        RefreshToken savedToken = refreshTokenRepository.save(refreshToken);
        entityManager.flush();
        entityManager.clear();

        Long activeCount = refreshTokenRepository.countActiveTokensByUserId(user.getId());
        if (activeCount > maxTokensPerUser) {
            revokeOldestTokens(user.getId(), activeCount - maxTokensPerUser);
        }

        RefreshToken result = RefreshToken.builder()
                .id(savedToken.getId())
                .userId(savedToken.getUserId())
                .token(rawToken)
                .expiresAt(savedToken.getExpiresAt())
                .revoked(savedToken.isRevoked())
                .createdAt(savedToken.getCreatedAt())
                .build();
        return result;
    }

    @Transactional
    public RefreshToken rotateRefreshToken(String oldToken) {
        String hashedOldToken = hashToken(oldToken);
        RefreshToken oldRefreshToken = refreshTokenRepository
                .findByTokenAndRevokedFalse(hashedOldToken)
                .orElse(null);

        if (oldRefreshToken == null || !oldRefreshToken.isValid()) {
            return null;
        }

        oldRefreshToken.setRevoked(true);
        refreshTokenRepository.save(oldRefreshToken);

        User user = User.builder().id(oldRefreshToken.getUserId()).build();
        return generateRefreshToken(user);
    }

    public RefreshToken validateRefreshToken(String token) {
        String hashedToken = hashToken(token);
        return refreshTokenRepository.findByTokenAndRevokedFalse(hashedToken)
                .filter(RefreshToken::isValid)
                .orElse(null);
    }

    @Transactional
    public void revokeRefreshToken(String token) {
        String hashedToken = hashToken(token);
        refreshTokenRepository.findByToken(hashedToken)
                .ifPresent(refreshToken -> {
                    refreshToken.setRevoked(true);
                    refreshTokenRepository.save(refreshToken);
                });
    }

    @Transactional
    public void revokeAllUserTokens(UUID userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
        log.info("Revoked all refresh tokens for user {}", userId);
    }

    private void revokeOldestTokens(UUID userId, long count) {
        List<RefreshToken> tokens = refreshTokenRepository.findByUserIdAndRevokedFalse(userId);
        tokens.stream()
                .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                .limit(count)
                .forEach(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });
    }

    private String generateSecureToken() {
        byte[] randomBytes = new byte[TOKEN_LENGTH];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    public String hashToken(String token) {
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
