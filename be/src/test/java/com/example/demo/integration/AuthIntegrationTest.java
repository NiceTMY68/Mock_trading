package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.dto.AuthRequestDto;
import com.example.demo.dto.AuthResponseDto;
import com.example.demo.dto.RegisterDto;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class AuthIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void testRegisterAndLoginFlow() throws Exception {
        // Step 1: Register new user
        RegisterDto registerDto = RegisterDto.builder()
                .email("test@example.com")
                .password("password123")
                .fullName("Test User")
                .build();

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.fullName").value("Test User"))
                .andReturn();

        String registerResponse = registerResult.getResponse().getContentAsString();
        AuthResponseDto registerAuthResponse = objectMapper.readValue(registerResponse, AuthResponseDto.class);
        String registerToken = registerAuthResponse.getToken();

        // Verify user was created in database
        User savedUser = userRepository.findByEmail("test@example.com").orElse(null);
        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getEmail()).isEqualTo("test@example.com");
        assertThat(savedUser.getFullName()).isEqualTo("Test User");
        assertThat(savedUser.getPasswordHash()).isNotEqualTo("password123"); // Should be hashed

        // Step 2: Login with registered credentials
        AuthRequestDto loginDto = AuthRequestDto.builder()
                .email("test@example.com")
                .password("password123")
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andReturn();

        String loginResponse = loginResult.getResponse().getContentAsString();
        AuthResponseDto loginAuthResponse = objectMapper.readValue(loginResponse, AuthResponseDto.class);
        String loginToken = loginAuthResponse.getToken();

        // Tokens should be different (new token generated on each login)
        assertThat(loginToken).isNotBlank();
        assertThat(loginAuthResponse.getExpiresAt()).isNotNull();

        // Step 3: Call protected endpoint with token
        mockMvc.perform(get("/api/v1/binance/market/top-3")
                        .header("Authorization", "Bearer " + loginToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    void testRegisterWithDuplicateEmail() throws Exception {
        // Register first user
        RegisterDto registerDto = RegisterDto.builder()
                .email("duplicate@example.com")
                .password("password123")
                .fullName("First User")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerDto)))
                .andExpect(status().isCreated());

        // Try to register with same email
        RegisterDto duplicateDto = RegisterDto.builder()
                .email("duplicate@example.com")
                .password("password456")
                .fullName("Second User")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Email already exists"));
    }

    @Test
    void testLoginWithInvalidCredentials() throws Exception {
        // Register a user
        RegisterDto registerDto = RegisterDto.builder()
                .email("valid@example.com")
                .password("correctPassword")
                .fullName("Valid User")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerDto)))
                .andExpect(status().isCreated());

        // Try to login with wrong password
        AuthRequestDto wrongPassword = AuthRequestDto.builder()
                .email("valid@example.com")
                .password("wrongPassword")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wrongPassword)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid email or password"));

        // Try to login with non-existent email
        AuthRequestDto wrongEmail = AuthRequestDto.builder()
                .email("nonexistent@example.com")
                .password("anyPassword")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wrongEmail)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testProtectedEndpointWithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/binance/market/top-3"))
                .andExpect(status().isForbidden());
    }

    @Test
    void testProtectedEndpointWithInvalidToken() throws Exception {
        mockMvc.perform(get("/api/v1/binance/market/top-3")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isForbidden());
    }

    @Test
    void testRegisterValidation() throws Exception {
        // Test missing email
        RegisterDto invalidDto = RegisterDto.builder()
                .password("password123")
                .fullName("Test User")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDto)))
                .andExpect(status().isBadRequest());

        // Test invalid email format
        RegisterDto invalidEmail = RegisterDto.builder()
                .email("invalid-email")
                .password("password123")
                .fullName("Test User")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidEmail)))
                .andExpect(status().isBadRequest());

        // Test short password
        RegisterDto shortPassword = RegisterDto.builder()
                .email("test@example.com")
                .password("short")
                .fullName("Test User")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(shortPassword)))
                .andExpect(status().isBadRequest());
    }
}
