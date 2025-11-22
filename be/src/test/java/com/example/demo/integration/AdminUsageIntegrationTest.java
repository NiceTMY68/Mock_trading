package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.entity.UsageMetric;
import com.example.demo.entity.User;
import com.example.demo.repository.UsageMetricRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.UsageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "security.require-ssl=false"
})
class AdminUsageIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsageService usageService;

    @Autowired
    private UsageMetricRepository usageMetricRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User adminUser;
    private User regularUser;
    private UUID testUserId;

    @BeforeEach
    void setUp() {
        usageMetricRepository.deleteAll();
        userRepository.deleteAll();

        adminUser = User.builder()
                .email("admin@test.com")
                .passwordHash(passwordEncoder.encode("password"))
                .fullName("Admin User")
                .role("ADMIN")
                .enabled(true)
                .build();
        adminUser = userRepository.save(adminUser);

        regularUser = User.builder()
                .email("user@test.com")
                .passwordHash(passwordEncoder.encode("password"))
                .fullName("Regular User")
                .role("USER")
                .enabled(true)
                .build();
        regularUser = userRepository.save(regularUser);
        testUserId = regularUser.getId();

        usageService.increment(UsageService.NEWS_API_CALLS, testUserId, 5);
        usageService.increment(UsageService.NEWS_API_ARTICLES, testUserId, 10);
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getUsage_AsAdmin_ShouldReturnMetrics() throws Exception {
        mockMvc.perform(get("/api/admin/usage")
                .param("metric", UsageService.NEWS_API_CALLS))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.requestId").exists())
                .andExpect(jsonPath("$.data.metricKey").value(UsageService.NEWS_API_CALLS))
                .andExpect(jsonPath("$.data.totalUsage").value(5))
                .andExpect(jsonPath("$.data.callCount").value(1));
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getUsage_WithSince_ShouldFilterByDate() throws Exception {
        Instant yesterday = Instant.now().minusSeconds(86400);
        
        mockMvc.perform(get("/api/admin/usage")
                .param("metric", UsageService.NEWS_API_CALLS)
                .param("since", yesterday.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalUsage").exists());
    }

    @Test
    @WithMockUser(username = "user@test.com", roles = "USER")
    void getUsage_AsRegularUser_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/admin/usage")
                .param("metric", UsageService.NEWS_API_CALLS))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getDailyStats_AsAdmin_ShouldReturn24hStats() throws Exception {
        mockMvc.perform(get("/api/admin/usage/daily")
                .param("metric", UsageService.NEWS_API_CALLS))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.requestId").exists())
                .andExpect(jsonPath("$.data.metricKey").value(UsageService.NEWS_API_CALLS))
                .andExpect(jsonPath("$.data.period").value("24h"))
                .andExpect(jsonPath("$.data.totalUsage").exists())
                .andExpect(jsonPath("$.data.callCount").exists());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getTopUsers_AsAdmin_ShouldReturnTopUsers() throws Exception {
        mockMvc.perform(get("/api/admin/usage/top-users")
                .param("metric", UsageService.NEWS_API_CALLS)
                .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.requestId").exists())
                .andExpect(jsonPath("$.data.metricKey").value(UsageService.NEWS_API_CALLS))
                .andExpect(jsonPath("$.data.topUsers").isArray())
                .andExpect(jsonPath("$.data.count").exists());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getMetricHistory_AsAdmin_ShouldReturnHistory() throws Exception {
        mockMvc.perform(get("/api/admin/usage/history")
                .param("metric", UsageService.NEWS_API_CALLS)
                .param("limit", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.requestId").exists())
                .andExpect(jsonPath("$.data.metricKey").value(UsageService.NEWS_API_CALLS))
                .andExpect(jsonPath("$.data.history").isArray())
                .andExpect(jsonPath("$.data.count").exists());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void getUsage_AfterMultipleCalls_ShouldReturnAggregatedData() throws Exception {
        usageService.increment(UsageService.NEWS_API_CALLS, testUserId, 3);
        usageService.increment(UsageService.NEWS_API_CALLS, testUserId, 2);

        mockMvc.perform(get("/api/admin/usage")
                .param("metric", UsageService.NEWS_API_CALLS))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalUsage").value(10))
                .andExpect(jsonPath("$.data.callCount").value(3));
    }
}

