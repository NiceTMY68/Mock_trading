package com.example.demo.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Component;

import java.util.function.Supplier;

@Slf4j
@Component
public class OptimisticLockRetry {
    
    private static final int MAX_RETRIES = 3;
    private static final long BACKOFF_DELAY_MS = 50;
    
    /**
     * Executes a supplier function with retry logic for OptimisticLockingFailureException and DataIntegrityViolationException.
     * Retries up to MAX_RETRIES times with exponential backoff.
     * 
     * @param operation The operation to execute
     * @param operationName Name of the operation for logging
     * @return Result of the operation
     * @throws OptimisticLockingFailureException if all retries fail
     * @throws DataIntegrityViolationException if all retries fail
     */
    public <T> T executeWithRetry(Supplier<T> operation, String operationName) {
        int attempt = 0;
        RuntimeException lastException = null;
        
        while (attempt < MAX_RETRIES) {
            try {
                return operation.get();
            } catch (OptimisticLockingFailureException | DataIntegrityViolationException e) {
                lastException = e instanceof RuntimeException ? (RuntimeException) e : new RuntimeException(e);
                attempt++;
                
                if (attempt < MAX_RETRIES) {
                    long delay = BACKOFF_DELAY_MS * (1L << (attempt - 1)); // Exponential backoff
                    log.warn("Concurrent update exception on {} (attempt {}/{}), retrying after {}ms: {}", 
                            operationName, attempt, MAX_RETRIES, delay, e.getClass().getSimpleName());
                    try {
                        Thread.sleep(delay);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Retry interrupted", ie);
                    }
                } else {
                    log.error("Concurrent update exception on {} after {} attempts, giving up: {}", 
                            operationName, MAX_RETRIES, e.getClass().getSimpleName());
                }
            }
        }
        
        throw lastException != null ? lastException : 
                new OptimisticLockingFailureException("Failed after " + MAX_RETRIES + " retries");
    }
    
    /**
     * Executes a runnable operation with retry logic for OptimisticLockingFailureException.
     */
    public void executeWithRetry(Runnable operation, String operationName) {
        executeWithRetry(() -> {
            operation.run();
            return null;
        }, operationName);
    }
}
