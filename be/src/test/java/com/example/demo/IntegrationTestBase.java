package com.example.demo;

import org.junit.jupiter.api.BeforeAll;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
public abstract class IntegrationTestBase {
    
    @Container
    static final PostgreSQLContainer<?> postgresContainer = new PostgreSQLContainer<>(
        DockerImageName.parse("postgres:15-alpine"))
        .withDatabaseName("testdb")
        .withUsername("testuser")
        .withPassword("testpass");
    
    @Container
    static final GenericContainer<?> redisContainer = new GenericContainer<>(
        DockerImageName.parse("redis:7-alpine"))
        .withExposedPorts(6379);
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgresContainer::getJdbcUrl);
        registry.add("spring.datasource.username", postgresContainer::getUsername);
        registry.add("spring.datasource.password", postgresContainer::getPassword);
        
        registry.add("spring.data.redis.host", redisContainer::getHost);
        registry.add("spring.data.redis.port", () -> redisContainer.getMappedPort(6379));
    }
    
    @BeforeAll
    static void beforeAll() {
        postgresContainer.start();
        redisContainer.start();
    }
}

