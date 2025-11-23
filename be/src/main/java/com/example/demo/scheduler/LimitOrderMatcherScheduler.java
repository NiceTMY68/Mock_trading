package com.example.demo.scheduler;

import com.example.demo.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class LimitOrderMatcherScheduler {
    
    private final OrderService orderService;
    
    @Scheduled(fixedDelayString = "${app.limit.matcher.delay:5000}")
    @SchedulerLock(name = "limitOrderMatcher", lockAtMostFor = "PT30S", lockAtLeastFor = "PT5S")
    public void processPendingLimitOrders() {
        try {
            orderService.processPendingLimitOrders();
        } catch (Exception e) {
            log.error("Error in limit order matcher scheduler: {}", e.getMessage(), e);
        }
    }
}
