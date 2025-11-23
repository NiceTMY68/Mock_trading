package com.example.demo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request to refresh access token")
public class RefreshTokenDto {

    @NotBlank(message = "Refresh token is required")
    @Schema(description = "Refresh token", example = "abc123...", requiredMode = Schema.RequiredMode.REQUIRED)
    private String refreshToken;
}
