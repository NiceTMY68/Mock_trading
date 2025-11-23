package com.example.demo.web;

import com.example.demo.entity.IdempotencyKey;
import com.example.demo.service.IdempotencyService;
import com.example.demo.util.ControllerHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class IdempotencyFilter extends OncePerRequestFilter {

    private final IdempotencyService idempotencyService;
    private final ControllerHelper controllerHelper;
    private final ObjectMapper objectMapper;

    private static final String IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String idempotencyKey = request.getHeader(IDEMPOTENCY_KEY_HEADER);

        if (idempotencyKey == null || idempotencyKey.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        String endpoint = request.getRequestURI();
        UUID userId = controllerHelper.getCurrentUserId();

        Optional<IdempotencyKey> existingKey = idempotencyService.findByIdempotencyKey(idempotencyKey);

        if (existingKey.isPresent()) {
            IdempotencyKey key = existingKey.get();

            if (key.getResponseBody() != null && key.getStatusCode() != null) {
                log.info("Returning cached response for idempotency key: {}", idempotencyKey);

                response.setStatus(key.getStatusCode());
                response.setContentType("application/json");
                response.setHeader("X-Idempotency-Replayed", "true");

                String responseBody = objectMapper.writeValueAsString(key.getResponseBody());
                response.getWriter().write(responseBody);
                response.getWriter().flush();

                return;
            }
        }

        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(response);

        try {
            filterChain.doFilter(request, responseWrapper);

            int statusCode = responseWrapper.getStatus();

            if (statusCode >= 200 && statusCode < 300) {
                byte[] responseBodyBytes = responseWrapper.getContentAsByteArray();
                String responseBodyStr = new String(responseBodyBytes, StandardCharsets.UTF_8);

                if (!responseBodyStr.isEmpty()) {
                    try {
                        com.fasterxml.jackson.databind.JsonNode responseBody =
                                objectMapper.readTree(responseBodyStr);

                        idempotencyService.saveResponse(idempotencyKey, userId, endpoint,
                                responseBody, statusCode);

                        log.debug("Saved idempotency response for key: {}", idempotencyKey);
                    } catch (Exception e) {
                        log.warn("Failed to save idempotency response for key {}: {}",
                                idempotencyKey, e.getMessage());
                    }
                }
            }

            responseWrapper.copyBodyToResponse();

        } catch (Exception e) {
            log.error("Error in idempotency filter: {}", e.getMessage(), e);
            responseWrapper.copyBodyToResponse();
        }
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/auth/") || 
               path.startsWith("/ws/") ||
               !request.getMethod().equals("POST");
    }
}

