import { logger } from '../utils/logger.js';

// Must match the secret used in authController.js
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Role-based access control middleware
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.user.role || 'anonymous';

    if (!allowedRoles.includes(userRole)) {
      logger.warn(`Access denied for user ${req.user.userId} with role ${userRole}`);
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Require user or admin role
 */
export const requireUser = requireRole('user', 'admin');

/**
 * Optional auth - adds user to req if token is valid, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.default.verify(token, JWT_SECRET);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};

