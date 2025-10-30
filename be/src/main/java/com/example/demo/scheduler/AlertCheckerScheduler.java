package com.example.demo.scheduler;

import com.example.demo.service.AlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AlertCheckerScheduler {

    private final AlertService alertService;

    @Scheduled(fixedDelayString = "${app.alert.checker.delay:60000}")
    public void processAlerts() {
        try {
            alertService.processActiveAlerts();
        } catch (Exception e) {
            log.error("Error running alert checker: {}", e.getMessage(), e);
        }
    }
}
