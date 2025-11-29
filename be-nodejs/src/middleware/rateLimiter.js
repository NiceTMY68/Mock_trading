import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Get user role from request (default: anonymous)
 */
const getUserRole = (req) => {
  return req.user?.role || 'anonymous';
};

/**
 * Role-based rate limiters
 */
const createRoleBasedLimiter = (defaultMax, limits) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req) => {
      const role = getUserRole(req);
      const limit = limits[role] || defaultMax;
      return isDevelopment ? limit * 10 : limit; // Higher limit in development
    },
    message: {
      success: false,
      error: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting entirely in development mode
      if (isDevelopment) return true;
      // Skip rate limiting for health checks and admin in production
      return req.path === '/health' || getUserRole(req) === 'admin';
    }
  });
};

// General API rate limiter (role-based)
export const apiLimiter = createRoleBasedLimiter(100, {
  anonymous: isDevelopment ? 50000 : 100,  // 50000 requests per 15 minutes in dev, 100 in prod
  user: isDevelopment ? 100000 : 1000,     // 100000 requests per 15 minutes in dev, 1000 in prod
  admin: Infinity  // Unlimited
});

// Auth endpoints rate limiter (stricter, same for all)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Blog/Post-specific rate limiter (role-based)
export const blogLimiter = createRoleBasedLimiter(10, {
  anonymous: 0,     // No posts for anonymous
  user: 10,         // 10 posts per hour
  admin: Infinity   // Unlimited
});

// WebSocket subscription limits per role
export const getWebSocketLimit = (role) => {
  const limits = {
    anonymous: 5,
    user: 25,
    admin: Infinity
  };
  return limits[role] || limits.anonymous;
};

