package com.example.demo.service;

import com.example.demo.entity.PasswordResetToken;
import com.example.demo.repository.PasswordResetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthTokenServiceTest {

    @Mock
    private PasswordResetRepository passwordResetRepository;

    @InjectMocks
    private AuthTokenService authTokenService;

    private UUID testUserId;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
    }

    @Test
    void createPasswordResetToken_ShouldCreateToken() {
        when(passwordResetRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PasswordResetToken token = authTokenService.createPasswordResetToken(testUserId);

        assertThat(token).isNotNull();
        assertThat(token.getUserId()).isEqualTo(testUserId);
        assertThat(token.getToken()).isNotBlank();
        assertThat(token.isUsed()).isFalse();
        assertThat(token.getExpiresAt()).isAfter(Instant.now().minusSeconds(1));
        verify(passwordResetRepository).save(any(PasswordResetToken.class));
    }

    @Test
    void validateToken_WithValidToken_ShouldReturnToken() {
        String rawToken = "valid-token";
        // Note: In real implementation, token is hashed before lookup
        // This test mocks the repository to return the token directly
        PasswordResetToken validToken = PasswordResetToken.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .token(rawToken) // In DB, this would be hashed
                .expiresAt(Instant.now().plusSeconds(3600))
                .used(false)
                .build();

        // Mock will hash the token before lookup
        when(passwordResetRepository.findByTokenAndUsedFalse(anyString()))
                .thenReturn(Optional.of(validToken));

        PasswordResetToken result = authTokenService.validateToken(rawToken);

        assertThat(result).isNotNull();
        verify(passwordResetRepository).findByTokenAndUsedFalse(anyString());
    }

    @Test
    void validateToken_WithExpiredToken_ShouldReturnNull() {
        String rawToken = "expired-token";
        PasswordResetToken expiredToken = PasswordResetToken.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .token(rawToken) // In DB, this would be hashed
                .expiresAt(Instant.now().minusSeconds(3600))
                .used(false)
                .build();

        when(passwordResetRepository.findByTokenAndUsedFalse(anyString()))
                .thenReturn(Optional.of(expiredToken));

        PasswordResetToken result = authTokenService.validateToken(rawToken);

        assertThat(result).isNull(); // Expired token should return null
        verify(passwordResetRepository).findByTokenAndUsedFalse(anyString());
    }

    @Test
    void validateToken_WithUsedToken_ShouldReturnNull() {
        String rawToken = "used-token";
        // Token is hashed before lookup, so mock with anyString()
        when(passwordResetRepository.findByTokenAndUsedFalse(anyString()))
                .thenReturn(Optional.empty());

        PasswordResetToken result = authTokenService.validateToken(rawToken);

        assertThat(result).isNull();
        verify(passwordResetRepository).findByTokenAndUsedFalse(anyString());
    }

    @Test
    void markTokenAsUsed_ShouldSetUsedToTrue() {
        String rawToken = "test-token";
        PasswordResetToken token = PasswordResetToken.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .token(rawToken) // In DB, this would be hashed
                .expiresAt(Instant.now().plusSeconds(3600))
                .used(false)
                .build();

        when(passwordResetRepository.findByToken(anyString()))
                .thenReturn(Optional.of(token));
        when(passwordResetRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        authTokenService.markTokenAsUsed(rawToken);

        verify(passwordResetRepository).findByToken(anyString()); // Token is hashed before lookup
        verify(passwordResetRepository).save(argThat(t -> t.isUsed()));
    }
}

