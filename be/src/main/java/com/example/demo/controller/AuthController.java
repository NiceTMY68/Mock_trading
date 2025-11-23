package com.example.demo.controller;

import com.example.demo.dto.AuthRequestDto;
import com.example.demo.dto.AuthResponseDto;
import com.example.demo.dto.ForgotPasswordDto;
import com.example.demo.dto.RegisterDto;
import com.example.demo.dto.ResetPasswordDto;
import com.example.demo.entity.PasswordResetToken;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.AuthTokenService;
import com.example.demo.service.EmailService;
import com.example.demo.util.AuditLoggingHelper;
import com.example.demo.util.JwtUtil;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

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
    private final AuditLoggingHelper auditLoggingHelper;
    private final ObjectMapper objectMapper;

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
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequestDto authRequest) {
        try {
            // Find user by email
            User user = userRepository.findByEmail(authRequest.getEmail())
                    .orElseThrow(() -> new RuntimeException("Invalid email or password"));

            // Validate password
            if (!passwordEncoder.matches(authRequest.getPassword(), user.getPasswordHash())) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Invalid email or password");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }

            // Check if user is enabled
            if (!user.isEnabled()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Account is disabled");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
            }

            // Generate JWT token
            String token = jwtUtil.generateToken(user);

            AuthResponseDto response = AuthResponseDto.builder()
                    .token(token)
                    .expiresAt(jwtUtil.getExpirationInstant(token))
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .build();

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Login failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
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
}

