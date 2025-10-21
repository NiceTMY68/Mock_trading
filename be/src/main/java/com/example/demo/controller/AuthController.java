package com.example.demo.controller;

import com.example.demo.dto.AuthResponseDto;
import com.example.demo.dto.LoginDto;
import com.example.demo.dto.RegisterDto;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

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
                    .build();

            userRepository.save(user);

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

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginDto loginDto) {
        try {
            // Find user by email
            User user = userRepository.findByEmail(loginDto.getEmail())
                    .orElseThrow(() -> new RuntimeException("Invalid email or password"));

            // Validate password
            if (!passwordEncoder.matches(loginDto.getPassword(), user.getPasswordHash())) {
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
}

