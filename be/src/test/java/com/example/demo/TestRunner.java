package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Test runner to execute all tests
 * Run this class to execute the complete test suite
 */
@SpringBootTest
@ActiveProfiles("test")
class TestRunner {

    @Test
    void contextLoads() {
        // This test ensures the Spring context loads properly
        // All other tests will be executed by the test framework
    }
}
