package com.example.demo.config;

import com.example.demo.entity.Alert;
import com.example.demo.entity.PriceSnapshot;
import com.example.demo.entity.Subscription;
import com.example.demo.entity.User;
import com.example.demo.entity.Watchlist;
import com.example.demo.entity.WatchlistItem;
import com.example.demo.repository.AlertRepository;
import com.example.demo.repository.PriceSnapshotRepository;
import com.example.demo.repository.SubscriptionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.WatchlistItemRepository;
import com.example.demo.repository.WatchlistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Slf4j
@Profile("dev")
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PriceSnapshotRepository priceSnapshotRepository;
    private final WatchlistRepository watchlistRepository;
    private final WatchlistItemRepository watchlistItemRepository;
    private final AlertRepository alertRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("DataSeeder: existing data detected, skipping seed");
            return;
        }

        Instant now = Instant.now();
        createUser("demo@mocktrading.dev", "Demo Trader", "USER", "DemoPass123!", now);
        User proUser = createUser("pro@mocktrading.dev", "Pro Trader", "PRO", "ProPass123!", now);

        subscriptionRepository.save(Subscription.builder()
                .userId(proUser.getId())
                .planId("pro")
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .currentPeriodEnd(now.plusSeconds(30L * 24 * 3600))
                .createdAt(now)
                .build());

        seedSnapshots(now);
        seedWatchlist(proUser, now);

        alertRepository.save(Alert.builder()
                .userId(proUser.getId())
                .symbol("BTCUSDT")
                .direction(Alert.Direction.ABOVE)
                .threshold(new BigDecimal("55000"))
                .active(true)
                .createdAt(now)
                .build());

        log.info("Seeded demo users and sample market data");
    }

    private User createUser(String email, String fullName, String role, String rawPassword, Instant createdAt) {
        return userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .fullName(fullName)
                .role(role)
                .enabled(true)
                .createdAt(createdAt)
                .build());
    }

    private void seedSnapshots(Instant referenceTime) {
        List<PriceSnapshot> snapshots = List.of(
                buildSnapshot("BTCUSDT", referenceTime.minusSeconds(300), "52000", "52300", "51850", "52150"),
                buildSnapshot("ETHUSDT", referenceTime.minusSeconds(240), "3100", "3150", "3080", "3125"),
                buildSnapshot("SOLUSDT", referenceTime.minusSeconds(180), "145", "148", "143", "146.5")
        );
        priceSnapshotRepository.saveAll(snapshots);
    }

    private PriceSnapshot buildSnapshot(String symbol, Instant timestamp,
                                        String open, String high, String low, String close) {
        return PriceSnapshot.builder()
                .coinSymbol(symbol)
                .timestamp(timestamp)
                .open(new BigDecimal(open))
                .high(new BigDecimal(high))
                .low(new BigDecimal(low))
                .close(new BigDecimal(close))
                .volume(new BigDecimal("100"))
                .rawMeta(null)
                .build();
    }

    private void seedWatchlist(User proUser, Instant now) {
        Watchlist watchlist = watchlistRepository.save(Watchlist.builder()
                .userId(proUser.getId())
                .createdAt(now)
                .updatedAt(now)
                .build());

        watchlistItemRepository.saveAll(List.of(
                WatchlistItem.builder().watchlistId(watchlist.getId()).symbol("BTCUSDT").createdAt(now).build(),
                WatchlistItem.builder().watchlistId(watchlist.getId()).symbol("ETHUSDT").createdAt(now).build(),
                WatchlistItem.builder().watchlistId(watchlist.getId()).symbol("SOLUSDT").createdAt(now).build()
        ));
    }
}


