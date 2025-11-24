package com.example.demo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.concurrent.TimeUnit;

/**
 * Service for tracking login attempts and preventing brute force attacks
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoginAttemptService {

    private final StringRedisTemplate redisTemplate;

    @Value("${auth.login.max-attempts:5}")
    private int maxAttempts;

    @Value("${auth.login.lock-duration-minutes:15}")
    private int lockDurationMinutes;

    private static final String FAILED_ATTEMPTS_KEY_PREFIX = "login:failed:email:";
    private static final String FAILED_ATTEMPTS_IP_KEY_PREFIX = "login:failed:ip:";
    private static final String LOCKED_KEY_PREFIX = "login:locked:email:";
    private static final String LOCKED_IP_KEY_PREFIX = "login:locked:ip:";

    /**
     * Register a failed login attempt for email and IP
     */
    public void registerFailed(String email, String ipAddress) {
        if (email != null && !email.isEmpty()) {
            registerFailedByEmail(email);
        }
        if (ipAddress != null && !ipAddress.isEmpty()) {
            registerFailedByIp(ipAddress);
        }
    }

    /**
     * Register a failed login attempt by email
     */
    private void registerFailedByEmail(String email) {
        String key = FAILED_ATTEMPTS_KEY_PREFIX + email;
        String attemptsStr = redisTemplate.opsForValue().get(key);
        
        int attempts = 0;
        if (attemptsStr != null && !attemptsStr.isEmpty()) {
            try {
                attempts = Integer.parseInt(attemptsStr);
            } catch (NumberFormatException e) {
                log.warn("Invalid attempts value for email {}: {}", email, attemptsStr);
            }
        }
        attempts++;
        
        // Store attempts with expiry (lock duration)
        redisTemplate.opsForValue().set(key, String.valueOf(attempts), 
                lockDurationMinutes, TimeUnit.MINUTES);
        
        log.warn("Failed login attempt for email {}: {}/{}", email, attempts, maxAttempts);
        
        // If max attempts reached, lock the account
        if (attempts >= maxAttempts) {
            lockAccountByEmail(email);
        }
    }

    /**
     * Register a failed login attempt by IP
     */
    private void registerFailedByIp(String ipAddress) {
        String key = FAILED_ATTEMPTS_IP_KEY_PREFIX + ipAddress;
        String attemptsStr = redisTemplate.opsForValue().get(key);
        
        int attempts = 0;
        if (attemptsStr != null && !attemptsStr.isEmpty()) {
            try {
                attempts = Integer.parseInt(attemptsStr);
            } catch (NumberFormatException e) {
                log.warn("Invalid attempts value for IP {}: {}", ipAddress, attemptsStr);
            }
        }
        attempts++;
        
        // Store attempts with expiry (lock duration)
        redisTemplate.opsForValue().set(key, String.valueOf(attempts), 
                lockDurationMinutes, TimeUnit.MINUTES);
        
        log.warn("Failed login attempt from IP {}: {}/{}", ipAddress, attempts, maxAttempts);
        
        // If max attempts reached, lock the IP
        if (attempts >= maxAttempts) {
            lockAccountByIp(ipAddress);
        }
    }

    /**
     * Lock account by email
     */
    private void lockAccountByEmail(String email) {
        String lockKey = LOCKED_KEY_PREFIX + email;
        redisTemplate.opsForValue().set(lockKey, "locked", 
                lockDurationMinutes, TimeUnit.MINUTES);
        log.error("Account locked for email {} due to {} failed login attempts", email, maxAttempts);
    }

    /**
     * Lock account by IP
     */
    private void lockAccountByIp(String ipAddress) {
        String lockKey = LOCKED_IP_KEY_PREFIX + ipAddress;
        redisTemplate.opsForValue().set(lockKey, "locked", 
                lockDurationMinutes, TimeUnit.MINUTES);
        log.error("IP {} locked due to {} failed login attempts", ipAddress, maxAttempts);
    }

    /**
     * Check if account is locked by email
     */
    public boolean isLockedByEmail(String email) {
        if (email == null || email.isEmpty()) {
            return false;
        }
        String lockKey = LOCKED_KEY_PREFIX + email;
        String locked = redisTemplate.opsForValue().get(lockKey);
        return locked != null && "locked".equals(locked);
    }

    /**
     * Check if account is locked by IP
     */
    public boolean isLockedByIp(String ipAddress) {
        if (ipAddress == null || ipAddress.isEmpty()) {
            return false;
        }
        String lockKey = LOCKED_IP_KEY_PREFIX + ipAddress;
        String locked = redisTemplate.opsForValue().get(lockKey);
        return locked != null && "locked".equals(locked);
    }

    /**
     * Check if account is locked (by email or IP)
     */
    public void checkLocked(String email, String ipAddress) {
        if (isLockedByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.LOCKED, 
                    "Account locked due to too many failed login attempts. Please try again after " + 
                    lockDurationMinutes + " minutes.");
        }
        if (isLockedByIp(ipAddress)) {
            throw new ResponseStatusException(HttpStatus.LOCKED, 
                    "IP address locked due to too many failed login attempts. Please try again after " + 
                    lockDurationMinutes + " minutes.");
        }
    }

    /**
     * Reset failed attempts on successful login
     */
    public void resetOnSuccess(String email, String ipAddress) {
        if (email != null && !email.isEmpty()) {
            String key = FAILED_ATTEMPTS_KEY_PREFIX + email;
            redisTemplate.delete(key);
            String lockKey = LOCKED_KEY_PREFIX + email;
            redisTemplate.delete(lockKey);
            log.debug("Reset failed login attempts for email {}", email);
        }
        if (ipAddress != null && !ipAddress.isEmpty()) {
            String key = FAILED_ATTEMPTS_IP_KEY_PREFIX + ipAddress;
            redisTemplate.delete(key);
            String lockKey = LOCKED_IP_KEY_PREFIX + ipAddress;
            redisTemplate.delete(lockKey);
            log.debug("Reset failed login attempts for IP {}", ipAddress);
        }
    }

    /**
     * Get remaining attempts for email
     */
    public int getRemainingAttemptsByEmail(String email) {
        if (email == null || email.isEmpty()) {
            return maxAttempts;
        }
        String key = FAILED_ATTEMPTS_KEY_PREFIX + email;
        String attemptsStr = redisTemplate.opsForValue().get(key);
        int attempts = 0;
        if (attemptsStr != null && !attemptsStr.isEmpty()) {
            try {
                attempts = Integer.parseInt(attemptsStr);
            } catch (NumberFormatException e) {
                log.warn("Invalid attempts value for email {}: {}", email, attemptsStr);
            }
        }
        return Math.max(0, maxAttempts - attempts);
    }

    /**
     * Get remaining attempts for IP
     */
    public int getRemainingAttemptsByIp(String ipAddress) {
        if (ipAddress == null || ipAddress.isEmpty()) {
            return maxAttempts;
        }
        String key = FAILED_ATTEMPTS_IP_KEY_PREFIX + ipAddress;
        String attemptsStr = redisTemplate.opsForValue().get(key);
        int attempts = 0;
        if (attemptsStr != null && !attemptsStr.isEmpty()) {
            try {
                attempts = Integer.parseInt(attemptsStr);
            } catch (NumberFormatException e) {
                log.warn("Invalid attempts value for IP {}: {}", ipAddress, attemptsStr);
            }
        }
        return Math.max(0, maxAttempts - attempts);
    }
}

