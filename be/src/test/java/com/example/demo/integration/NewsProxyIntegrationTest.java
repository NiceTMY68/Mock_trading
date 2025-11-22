package com.example.demo.integration;

import com.example.demo.IntegrationTestBase;
import com.example.demo.client.newsdata.service.NewsProxyService;
import com.example.demo.dto.NewsQueryParams;
import com.example.demo.dto.NewsResponseDto;
import com.example.demo.repository.UsageMetricRepository;
import com.example.demo.service.CacheService;
import com.example.demo.service.UsageService;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;
import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
    "newsdata.base-url=http://localhost:8093"
})
@TestPropertySource(properties = {
    "newsdata.base-url=http://localhost:8093"
})
class NewsProxyIntegrationTest extends IntegrationTestBase {

    private static WireMockServer wireMockServer;

    @Autowired
    private NewsProxyService newsProxyService;

    @Autowired
    private CacheService cacheService;

    @Autowired
    private UsageMetricRepository usageMetricRepository;

    private UUID testUserId;

    @BeforeAll
    static void beforeAll() {
        wireMockServer = new WireMockServer(8093);
        wireMockServer.start();
        WireMock.configureFor("localhost", 8093);
    }

    @AfterAll
    static void afterAll() {
        if (wireMockServer != null) {
            wireMockServer.stop();
        }
    }

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        cacheService.clearAll();
        usageMetricRepository.deleteAll();
        wireMockServer.resetAll();
    }

    @Test
    void getCryptoNews_ShouldCacheResponse_WhenCalledTwice() {
        String mockResponse = """
            {
                "status": "success",
                "totalResults": 2,
                "results": [
                    {
                        "title": "Bitcoin News 1",
                        "description": "Description 1",
                        "pubDate": "2024-01-01T00:00:00Z"
                    },
                    {
                        "title": "Bitcoin News 2",
                        "description": "Description 2",
                        "pubDate": "2024-01-02T00:00:00Z"
                    }
                ]
            }
            """;

        wireMockServer.stubFor(
            WireMock.get(urlPathMatching("/crypto.*"))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody(mockResponse))
        );

        NewsQueryParams params = NewsQueryParams.builder()
                .fromDate(Instant.parse("2024-01-01T00:00:00Z"))
                .toDate(Instant.parse("2024-01-31T23:59:59Z"))
                .build();

        UUID requestId1 = UUID.randomUUID();
        NewsResponseDto response1 = newsProxyService.getCryptoNews(requestId1, testUserId, params);
        
        assertThat(response1).isNotNull();
        assertThat(response1.getData()).isNotNull();
        assertThat(response1.isCached()).isFalse();

        UUID requestId2 = UUID.randomUUID();
        NewsResponseDto response2 = newsProxyService.getCryptoNews(requestId2, testUserId, params);
        
        assertThat(response2).isNotNull();
        assertThat(response2.getData()).isNotNull();
        assertThat(response2.isCached()).isTrue();

        wireMockServer.verify(1, getRequestedFor(urlPathMatching("/crypto.*")));
    }

    @Test
    void getCryptoNews_ShouldIncrementUsageMetrics_WhenFetchingNews() {
        String mockResponse = """
            {
                "status": "success",
                "totalResults": 3,
                "results": [
                    {"title": "News 1"},
                    {"title": "News 2"},
                    {"title": "News 3"}
                ]
            }
            """;

        wireMockServer.stubFor(
            WireMock.get(urlPathMatching("/crypto.*"))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody(mockResponse))
        );

        NewsQueryParams params = NewsQueryParams.builder()
                .fromDate(Instant.parse("2024-01-01T00:00:00Z"))
                .toDate(Instant.parse("2024-01-31T23:59:59Z"))
                .build();

        UUID requestId = UUID.randomUUID();
        newsProxyService.getCryptoNews(requestId, testUserId, params);

        Long callsCount = usageMetricRepository.countByMetricKeyAndUserId(
            UsageService.NEWS_API_CALLS, testUserId);
        Long articlesCount = usageMetricRepository.sumAmountByMetricKeyAndUserId(
            UsageService.NEWS_API_ARTICLES, testUserId);

        assertThat(callsCount).isGreaterThan(0);
        assertThat(articlesCount).isGreaterThanOrEqualTo(3);
    }

    @Test
    void getCryptoNews_ShouldNotIncrementUsageMetrics_WhenServedFromCache() {
        String mockResponse = """
            {
                "status": "success",
                "totalResults": 2,
                "results": [
                    {"title": "News 1"},
                    {"title": "News 2"}
                ]
            }
            """;

        wireMockServer.stubFor(
            WireMock.get(urlPathMatching("/crypto.*"))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody(mockResponse))
        );

        NewsQueryParams params = NewsQueryParams.builder()
                .fromDate(Instant.parse("2024-01-01T00:00:00Z"))
                .toDate(Instant.parse("2024-01-31T23:59:59Z"))
                .build();

        UUID requestId1 = UUID.randomUUID();
        newsProxyService.getCryptoNews(requestId1, testUserId, params);

        Long callsCountBefore = usageMetricRepository.countByMetricKeyAndUserId(
            UsageService.NEWS_API_CALLS, testUserId);

        UUID requestId2 = UUID.randomUUID();
        newsProxyService.getCryptoNews(requestId2, testUserId, params);

        Long callsCountAfter = usageMetricRepository.countByMetricKeyAndUserId(
            UsageService.NEWS_API_CALLS, testUserId);

        assertThat(callsCountAfter).isEqualTo(callsCountBefore);
    }
}

