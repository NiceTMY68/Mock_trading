package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.dto.ForgotPasswordDto;
import com.example.demo.dto.ResetPasswordDto;
import com.example.demo.entity.PasswordResetToken;
import com.example.demo.entity.User;
import com.example.demo.repository.PasswordResetRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.AuthTokenService;
import com.example.demo.service.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "security.require-ssl=false",
    "email.sendgrid.enabled=false"
})
class PasswordResetIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetRepository passwordResetRepository;

    @Autowired
    private AuthTokenService authTokenService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private EmailService emailService;

    private User testUser;
    private String originalPasswordHash;

    @BeforeEach
    void setUp() {
        passwordResetRepository.deleteAll();
        userRepository.deleteAll();

        originalPasswordHash = passwordEncoder.encode("originalPassword123");
        testUser = User.builder()
                .email("test@example.com")
                .passwordHash(originalPasswordHash)
                .fullName("Test User")
                .role("USER")
                .enabled(true)
                .emailVerified(true)
                .build();
        testUser = userRepository.save(testUser);
    }

    @Test
    void forgotPassword_ShouldCreateTokenAndSendEmail() throws Exception {
        ForgotPasswordDto dto = ForgotPasswordDto.builder()
                .email(testUser.getEmail())
                .build();

        mockMvc.perform(post("/api/auth/forgot")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.requestId").exists());

        verify(emailService, times(1)).sendPasswordResetEmail(
                eq(testUser.getEmail()),
                anyString(),
                anyString()
        );

        assertThat(passwordResetRepository.findAll()).hasSize(1);
    }

    @Test
    void forgotPassword_WithNonExistentEmail_ShouldStillReturnSuccess() throws Exception {
        ForgotPasswordDto dto = ForgotPasswordDto.builder()
                .email("nonexistent@example.com")
                .build();

        mockMvc.perform(post("/api/auth/forgot")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString(), anyString());
    }

    @Test
    void resetPassword_WithValidToken_ShouldUpdatePassword() throws Exception {
        PasswordResetToken resetToken = authTokenService.createPasswordResetToken(testUser.getId());
        String newPassword = "newPassword123";

        ResetPasswordDto dto = ResetPasswordDto.builder()
                .token(resetToken.getToken())
                .password(newPassword)
                .build();

        mockMvc.perform(post("/api/auth/reset")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.requestId").exists());

        User updatedUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertThat(passwordEncoder.matches(newPassword, updatedUser.getPasswordHash())).isTrue();
        assertThat(passwordEncoder.matches("originalPassword123", updatedUser.getPasswordHash())).isFalse();

        // Verify token is marked as used - validateToken should return null for used tokens
        // Note: In production, tokens are hashed before storage for security
        PasswordResetToken validatedToken = authTokenService.validateToken(resetToken.getToken());
        assertThat(validatedToken).isNull(); // Token should be invalid (used)
    }

    @Test
    void resetPassword_WithInvalidToken_ShouldReturnError() throws Exception {
        ResetPasswordDto dto = ResetPasswordDto.builder()
                .token("invalid-token")
                .password("newPassword123")
                .build();

        mockMvc.perform(post("/api/auth/reset")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void resetPassword_WithExpiredToken_ShouldReturnError() throws Exception {
        PasswordResetToken expiredToken = PasswordResetToken.builder()
                .userId(testUser.getId())
                .token("expired-token")
                .expiresAt(Instant.now().minusSeconds(3600))
                .used(false)
                .createdAt(Instant.now())
                .build();
        expiredToken = passwordResetRepository.save(expiredToken);

        ResetPasswordDto dto = ResetPasswordDto.builder()
                .token("expired-token")
                .password("newPassword123")
                .build();

        mockMvc.perform(post("/api/auth/reset")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void verifyEmail_WithValidToken_ShouldVerifyEmail() throws Exception {
        User unverifiedUser = User.builder()
                .email("unverified@example.com")
                .passwordHash(passwordEncoder.encode("password"))
                .fullName("Unverified User")
                .role("USER")
                .enabled(true)
                .emailVerified(false)
                .build();
        unverifiedUser = userRepository.save(unverifiedUser);

        PasswordResetToken verificationToken = authTokenService.createEmailVerificationToken(unverifiedUser.getId());

        mockMvc.perform(get("/api/auth/verify")
                .param("token", verificationToken.getToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.requestId").exists())
                .andExpect(jsonPath("$.data.email").value(unverifiedUser.getEmail()));

        User verifiedUser = userRepository.findById(unverifiedUser.getId()).orElseThrow();
        assertThat(verifiedUser.isEmailVerified()).isTrue();

        PasswordResetToken usedToken = passwordResetRepository.findByToken(verificationToken.getToken()).orElseThrow();
        assertThat(usedToken.isUsed()).isTrue();
    }

    @Test
    void verifyEmail_WithInvalidToken_ShouldReturnError() throws Exception {
        mockMvc.perform(get("/api/auth/verify")
                .param("token", "invalid-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}

