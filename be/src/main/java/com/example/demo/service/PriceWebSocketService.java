package com.example.demo.service;

import com.example.demo.config.RateLimiterConfig;
import com.example.demo.dto.KlinePointDto;
import com.example.demo.entity.PriceSnapshot;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.JwtUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PriceWebSocketService {

    private final ObjectMapper objectMapper;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final FeatureFlagService featureFlagService;
    private final StringRedisTemplate rateLimiterRedisTemplate;
    private final Map<String, RateLimiterConfig.RateLimitRule> rateLimitRules;

    private static final String RATE_LIMIT_KEY_PREFIX = "ws:subs:";

    private final Map<String, SessionContext> sessions = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> symbolSubscriptions = new ConcurrentHashMap<>();

    public void registerSession(WebSocketSession session) throws IOException {
        Optional<User> userOptional = authenticate(session);
        if (userOptional.isEmpty()) {
            sendAndClose(session, CloseStatus.NOT_ACCEPTABLE.withReason("INVALID_TOKEN"),
                    "authentication_failed", "Invalid or missing token");
            return;
        }

        User user = userOptional.get();
        if (!featureFlagService.isStreamingEnabled(user.getId())) {
            sendAndClose(session, CloseStatus.NOT_ACCEPTABLE.withReason("STREAMING_NOT_ALLOWED"),
                    "authorization_failed", "Streaming not enabled for this account");
            return;
        }

        boolean premium = featureFlagService.hasPremiumSubscription(user.getId());
        SessionContext context = new SessionContext(session, user.getId(), user.getEmail(), premium);
        sessions.put(session.getId(), context);

        sendMessage(session, buildEvent("connected")
                .put("streamingEnabled", true)
                .put("premium", premium)
                .put("timestamp", Instant.now().toString()));

        log.info("WebSocket session established for user {} ({})", user.getEmail(), session.getId());
    }

    public void removeSession(WebSocketSession session) {
        SessionContext context = sessions.remove(session.getId());
        if (context == null) {
            return;
        }
        context.getSymbols().forEach(symbol -> symbolSubscriptions.computeIfPresent(symbol, (key, subscribers) -> {
            subscribers.remove(session.getId());
            return subscribers.isEmpty() ? null : subscribers;
        }));
        log.info("WebSocket session {} closed for user {}", session.getId(), context.getEmail());
    }

    public void handleMessage(WebSocketSession session, String payload) throws IOException {
        SessionContext context = sessions.get(session.getId());
        if (context == null) {
            sendAndClose(session, CloseStatus.NOT_ACCEPTABLE.withReason("SESSION_NOT_INITIALIZED"),
                    "session_error", "Session not initialized");
            return;
        }

        JsonNode node;
        try {
            node = objectMapper.readTree(payload);
        } catch (Exception ex) {
            sendError(session, "invalid_payload", "Payload must be valid JSON");
            return;
        }

        String action = node.path("action").asText("");
        switch (action.toLowerCase()) {
            case "subscribe" -> handleSubscribe(context, extractSymbols(node));
            case "unsubscribe" -> handleUnsubscribe(context, extractSymbols(node));
            case "ping" -> sendMessage(session, buildEvent("pong").put("timestamp", Instant.now().toString()));
            default -> sendError(session, "unknown_action", "Unsupported action: " + action);
        }
    }

    public void publishSnapshots(String symbol, List<PriceSnapshot> snapshots) {
        if (snapshots == null || snapshots.isEmpty()) {
            return;
        }
        publishSnapshot(snapshots.get(snapshots.size() - 1));
    }

    public void subscribe(WebSocketSession session, UUID userId, List<String> symbols) throws IOException {
        SessionContext context = sessions.get(session.getId());
        if (context == null || !context.userId.equals(userId)) {
            throw new IllegalStateException("Session not found or user mismatch");
        }
        handleSubscribe(context, symbols);
    }

    public void unsubscribe(WebSocketSession session, UUID userId, List<String> symbols) throws IOException {
        SessionContext context = sessions.get(session.getId());
        if (context == null || !context.userId.equals(userId)) {
            throw new IllegalStateException("Session not found or user mismatch");
        }
        handleUnsubscribe(context, symbols);
    }

    public void publishPrice(String symbol, KlinePointDto snapshot) {
        if (snapshot == null || symbol == null) {
            return;
        }
        String normalizedSymbol = symbol.toUpperCase();
        Set<String> subscribers = symbolSubscriptions.get(normalizedSymbol);
        if (subscribers == null || subscribers.isEmpty()) {
            return;
        }

        ObjectNode payload = buildEvent("price")
                .put("symbol", normalizedSymbol)
                .put("timestamp", snapshot.getTimestamp() != null ? snapshot.getTimestamp().toString() : Instant.now().toString());

        if (snapshot.getOpen() != null) {
            payload.put("open", snapshot.getOpen());
        }
        if (snapshot.getHigh() != null) {
            payload.put("high", snapshot.getHigh());
        }
        if (snapshot.getLow() != null) {
            payload.put("low", snapshot.getLow());
        }
        if (snapshot.getClose() != null) {
            payload.put("close", snapshot.getClose());
        }
        if (snapshot.getVolume() != null) {
            payload.put("volume", snapshot.getVolume());
        }

        broadcast(normalizedSymbol, subscribers, payload);
    }

    public void publishSnapshot(PriceSnapshot snapshot) {
        if (snapshot == null) {
            return;
        }
        String symbol = snapshot.getCoinSymbol().toUpperCase();
        Set<String> subscribers = symbolSubscriptions.get(symbol);
        if (subscribers == null || subscribers.isEmpty()) {
            return;
        }

        ObjectNode payload = buildEvent("price")
                .put("symbol", symbol)
                .put("timestamp", snapshot.getTimestamp().toString());

        if (snapshot.getOpen() != null) {
            payload.put("open", snapshot.getOpen());
        }
        if (snapshot.getHigh() != null) {
            payload.put("high", snapshot.getHigh());
        }
        if (snapshot.getLow() != null) {
            payload.put("low", snapshot.getLow());
        }
        if (snapshot.getClose() != null) {
            payload.put("close", snapshot.getClose());
        }
        if (snapshot.getVolume() != null) {
            payload.put("volume", snapshot.getVolume());
        }

        broadcast(symbol, subscribers, payload);
    }

    private void handleSubscribe(SessionContext context, List<String> symbols) throws IOException {
        if (symbols.isEmpty()) {
            sendError(context.getSession(), "invalid_request", "symbols list cannot be empty");
            return;
        }

        if (!checkRateLimit(context.userRateKey(), context.isPremium())) {
            sendError(context.getSession(), "rate_limited", "Too many subscription changes");
            return;
        }

        int maxSymbols = context.isPremium() ? 25 : 5;
        int availableSlots = maxSymbols - context.getSymbols().size();
        if (availableSlots <= 0) {
            sendError(context.getSession(), "limit_reached",
                    "Subscription limit reached for current plan");
            return;
        }

        List<String> normalized = symbols.stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(String::toUpperCase)
                .distinct()
                .collect(Collectors.toList());

        List<String> accepted = new ArrayList<>();
        for (String symbol : normalized) {
            if (context.getSymbols().contains(symbol)) {
                continue;
            }
            if (accepted.size() >= availableSlots) {
                break;
            }
            context.getSymbols().add(symbol);
            symbolSubscriptions.computeIfAbsent(symbol, key -> ConcurrentHashMap.newKeySet())
                    .add(context.getSession().getId());
            accepted.add(symbol);
        }

        if (accepted.isEmpty()) {
            sendError(context.getSession(), "limit_reached",
                    "Unable to add more subscriptions for current plan");
            return;
        }

        sendMessage(context.getSession(), buildEvent("subscribed")
                .putPOJO("symbols", accepted));
        log.debug("User {} subscribed to {}", context.getEmail(), accepted);
    }

    private void handleUnsubscribe(SessionContext context, List<String> symbols) throws IOException {
        if (symbols.isEmpty()) {
            sendError(context.getSession(), "invalid_request", "symbols list cannot be empty");
            return;
        }

        List<String> normalized = symbols.stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(String::toUpperCase)
                .distinct()
                .collect(Collectors.toList());

        List<String> removed = new ArrayList<>();
        for (String symbol : normalized) {
            if (context.getSymbols().remove(symbol)) {
                symbolSubscriptions.computeIfPresent(symbol, (key, subscribers) -> {
                    subscribers.remove(context.getSession().getId());
                    return subscribers.isEmpty() ? null : subscribers;
                });
                removed.add(symbol);
            }
        }

        if (removed.isEmpty()) {
            sendError(context.getSession(), "not_subscribed", "No matching subscriptions found");
            return;
        }

        sendMessage(context.getSession(), buildEvent("unsubscribed").putPOJO("symbols", removed));
        log.debug("User {} unsubscribed from {}", context.getEmail(), removed);
    }

    private void broadcast(String symbol, Set<String> subscribers, ObjectNode payload) {
        List<String> staleSessions = new ArrayList<>();
        subscribers.forEach(sessionId -> {
            SessionContext context = sessions.get(sessionId);
            if (context == null) {
                staleSessions.add(sessionId);
                return;
            }
            try {
                sendMessage(context.getSession(), payload);
            } catch (IOException ex) {
                log.warn("Failed to deliver price update to {}: {}", context.getEmail(), ex.getMessage());
            }
        });

        if (!staleSessions.isEmpty()) {
            subscribers.removeAll(staleSessions);
        }
    }

    private Optional<User> authenticate(WebSocketSession session) {
        try {
            String token = extractToken(session);
            if (token == null || !jwtUtil.validateToken(token)) {
                return Optional.empty();
            }
            String email = jwtUtil.getUsername(token);
            return userRepository.findByEmail(email);
        } catch (Exception ex) {
            log.warn("Failed to authenticate websocket session: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private String extractToken(WebSocketSession session) {
        List<String> authHeaders = session.getHandshakeHeaders().get("Authorization");
        if (authHeaders != null) {
            return authHeaders.stream()
                    .filter(value -> value.startsWith("Bearer "))
                    .map(value -> value.substring(7))
                    .findFirst()
                    .orElse(null);
        }

        java.net.URI uri = session.getUri();
        if (uri != null && uri.getQuery() != null) {
            String[] params = uri.getQuery().split("&");
            for (String param : params) {
                String[] parts = param.split("=");
                if (parts.length == 2 && "token".equalsIgnoreCase(parts[0])) {
                    return parts[1];
                }
            }
        }
        return null;
    }

    private List<String> extractSymbols(JsonNode node) {
        if (!node.has("symbols") || !node.get("symbols").isArray()) {
            return Collections.emptyList();
        }
        List<String> symbols = new ArrayList<>();
        node.get("symbols").forEach(value -> symbols.add(value.asText("")));
        return symbols;
    }

    private boolean checkRateLimit(String userKey, boolean premium) {
        try {
            RateLimiterConfig.RateLimitRule rule = rateLimitRules.getOrDefault(
                    premium ? "PRO" : "USER",
                    rateLimitRules.getOrDefault("ANONYMOUS", null));

            if (rule == null) {
                return true;
            }

            String tokensKey = RATE_LIMIT_KEY_PREFIX + userKey + ":tokens";
            String lastRefillKey = RATE_LIMIT_KEY_PREFIX + userKey + ":last_refill";
            long now = System.currentTimeMillis();

            String tokensStr = rateLimiterRedisTemplate.opsForValue().get(tokensKey);
            String lastRefillStr = rateLimiterRedisTemplate.opsForValue().get(lastRefillKey);

            double currentTokens = tokensStr == null ? rule.getBucketSize() : Double.parseDouble(tokensStr);
            long lastRefillTime = lastRefillStr == null ? now : Long.parseLong(lastRefillStr);

            double secondsElapsed = (now - lastRefillTime) / 1000.0;
            double tokensToAdd = secondsElapsed * rule.getRefillRate();
            currentTokens = Math.min(currentTokens + tokensToAdd, rule.getBucketSize());

            if (currentTokens >= 1.0) {
                currentTokens -= 1.0;
                rateLimiterRedisTemplate.opsForValue().set(tokensKey, String.valueOf(currentTokens), 2, TimeUnit.MINUTES);
                rateLimiterRedisTemplate.opsForValue().set(lastRefillKey, String.valueOf(now), 2, TimeUnit.MINUTES);
                return true;
            }

            rateLimiterRedisTemplate.opsForValue().set(tokensKey, String.valueOf(currentTokens), 2, TimeUnit.MINUTES);
            rateLimiterRedisTemplate.opsForValue().set(lastRefillKey, String.valueOf(now), 2, TimeUnit.MINUTES);
            return false;
        } catch (Exception ex) {
            log.warn("Rate limit check failed for {}: {}", userKey, ex.getMessage());
            return true;
        }
    }

    private void sendMessage(WebSocketSession session, ObjectNode payload) throws IOException {
        if (!session.isOpen()) {
            return;
        }
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
    }

    private void sendError(WebSocketSession session, String code, String message) throws IOException {
        sendMessage(session, buildEvent("error").put("code", code).put("message", message));
    }

    private void sendAndClose(WebSocketSession session, CloseStatus status, String code, String message) throws IOException {
        sendError(session, code, message);
        session.close(status);
    }

    private ObjectNode buildEvent(String type) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("type", type);
        node.put("sentAt", Instant.now().toString());
        return node;
    }

    private record SessionContext(WebSocketSession session,
                                  UUID userId,
                                  String email,
                                  boolean premium,
                                  Set<String> symbols) {

        SessionContext(WebSocketSession session, UUID userId, String email, boolean premium) {
            this(session, userId, email, premium, new CopyOnWriteArraySet<>());
        }

        WebSocketSession getSession() {
            return session;
        }

        String getEmail() {
            return email;
        }

        boolean isPremium() {
            return premium;
        }

        Set<String> getSymbols() {
            return symbols;
        }

        String userRateKey() {
            return userId.toString();
        }
    }
}
