package com.example.demo.controller;

import com.example.demo.dto.AuthRequestDto;
import com.example.demo.dto.AuthResponseDto;
import com.example.demo.dto.ForgotPasswordDto;
import com.example.demo.dto.RefreshTokenDto;
import com.example.demo.dto.RegisterDto;
import com.example.demo.dto.ResetPasswordDto;
import com.example.demo.entity.PasswordResetToken;
import com.example.demo.entity.RefreshToken;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.AuthTokenService;
import com.example.demo.service.EmailService;
import com.example.demo.service.LoginAttemptService;
import com.example.demo.service.TokenService;
import com.example.demo.util.AuditLoggingHelper;
import com.example.demo.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "User authentication and registration endpoints")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthTokenService authTokenService;
    private final EmailService emailService;
    private final TokenService tokenService;
    private final AuditLoggingHelper auditLoggingHelper;
    private final ObjectMapper objectMapper;
    private final LoginAttemptService loginAttemptService;

    @Value("${app.base-url:http://localhost:8080}")
    private String appBaseUrl;

    @Operation(
        summary = "Register new user",
        description = "Create a new user account and return JWT authentication token",
        responses = {
            @ApiResponse(responseCode = "201", description = "User registered successfully",
                content = @Content(schema = @Schema(implementation = AuthResponseDto.class))),
            @ApiResponse(responseCode = "400", description = "Email already exists")
        }
    )
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterDto registerDto) {
        try {
            // Check if user already exists
            if (userRepository.findByEmail(registerDto.getEmail()).isPresent()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Email already exists");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
            }

            // Create new user
            User user = User.builder()
                    .email(registerDto.getEmail())
                    .passwordHash(passwordEncoder.encode(registerDto.getPassword()))
                    .fullName(registerDto.getFullName())
                    .role("USER")
                    .enabled(true)
                    .emailVerified(false)
                    .build();

            user = userRepository.save(user);

            // Create email verification token and send email
            PasswordResetToken verificationToken = authTokenService.createEmailVerificationToken(user.getId());
            String verificationUrl = appBaseUrl + "/api/auth/verify?token=" + verificationToken.getToken();
            emailService.sendEmailVerificationEmail(user.getEmail(), verificationToken.getToken(), verificationUrl);

            // Generate JWT token
            String token = jwtUtil.generateToken(user);

            AuthResponseDto response = AuthResponseDto.builder()
                    .token(token)
                    .expiresAt(jwtUtil.getExpirationInstant(token))
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Registration failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @Operation(
        summary = "User login",
        description = "Authenticate user with email and password, returns JWT token",
        responses = {
            @ApiResponse(responseCode = "200", description = "Login successful",
                content = @Content(schema = @Schema(implementation = AuthResponseDto.class))),
            @ApiResponse(responseCode = "401", description = "Invalid credentials"),
            @ApiResponse(responseCode = "403", description = "Account disabled")
        }
    )
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequestDto authRequest, 
                                   HttpServletRequest request) {
        String email = authRequest.getEmail();
        String ipAddress = getClientIpAddress(request);
        
        try {
            // Check if account is locked
            loginAttemptService.checkLocked(email, ipAddress);
            
            // Find user by email
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> {
                        // Register failed attempt for non-existent user
                        loginAttemptService.registerFailed(email, ipAddress);
                        return new RuntimeException("Invalid email or password");
                    });

            // Validate password
            if (!passwordEncoder.matches(authRequest.getPassword(), user.getPasswordHash())) {
                // Register failed attempt
                loginAttemptService.registerFailed(email, ipAddress);
                Map<String, String> error = new HashMap<>();
                error.put("error", "Invalid email or password");
                int remaining = loginAttemptService.getRemainingAttemptsByEmail(email);
                error.put("remainingAttempts", String.valueOf(remaining));
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }

            // Check if user is enabled
            if (!user.isEnabled()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Account is disabled");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }

            // Reset failed attempts on successful login
            loginAttemptService.resetOnSuccess(email, ipAddress);

            // Generate JWT token
            String token = jwtUtil.generateToken(user);

            // Generate refresh token
            RefreshToken refreshToken = tokenService.generateRefreshToken(user);

            AuthResponseDto response = AuthResponseDto.builder()
                    .token(token)
                    .expiresAt(jwtUtil.getExpirationInstant(token))
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .refreshToken(refreshToken.getToken())
                    .refreshTokenExpiresAt(refreshToken.getExpiresAt())
                    .build();

            return ResponseEntity.ok(response);

        } catch (org.springframework.web.server.ResponseStatusException e) {
            // Account locked exception
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getReason());
            error.put("code", "ACCOUNT_LOCKED");
            return ResponseEntity.status(e.getStatusCode()).body(error);
        } catch (Exception e) {
            // Register failed attempt for any other error
            loginAttemptService.registerFailed(email, ipAddress);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Login failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
    }
    
    /**
     * Get client IP address from request
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("X-Real-IP");
        }
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }
        // Handle multiple IPs in X-Forwarded-For header
        if (ipAddress != null && ipAddress.contains(",")) {
            ipAddress = ipAddress.split(",")[0].trim();
        }
        return ipAddress;
    }

    @Operation(
        summary = "Get current user profile",
        description = "Retrieve authenticated user's profile information",
        responses = {
            @ApiResponse(responseCode = "200", description = "User profile retrieved"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
        }
    )
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7);
            String email = jwtUtil.getUsername(token);
            
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Map<String, Object> response = new HashMap<>();
            response.put("email", user.getEmail());
            response.put("fullName", user.getFullName());
            response.put("role", user.getRole());
            response.put("enabled", user.isEnabled());
            response.put("createdAt", user.getCreatedAt());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to get user info: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
    }

    @Operation(
        summary = "Forgot password",
        description = "Initiate password reset by sending reset link to email",
        responses = {
            @ApiResponse(responseCode = "200", description = "Password reset email sent (if user exists)"),
            @ApiResponse(responseCode = "400", description = "Invalid email format")
        }
    )
    @PostMapping("/forgot")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordDto dto) {
        var ctx = auditLoggingHelper.start("/api/auth/forgot", null, objectMapper.valueToTree(dto));

        try {
            User user = userRepository.findByEmail(dto.getEmail()).orElse(null);

            if (user != null) {
                PasswordResetToken resetToken = authTokenService.createPasswordResetToken(user.getId());
                String resetUrl = appBaseUrl + "/auth/reset?token=" + resetToken.getToken();
                emailService.sendPasswordResetEmail(user.getEmail(), resetToken.getToken(), resetUrl);
                log.info("Password reset email sent to {}", user.getEmail());
            } else {
                log.warn("Password reset requested for non-existent email: {}", dto.getEmail());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("requestId", ctx.requestId().toString());
            response.put("message", "If the email exists, a password reset link has been sent");
            response.put("success", true);

            return auditLoggingHelper.ok(ctx, response, "auth", false,
                objectMapper.createObjectNode().put("action", "forgot_password"));

        } catch (Exception e) {
            log.error("Error processing forgot password request: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to process request: " + e.getMessage(),
                HttpStatus.INTERNAL_SERVER_ERROR, "auth");
        }
    }

    @Operation(
        summary = "Reset password",
        description = "Reset password using token from email",
        responses = {
            @ApiResponse(responseCode = "200", description = "Password reset successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid or expired token"),
            @ApiResponse(responseCode = "400", description = "Invalid password")
        }
    )
    @PostMapping("/reset")
    @Transactional
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordDto dto) {
        var ctx = auditLoggingHelper.start("/api/auth/reset", null, objectMapper.valueToTree(dto));

        try {
            PasswordResetToken resetToken = authTokenService.validateToken(dto.getToken());

            if (resetToken == null) {
                return auditLoggingHelper.error(ctx, "Invalid or expired token",
                    HttpStatus.BAD_REQUEST, "auth");
            }

            User user = userRepository.findById(resetToken.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
            userRepository.save(user);

            authTokenService.markTokenAsUsed(dto.getToken());
            log.info("Password reset successful for user {}", user.getEmail());

            Map<String, Object> response = new HashMap<>();
            response.put("requestId", ctx.requestId().toString());
            response.put("message", "Password reset successfully");
            response.put("success", true);

            return auditLoggingHelper.ok(ctx, response, "auth", false,
                objectMapper.createObjectNode().put("action", "reset_password"));

        } catch (Exception e) {
            log.error("Error resetting password: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to reset password: " + e.getMessage(),
                HttpStatus.INTERNAL_SERVER_ERROR, "auth");
        }
    }

    @Operation(
        summary = "Verify email",
        description = "Verify email address using token from registration email",
        responses = {
            @ApiResponse(responseCode = "200", description = "Email verified successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid or expired token")
        }
    )
    @GetMapping("/verify")
    @Transactional
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        Map<String, String> params = new HashMap<>();
        params.put("token", token);
        var ctx = auditLoggingHelper.start("/api/auth/verify", null, objectMapper.valueToTree(params));

        try {
            PasswordResetToken verificationToken = authTokenService.validateToken(token);

            if (verificationToken == null) {
                return auditLoggingHelper.error(ctx, "Invalid or expired verification token",
                    HttpStatus.BAD_REQUEST, "auth");
            }

            User user = userRepository.findById(verificationToken.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            user.setEmailVerified(true);
            userRepository.save(user);

            authTokenService.markTokenAsUsed(token);
            log.info("Email verified for user {}", user.getEmail());

            Map<String, Object> response = new HashMap<>();
            response.put("requestId", ctx.requestId().toString());
            response.put("message", "Email verified successfully");
            response.put("success", true);
            response.put("email", user.getEmail());

            return auditLoggingHelper.ok(ctx, response, "auth", false,
                objectMapper.createObjectNode().put("action", "verify_email"));

        } catch (Exception e) {
            log.error("Error verifying email: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to verify email: " + e.getMessage(),
                HttpStatus.INTERNAL_SERVER_ERROR, "auth");
        }
    }

    @Operation(
        summary = "Refresh access token",
        description = "Refresh access token using refresh token. Returns new access token and rotated refresh token.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Token refreshed successfully",
                content = @Content(schema = @Schema(implementation = AuthResponseDto.class))),
            @ApiResponse(responseCode = "401", description = "Invalid or expired refresh token")
        }
    )
    @PostMapping("/refresh")
    @Transactional
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenDto dto) {
        var ctx = auditLoggingHelper.start("/api/auth/refresh", null, objectMapper.valueToTree(dto));

        try {
            RefreshToken oldRefreshToken = tokenService.validateRefreshToken(dto.getRefreshToken());

            if (oldRefreshToken == null) {
                return auditLoggingHelper.error(ctx, "Invalid or expired refresh token",
                    HttpStatus.UNAUTHORIZED, "auth");
            }

            User user = userRepository.findById(oldRefreshToken.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (!user.isEnabled()) {
                return auditLoggingHelper.error(ctx, "Account is disabled",
                    HttpStatus.FORBIDDEN, "auth");
            }

            RefreshToken newRefreshToken = tokenService.rotateRefreshToken(dto.getRefreshToken());
            if (newRefreshToken == null) {
                return auditLoggingHelper.error(ctx, "Failed to rotate refresh token",
                    HttpStatus.INTERNAL_SERVER_ERROR, "auth");
            }

            String newAccessToken = jwtUtil.generateToken(user);

            AuthResponseDto response = AuthResponseDto.builder()
                    .token(newAccessToken)
                    .expiresAt(jwtUtil.getExpirationInstant(newAccessToken))
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .refreshToken(newRefreshToken.getToken())
                    .refreshTokenExpiresAt(newRefreshToken.getExpiresAt())
                    .build();

            log.info("Token refreshed for user {}", user.getEmail());

            return auditLoggingHelper.ok(ctx, response, "auth", false,
                objectMapper.createObjectNode().put("action", "refresh_token"));

        } catch (Exception e) {
            log.error("Error refreshing token: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to refresh token: " + e.getMessage(),
                HttpStatus.INTERNAL_SERVER_ERROR, "auth");
        }
    }

    @Operation(
        summary = "Logout",
        description = "Revoke all refresh tokens for the authenticated user",
        responses = {
            @ApiResponse(responseCode = "200", description = "Logout successful"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
        }
    )
    @PostMapping("/logout")
    @Transactional
    public ResponseEntity<?> logout() {
        UUID userId = getCurrentUserId();
        Map<String, String> params = new HashMap<>();
        var ctx = auditLoggingHelper.start("/api/auth/logout", userId, objectMapper.valueToTree(params));

        try {
            if (userId == null) {
                return auditLoggingHelper.error(ctx, "User not authenticated",
                    HttpStatus.UNAUTHORIZED, "auth");
            }

            tokenService.revokeAllUserTokens(userId);
            log.info("User {} logged out, all refresh tokens revoked", userId);

            Map<String, Object> response = new HashMap<>();
            response.put("requestId", ctx.requestId().toString());
            response.put("message", "Logged out successfully");
            response.put("success", true);

            return auditLoggingHelper.ok(ctx, response, "auth", false,
                objectMapper.createObjectNode().put("action", "logout"));

        } catch (Exception e) {
            log.error("Error during logout: {}", e.getMessage(), e);
            return auditLoggingHelper.error(ctx, "Failed to logout: " + e.getMessage(),
                HttpStatus.INTERNAL_SERVER_ERROR, "auth");
        }
    }

    private UUID getCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                String email = auth.getName();
                return userRepository.findByEmail(email).map(User::getId).orElse(null);
            }
        } catch (Exception e) {
            log.debug("Could not get current user", e);
        }
        return null;
    }
}
