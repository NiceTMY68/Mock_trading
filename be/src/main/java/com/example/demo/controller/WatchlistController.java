package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.entity.WatchlistItem;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.WatchlistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/watchlist")
@RequiredArgsConstructor
public class WatchlistController {

    private final WatchlistService watchlistService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getWatchlist(Authentication authentication) {
        UUID userId = getCurrentUserId();
        List<WatchlistItem> items = watchlistService.getWatchlist(userId);
        return ResponseEntity.ok(items);
    }

    @PostMapping
    public ResponseEntity<?> add(@RequestBody Map<String, String> body, Authentication authentication) {
        UUID userId = getCurrentUserId();
        String symbol = body.get("symbol");
        watchlistService.addToWatchlist(userId, symbol);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @DeleteMapping("/{symbol}")
    public ResponseEntity<?> remove(@PathVariable String symbol, Authentication authentication) {
        UUID userId = getCurrentUserId();
        watchlistService.removeFromWatchlist(userId, symbol);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User user = userRepository.findByEmail(email).orElseThrow();
        return user.getId();
    }
}
