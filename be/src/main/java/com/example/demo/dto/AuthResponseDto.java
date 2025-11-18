package com.example.demo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Authentication response with JWT token")
public class AuthResponseDto {

    @Schema(description = "JWT authentication token", example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    private String token;
    
    @Schema(description = "Token expiration timestamp", example = "2024-12-31T23:59:59Z")
    private Instant expiresAt;
    
    @Schema(description = "User email", example = "user@example.com")
    private String email;
    
    @Schema(description = "User's full name", example = "John Doe")
    private String fullName;
}

