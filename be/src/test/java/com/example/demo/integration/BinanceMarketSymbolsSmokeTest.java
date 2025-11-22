package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.entity.RequestLog;
import com.example.demo.repository.RequestLogRepository;
import com.example.demo.service.CacheService;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "binance.api.base-url=http://localhost:8090/api/v3",
    "binance.websocket.base-url=ws://localhost:8090/ws"
})
class BinanceMarketSymbolsSmokeTest extends IntegrationTestBase {

    private static WireMockServer wireMockServer;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RequestLogRepository requestLogRepository;

    @Autowired
    private CacheService cacheService;

    @BeforeAll
    static void beforeAll() {
        wireMockServer = new WireMockServer(8090);
        wireMockServer.start();
        WireMock.configureFor("localhost", 8090);
    }

    @AfterAll
    static void afterAll() {
        if (wireMockServer != null) {
            wireMockServer.stop();
        }
    }

    @BeforeEach
    void setUp() {
        requestLogRepository.deleteAll();
        cacheService.clearAll();
        wireMockServer.resetAll();
    }

    @Test
    @WithMockUser(username = "test@example.com", roles = "USER")
    void getAllSymbols_ShouldIncludeRequestIdInResponse_AndPersistRequestLog() throws Exception {
        String mockResponse = """
            {
                "symbols": [
                    {
                        "symbol": "BTCUSDT",
                        "status": "TRADING",
                        "baseAsset": "BTC",
                        "quoteAsset": "USDT"
                    },
                    {
                        "symbol": "ETHUSDT",
                        "status": "TRADING",
                        "baseAsset": "ETH",
                        "quoteAsset": "USDT"
                    }
                ]
            }
            """;

        wireMockServer.stubFor(
            WireMock.get(urlPathEqualTo("/api/v3/exchangeInfo"))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody(mockResponse))
        );

        String responseContent = mockMvc.perform(get("/api/v1/binance/market/symbols"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.requestId").exists())
                .andExpect(jsonPath("$.data").isArray())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String requestIdStr = extractRequestId(responseContent);
        assertThat(requestIdStr).isNotNull();

        UUID requestId = UUID.fromString(requestIdStr);

        Optional<RequestLog> requestLog = requestLogRepository.findByRequestId(requestId);
        assertThat(requestLog).isPresent();

        RequestLog log = requestLog.get();
        assertThat(log.getEndpoint()).isEqualTo("/api/v1/binance/market/symbols");
        assertThat(log.getProvider()).isEqualTo("binance");
        assertThat(log.getStatusCode()).isEqualTo(200);
        assertThat(log.getLatencyMs()).isNotNull();
        assertThat(log.getProviderMeta()).isNotNull();
    }

    @Test
    void getAllSymbols_ShouldReturn403_WhenNoJWT() throws Exception {
        mockMvc.perform(get("/api/v1/binance/market/symbols"))
                .andExpect(status().isForbidden());
    }

    private String extractRequestId(String jsonResponse) {
        Pattern pattern = Pattern.compile("\"requestId\"\\s*:\\s*\"([a-f0-9-]+)\"");
        java.util.regex.Matcher matcher = pattern.matcher(jsonResponse);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }
}

