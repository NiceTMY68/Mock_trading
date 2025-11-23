package com.example.demo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request to reset password with token")
public class ResetPasswordDto {

    @NotBlank(message = "Token is required")
    @Schema(description = "Password reset token", example = "abc123...", requiredMode = Schema.RequiredMode.REQUIRED)
    private String token;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Schema(description = "New password", example = "newSecurePassword123", requiredMode = Schema.RequiredMode.REQUIRED)
    private String password;
}

