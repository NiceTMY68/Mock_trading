/**
 * JWT Configuration
 * Centralized JWT settings to ensure consistency across the application
 */

export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// Token expires in 24 hours for development, use shorter time in production
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

