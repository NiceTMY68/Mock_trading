package com.example.demo.config;

import com.example.demo.filter.JwtAuthenticationFilter;
import com.example.demo.web.IdempotencyFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.lang.NonNull;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CommonsRequestLoggingFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private IdempotencyFilter idempotencyFilter;

    @Value("${security.allowed-origins:https://localhost:3000}")
    private String allowedOrigins;

    @Value("${security.require-ssl:true}")
    private boolean requireSsl;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers("/api/**", "/ws/**"))
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**", "/ws/**", "/api/webhooks/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .anyRequest().authenticated())
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'"))
                .referrerPolicy(policy -> policy.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                .frameOptions(frame -> frame.sameOrigin()))
            .requestCache(requestCache -> requestCache.disable())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(idempotencyFilter, JwtAuthenticationFilter.class);

        if (requireSsl) {
            http.addFilterBefore(httpsEnforcementFilter(), UsernamePasswordAuthenticationFilter.class);
        }

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(parseAllowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-CSRF-TOKEN", "Idempotency-Key"));
        configuration.setExposedHeaders(List.of("Location", "X-Idempotency-Replayed"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public CommonsRequestLoggingFilter requestLoggingFilter() {
        CommonsRequestLoggingFilter filter = new CommonsRequestLoggingFilter();
        filter.setIncludeHeaders(false);
        filter.setIncludePayload(false);
        filter.setIncludeQueryString(true);
        filter.setIncludeClientInfo(false);
        filter.setBeforeMessagePrefix("Incoming request: ");
        return filter;
    }

    @Bean
    public OncePerRequestFilter httpsEnforcementFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(@NonNull HttpServletRequest request,
                                            @NonNull HttpServletResponse response,
                                            @NonNull FilterChain filterChain)
                    throws ServletException, IOException {
                if (requireSsl && !request.isSecure()) {
                    String redirectUrl = buildHttpsRedirectUrl(request);
                    response.setStatus(HttpServletResponse.SC_MOVED_PERMANENTLY);
                    response.setHeader("Location", redirectUrl);
                    return;
                }
                filterChain.doFilter(request, response);
            }
        };
    }

    private String buildHttpsRedirectUrl(HttpServletRequest request) {
        StringBuilder url = new StringBuilder("https://").append(request.getServerName());
        if (request.getServerPort() != 80 && request.getServerPort() != 443) {
            url.append(":").append(request.getServerPort());
        }
        url.append(request.getRequestURI());
        if (request.getQueryString() != null) {
            url.append("?").append(request.getQueryString());
        }
        return url.toString();
    }

    private List<String> parseAllowedOrigins() {
        return Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
    }
}

