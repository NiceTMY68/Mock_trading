package com.example.demo.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {
    
    @Bean
    public OpenAPI apiInfo() {
        return new OpenAPI()
            .info(new Info()
                .title("Crypto Mock Trading API")
                .version("0.1.0")
                .description("API documentation for Crypto Mock Trading backend. " +
                    "Provides endpoints for authentication, market data proxy (Binance), " +
                    "news aggregation, mock trading, backtesting, alerts, and subscription management.")
                .contact(new Contact()
                    .name("Development Team")
                    .email("dev@example.com")))
            .servers(List.of(
                new Server().url("http://localhost:8080").description("Local development server")
            ))
            .components(new Components()
                .addSecuritySchemes("bearerAuth",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("JWT authentication token. Obtain via /api/auth/login")));
    }
}

