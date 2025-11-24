package com.example.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.retry.backoff.ExponentialBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableRetry
public class EmailRetryConfig {

    @Value("${email.retry.max-attempts:3}")
    private int maxAttempts;

    @Value("${email.retry.initial-interval-ms:1000}")
    private long initialIntervalMs;

    @Value("${email.retry.multiplier:2.0}")
    private double multiplier;

    @Value("${email.retry.max-interval-ms:10000}")
    private long maxIntervalMs;

    @Bean
    public RetryTemplate emailRetryTemplate() {
        RetryTemplate retryTemplate = new RetryTemplate();

        // Retry policy: retry on exceptions (IOException, RuntimeException from SendGrid)
        Map<Class<? extends Throwable>, Boolean> retryableExceptions = new HashMap<>();
        retryableExceptions.put(Exception.class, true);
        retryableExceptions.put(RuntimeException.class, true);

        SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy(maxAttempts, retryableExceptions);
        retryTemplate.setRetryPolicy(retryPolicy);

        // Exponential backoff policy
        ExponentialBackOffPolicy backOffPolicy = new ExponentialBackOffPolicy();
        backOffPolicy.setInitialInterval(initialIntervalMs);
        backOffPolicy.setMultiplier(multiplier);
        backOffPolicy.setMaxInterval(maxIntervalMs);
        retryTemplate.setBackOffPolicy(backOffPolicy);

        return retryTemplate;
    }
}

