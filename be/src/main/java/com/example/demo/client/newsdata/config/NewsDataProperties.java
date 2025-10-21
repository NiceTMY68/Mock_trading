package com.example.demo.client.newsdata.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "newsdata")
public class NewsDataProperties {
    private String apiKey;
    private String baseUrl = "https://newsdata.io/api/1";
}

