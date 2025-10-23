package com.example.demo.integration;

import com.example.demo.dto.LoginDto;
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
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Rollback
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        // Clear any existing data to avoid conflicts
    }

    @Test
    void registerAndLogin_ShouldWorkEndToEnd() throws Exception {
        // Given
        RegisterDto registerDto = RegisterDto.builder()
                .email("integration@example.com")
                .password("password123")
                .fullName("Integration Test User")
                .build();

        // When - Register
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.email").value("integration@example.com"))
                .andExpect(jsonPath("$.fullName").value("Integration Test User"))
                .andReturn();

        // Verify user was saved to database
        assertThat(userRepository.findByEmail("integration@example.com")).isPresent();
        User savedUser = userRepository.findByEmail("integration@example.com").get();
        assertThat(savedUser.getFullName()).isEqualTo("Integration Test User");
        assertThat(savedUser.isEnabled()).isTrue();
        assertThat(savedUser.getRole()).isEqualTo("USER");

        // When - Login with same credentials
        LoginDto loginDto = LoginDto.builder()
                .email("integration@example.com")
                .password("password123")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.email").value("integration@example.com"))
                .andExpect(jsonPath("$.fullName").value("Integration Test User"));
    }

    @Test
    void register_ShouldFail_WhenEmailAlreadyExists() throws Exception {
        // Given - Create user first
        User existingUser = User.builder()
                .email("existing@example.com")
                .passwordHash("hashedPassword")
                .fullName("Existing User")
                .role("USER")
                .enabled(true)
                .build();
        userRepository.save(existingUser);

        RegisterDto registerDto = RegisterDto.builder()
                .email("existing@example.com")
                .password("password123")
                .fullName("New User")
                .build();

        // When & Then
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Email already exists"));
    }

    @Test
    void login_ShouldFail_WhenUserDoesNotExist() throws Exception {
        // Given
        LoginDto loginDto = LoginDto.builder()
                .email("nonexistent@example.com")
                .password("password123")
                .build();

        // When & Then
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Login failed: Invalid email or password"));
    }

    @Test
    void login_ShouldFail_WhenPasswordIsWrong() throws Exception {
        // Given - Create user first
        User existingUser = User.builder()
                .email("test@example.com")
                .passwordHash("hashedPassword")
                .fullName("Test User")
                .role("USER")
                .enabled(true)
                .build();
        userRepository.save(existingUser);

        LoginDto loginDto = LoginDto.builder()
                .email("test@example.com")
                .password("wrongPassword")
                .build();

        // When & Then
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid email or password"));
    }
}
