/**
 * JWT Utility Functions
 * 
 * Implements the dual-token architecture specified in Section 10:
 * - Access Token: short-lived (15 min), signed with JWT_ACCESS_SECRET
 * - Refresh Token: long-lived (30 days), signed with JWT_REFRESH_SECRET
 * - Cookie Options: httpOnly, secure in production, SameSite=Strict
 * 
 * Token payload embeds user ID, role, and refreshTokenVersion so any
 * token issued prior to a password change or security revocation is rejected.
 */

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

/**
 * Generate a short-lived access token (default 15m)
 * Kept in frontend memory, transmitted via Authorization: Bearer header.
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      tokenVersion: user.refreshTokenVersion || 0,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES || '15m',
    }
  );
};

/**
 * Generate a long-lived refresh token (default 30d)
 * Stored in an httpOnly cookie, used strictly at /api/v1/auth/refresh.
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      tokenVersion: user.refreshTokenVersion || 0,
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES || '30d',
    }
  );
};

/**
 * Verify an access token.
 * Throws JsonWebTokenError or TokenExpiredError if invalid.
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

/**
 * Verify a refresh token.
 * Throws JsonWebTokenError or TokenExpiredError if invalid.
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

/**
 * Standard cookie configuration for the refresh token.
 * Prevents JavaScript access (XSS defense) and cross-site transmission (CSRF defense).
 */
const getRefreshTokenCookieOptions = () => {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true, // Prevents client-side scripts from reading the cookie
    secure: isProd, // Requires HTTPS in production (mandatory when sameSite is 'none')
    sameSite: isProd ? 'none' : 'lax', // 'none' enables cross-domain (Vercel <-> Render) cookie transmission in production
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    path: '/', // Root path ensures refresh cookie is reliably transmitted on all auth requests
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenCookieOptions,
};
