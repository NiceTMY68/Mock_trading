package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.dto.AuthRequestDto;
import com.example.demo.dto.AuthResponseDto;
import com.example.demo.dto.RefreshTokenDto;
import com.example.demo.entity.RefreshToken;
import com.example.demo.entity.User;
import com.example.demo.repository.RefreshTokenRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.TokenService;
import com.example.demo.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "security.require-ssl=false"
})
class RefreshTokenIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    private User testUser;
    private String testPassword;

    @BeforeEach
    void setUp() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();

        testPassword = "testPassword123";
        testUser = User.builder()
                .email("test@example.com")
                .passwordHash(passwordEncoder.encode(testPassword))
                .fullName("Test User")
                .role("USER")
                .enabled(true)
                .emailVerified(true)
                .build();
        testUser = userRepository.save(testUser);
    }

    @Test
    void login_ShouldReturnAccessAndRefreshToken() throws Exception {
        AuthRequestDto loginRequest = AuthRequestDto.builder()
                .email(testUser.getEmail())
                .password(testPassword)
                .build();

        var result = mockMvc.perform(post("/api/auth/login")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.refreshToken").exists())
                .andExpect(jsonPath("$.refreshTokenExpiresAt").exists())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        AuthResponseDto response = objectMapper.readValue(responseBody, AuthResponseDto.class);

        assertThat(response.getToken()).isNotBlank();
        assertThat(response.getRefreshToken()).isNotBlank();
        assertThat(response.getRefreshTokenExpiresAt()).isNotNull();
    }

    @Test
    void refreshToken_ShouldReturnNewAccessAndRefreshToken() throws Exception {
        RefreshToken refreshToken = tokenService.generateRefreshToken(testUser);
        String oldRefreshTokenValue = refreshToken.getToken();
        
        assertThat(oldRefreshTokenValue).isNotBlank();
        
        assertThat(refreshTokenRepository.countActiveTokensByUserId(testUser.getId())).isGreaterThan(0);

        RefreshTokenDto refreshRequest = RefreshTokenDto.builder()
                .refreshToken(oldRefreshTokenValue)
                .build();

        var result = mockMvc.perform(post("/api/auth/refresh")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").exists())
                .andExpect(jsonPath("$.data.refreshToken").exists())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        AuthResponseDto response = objectMapper.readValue(
                objectMapper.readTree(responseBody).get("data").toString(),
                AuthResponseDto.class);

        assertThat(response.getToken()).isNotBlank();
        assertThat(response.getRefreshToken()).isNotBlank();
        assertThat(response.getRefreshToken()).isNotEqualTo(oldRefreshTokenValue);

        String hashedOldToken = tokenService.hashToken(oldRefreshTokenValue);
        RefreshToken oldToken = refreshTokenRepository.findByToken(hashedOldToken).orElse(null);
        assertThat(oldToken).isNotNull();
        assertThat(oldToken.isRevoked()).isTrue();
    }

    @Test
    void refreshToken_WithInvalidToken_ShouldReturnError() throws Exception {
        RefreshTokenDto refreshRequest = RefreshTokenDto.builder()
                .refreshToken("invalid-token")
                .build();

        mockMvc.perform(post("/api/auth/refresh")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void refreshToken_WithRevokedToken_ShouldReturnError() throws Exception {
        RefreshToken refreshToken = tokenService.generateRefreshToken(testUser);
        String tokenValue = refreshToken.getToken();
        tokenService.revokeRefreshToken(tokenValue);

        RefreshTokenDto refreshRequest = RefreshTokenDto.builder()
                .refreshToken(tokenValue)
                .build();

        mockMvc.perform(post("/api/auth/refresh")
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(refreshRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void logout_ShouldRevokeAllRefreshTokens() throws Exception {
        tokenService.generateRefreshToken(testUser);
        tokenService.generateRefreshToken(testUser);

        assertThat(refreshTokenRepository.countActiveTokensByUserId(testUser.getId())).isEqualTo(2);

        String token = generateJwtToken(testUser);
        mockMvc.perform(post("/api/auth/logout")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.message").value("Logged out successfully"));

        assertThat(refreshTokenRepository.countActiveTokensByUserId(testUser.getId())).isEqualTo(0);
    }

    private String generateJwtToken(User user) {
        return jwtUtil.generateToken(user);
    }
}

