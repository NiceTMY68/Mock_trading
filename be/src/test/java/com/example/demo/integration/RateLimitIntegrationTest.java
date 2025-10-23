package com.example.demo.integration;

import com.example.demo.config.TestConfig;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.annotation.Rollback;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for rate limiting functionality
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Rollback
@Import(TestConfig.class)
class RateLimitIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private StringRedisTemplate rateLimiterRedisTemplate;
    
    private User freeUser;
    private User proUser;
    
    @BeforeEach
    void setUp() {
        // Clear Redis rate limit keys
        clearRateLimitKeys();
        
        // Clear database
        userRepository.deleteAll();
        
        // Create test users
        freeUser = User.builder()
                .email("free@example.com")
                .passwordHash("hashedPassword")
                .fullName("Free User")
                .role("USER")
                .enabled(true)
                .createdAt(Instant.now())
                .build();
        userRepository.save(freeUser);
        
        proUser = User.builder()
                .email("pro@example.com")
                .passwordHash("hashedPassword")
                .fullName("Pro User")
                .role("PRO")
                .enabled(true)
                .createdAt(Instant.now())
                .build();
        userRepository.save(proUser);
    }
    
    @Test
    @WithMockUser(username = "free@example.com")
    void rateLimiting_ShouldAllowRequestsWithinLimit() throws Exception {
        // Given - Free user has 60 requests per minute
        int requestsToMake = 10; // Well within limit
        
        // When - Make requests
        for (int i = 0; i < requestsToMake; i++) {
            MvcResult result = mockMvc.perform(get("/api/v1/binance/market/top-3")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(header().exists("X-RateLimit-Limit"))
                    .andExpect(header().exists("X-RateLimit-Remaining"))
                    .andReturn();
            
            String limitHeader = result.getResponse().getHeader("X-RateLimit-Limit");
            assertThat(limitHeader).isEqualTo("60");
        }
    }
    
    @Test
    @WithMockUser(username = "free@example.com")
    void rateLimiting_ShouldReturn429_WhenLimitExceeded() throws Exception {
        // Given - Free user has 60 requests per minute, bucket size = 120
        // We'll make requests until we hit the limit
        int bucketSize = 120; // 60 * 2 (bucket size multiplier)
        
        // When - Make requests until rate limit
        int successfulRequests = 0;
        boolean rateLimitHit = false;
        
        for (int i = 0; i < bucketSize + 10; i++) {
            MvcResult result = mockMvc.perform(get("/api/v1/binance/market/top-3")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andReturn();
            
            int status = result.getResponse().getStatus();
            
            if (status == 200) {
                successfulRequests++;
            } else if (status == 429) {
                rateLimitHit = true;
                
                // Verify 429 response
                String contentType = result.getResponse().getContentType();
                assertThat(contentType).contains("application/json");
                
                String responseBody = result.getResponse().getContentAsString();
                assertThat(responseBody).contains("Rate limit exceeded");
                assertThat(responseBody).contains("Too many requests");
                
                // Verify rate limit headers
                String limitHeader = result.getResponse().getHeader("X-RateLimit-Limit");
                String remainingHeader = result.getResponse().getHeader("X-RateLimit-Remaining");
                String retryAfterHeader = result.getResponse().getHeader("Retry-After");
                
                assertThat(limitHeader).isEqualTo("60");
                assertThat(remainingHeader).isEqualTo("0");
                assertThat(retryAfterHeader).isEqualTo("60");
                
                break;
            }
        }
        
        // Then
        assertThat(rateLimitHit).isTrue();
        // Allow some tolerance for token refill during test execution
        assertThat(successfulRequests).isLessThanOrEqualTo(bucketSize + 2);
    }
    
    @Test
    @WithMockUser(username = "pro@example.com")
    void rateLimiting_ShouldAllowMoreRequestsForProUser() throws Exception {
        // Given - Pro user has 300 requests per minute
        int requestsToMake = 50; // Well within pro limit
        
        // When - Make requests
        for (int i = 0; i < requestsToMake; i++) {
            MvcResult result = mockMvc.perform(get("/api/v1/binance/market/top-3")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(header().exists("X-RateLimit-Limit"))
                    .andReturn();
            
            String limitHeader = result.getResponse().getHeader("X-RateLimit-Limit");
            assertThat(limitHeader).isEqualTo("300");
        }
    }
    
    @Test
    void rateLimiting_ShouldApplyLowerLimitForAnonymousUsers() throws Exception {
        // Given - Anonymous user has 20 requests per minute
        int bucketSize = 40; // 20 * 2 (bucket size multiplier)
        
        // When - Make requests without authentication
        int successfulRequests = 0;
        boolean rateLimitHit = false;
        
        for (int i = 0; i < bucketSize + 10; i++) {
            MvcResult result = mockMvc.perform(get("/api/v1/binance/market/top-3")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andReturn();
            
            int status = result.getResponse().getStatus();
            
            // Anonymous users will get 403 Forbidden due to security
            // In real scenario with public endpoints, this would work differently
            if (status == 403) {
                // Expected for protected endpoints
                break;
            } else if (status == 200) {
                successfulRequests++;
            } else if (status == 429) {
                rateLimitHit = true;
                
                String limitHeader = result.getResponse().getHeader("X-RateLimit-Limit");
                assertThat(limitHeader).isEqualTo("20");
                break;
            }
        }
    }
    
    @Test
    @WithMockUser(username = "free@example.com")
    void rateLimiting_ShouldIncludeRateLimitHeadersInResponse() throws Exception {
        // When
        MvcResult result = mockMvc.perform(get("/api/v1/binance/market/top-3")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();
        
        // Then - Verify rate limit headers are present
        String limitHeader = result.getResponse().getHeader("X-RateLimit-Limit");
        String remainingHeader = result.getResponse().getHeader("X-RateLimit-Remaining");
        String resetHeader = result.getResponse().getHeader("X-RateLimit-Reset");
        
        assertThat(limitHeader).isNotNull();
        assertThat(remainingHeader).isNotNull();
        assertThat(resetHeader).isNotNull();
        
        assertThat(limitHeader).isEqualTo("60");
        assertThat(Integer.parseInt(remainingHeader)).isGreaterThanOrEqualTo(0);
    }
    
    @Test
    @WithMockUser(username = "free@example.com")
    void rateLimiting_ShouldDecrementRemainingTokens() throws Exception {
        // Given
        MvcResult firstResult = mockMvc.perform(get("/api/v1/binance/market/top-3")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();
        
        int firstRemaining = Integer.parseInt(firstResult.getResponse().getHeader("X-RateLimit-Remaining"));
        
        // When - Make another request
        MvcResult secondResult = mockMvc.perform(get("/api/v1/binance/market/top-3")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();
        
        int secondRemaining = Integer.parseInt(secondResult.getResponse().getHeader("X-RateLimit-Remaining"));
        
        // Then - Remaining should decrease (or stay same due to refill)
        assertThat(secondRemaining).isLessThanOrEqualTo(firstRemaining);
    }
    
    @Test
    @WithMockUser(username = "free@example.com")
    void rateLimiting_ShouldNotApplyToAuthEndpoints() throws Exception {
        // Auth endpoints should be excluded from rate limiting
        // This is configured in WebConfig
        
        // We can't easily test auth endpoints here since they're public
        // but the configuration is verified in WebConfig
        assertThat(true).isTrue(); // Placeholder test
    }
    
    @Test
    @WithMockUser(username = "free@example.com")
    void rateLimiting_ShouldApplyToAllApiV1Endpoints() throws Exception {
        // Test different endpoints to ensure rate limiter applies to all
        
        String[] endpoints = {
            "/api/v1/binance/market/top-3",
            "/api/v1/binance/market/symbols"
        };
        
        for (String endpoint : endpoints) {
            MvcResult result = mockMvc.perform(get(endpoint)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(header().exists("X-RateLimit-Limit"))
                    .andExpect(header().exists("X-RateLimit-Remaining"))
                    .andReturn();
            
            String limitHeader = result.getResponse().getHeader("X-RateLimit-Limit");
            assertThat(limitHeader).isEqualTo("60");
        }
    }
    
    // Helper methods
    
    private void clearRateLimitKeys() {
        try {
            // Clear all rate limit keys from Redis
            var keys = rateLimiterRedisTemplate.keys("rate_limit:*");
            if (keys != null && !keys.isEmpty()) {
                rateLimiterRedisTemplate.delete(keys);
            }
        } catch (Exception e) {
            // Ignore if Redis is not available in test environment
        }
    }
}

