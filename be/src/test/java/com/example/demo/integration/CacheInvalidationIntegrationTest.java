package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.controller.AdminCacheController;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.CacheService;
import com.example.demo.util.CacheKeyUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration test for cache invalidation endpoint.
 * Verifies that admin can invalidate cache by key or pattern.
 */
@AutoConfigureMockMvc
class CacheInvalidationIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CacheService cacheService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        // Create admin user for testing
        User adminUser = User.builder()
                .email("admin@test.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .fullName("Admin User")
                .role("ADMIN")
                .enabled(true)
                .emailVerified(true)
                .build();
        userRepository.save(adminUser);

        // Populate some test cache entries
        cacheService.put("binance:klines:BTCUSDT:1m:null:null:100", "test-data-1", Duration.ofMinutes(10));
        cacheService.put("binance:klines:ETHUSDT:1m:null:null:100", "test-data-2", Duration.ofMinutes(10));
        cacheService.put("binance:ticker:BTCUSDT", "ticker-data", Duration.ofMinutes(5));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void invalidateCache_ByExactKey_ShouldSucceed() throws Exception {
        String cacheKey = "binance:klines:BTCUSDT:1m:null:null:100";
        
        // Verify cache exists before
        assertThat(cacheService.exists(cacheKey)).isTrue();

        Map<String, String> request = new HashMap<>();
        request.put("key", cacheKey);

        mockMvc.perform(post("/api/admin/cache/invalidate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"key\":\"" + cacheKey + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Cache invalidated successfully"))
                .andExpect(jsonPath("$.key").value(cacheKey))
                .andExpect(jsonPath("$.type").value("exact"));

        // Verify cache is deleted
        assertThat(cacheService.exists(cacheKey)).isFalse();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void invalidateCache_ByPattern_ShouldSucceed() throws Exception {
        String pattern = "binance:klines:*";
        
        // Verify cache entries exist before
        assertThat(cacheService.exists("binance:klines:BTCUSDT:1m:null:null:100")).isTrue();
        assertThat(cacheService.exists("binance:klines:ETHUSDT:1m:null:null:100")).isTrue();

        mockMvc.perform(post("/api/admin/cache/invalidate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pattern\":\"" + pattern + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Cache invalidated successfully"))
                .andExpect(jsonPath("$.pattern").value(pattern))
                .andExpect(jsonPath("$.type").value("pattern"));

        // Verify klines cache entries are deleted
        assertThat(cacheService.exists("binance:klines:BTCUSDT:1m:null:null:100")).isFalse();
        assertThat(cacheService.exists("binance:klines:ETHUSDT:1m:null:null:100")).isFalse();
        
        // Verify other cache entries are not deleted
        assertThat(cacheService.exists("binance:ticker:BTCUSDT")).isTrue();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void invalidateCache_WithoutKeyOrPattern_ShouldReturnError() throws Exception {
        mockMvc.perform(post("/api/admin/cache/invalidate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void checkCacheKey_ShouldReturnKeyStatus() throws Exception {
        String cacheKey = "binance:ticker:BTCUSDT";
        
        mockMvc.perform(get("/api/admin/cache/exists/" + cacheKey))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.key").value(cacheKey))
                .andExpect(jsonPath("$.exists").value(true))
                .andExpect(jsonPath("$.ttl").exists());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void clearAllCache_ShouldSucceed() throws Exception {
        // Verify cache entries exist before
        assertThat(cacheService.exists("binance:ticker:BTCUSDT")).isTrue();

        mockMvc.perform(post("/api/admin/cache/clear-all")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("All cache cleared successfully"));

        // Verify all cache is cleared
        assertThat(cacheService.exists("binance:ticker:BTCUSDT")).isFalse();
    }

    @Test
    @WithMockUser(roles = "USER") // Non-admin user
    void invalidateCache_WithoutAdminRole_ShouldReturnForbidden() throws Exception {
        mockMvc.perform(post("/api/admin/cache/invalidate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"key\":\"test-key\"}"))
                .andExpect(status().isForbidden());
    }
}

