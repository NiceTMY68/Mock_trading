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
        PasswordResetToken validToken = PasswordResetToken.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .token("valid-token")
                .expiresAt(Instant.now().plusSeconds(3600))
                .used(false)
                .build();

        when(passwordResetRepository.findByTokenAndUsedFalse("valid-token"))
                .thenReturn(Optional.of(validToken));

        PasswordResetToken result = authTokenService.validateToken("valid-token");

        assertThat(result).isNotNull();
        assertThat(result.getToken()).isEqualTo("valid-token");
    }

    @Test
    void validateToken_WithExpiredToken_ShouldReturnNull() {
        PasswordResetToken expiredToken = PasswordResetToken.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .token("expired-token")
                .expiresAt(Instant.now().minusSeconds(3600))
                .used(false)
                .build();

        when(passwordResetRepository.findByTokenAndUsedFalse("expired-token"))
                .thenReturn(Optional.of(expiredToken));

        PasswordResetToken result = authTokenService.validateToken("expired-token");

        assertThat(result).isNull();
    }

    @Test
    void validateToken_WithUsedToken_ShouldReturnNull() {
        when(passwordResetRepository.findByTokenAndUsedFalse("used-token"))
                .thenReturn(Optional.empty());

        PasswordResetToken result = authTokenService.validateToken("used-token");

        assertThat(result).isNull();
    }

    @Test
    void markTokenAsUsed_ShouldSetUsedToTrue() {
        PasswordResetToken token = PasswordResetToken.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .token("test-token")
                .expiresAt(Instant.now().plusSeconds(3600))
                .used(false)
                .build();

        when(passwordResetRepository.findByToken("test-token"))
                .thenReturn(Optional.of(token));
        when(passwordResetRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        authTokenService.markTokenAsUsed("test-token");

        verify(passwordResetRepository).findByToken("test-token");
        verify(passwordResetRepository).save(argThat(t -> t.isUsed()));
    }
}

