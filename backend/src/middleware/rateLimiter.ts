/**
 * Rate limiting middleware
 */

import rateLimit from 'express-rate-limit';
import { HTTP_STATUS } from '@agenda-manager/shared';

export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS
});

export const schedulerRateLimiter = rateLimit({
  windowMs: 900000, // 15 minutes
  max: 10, // More restrictive for expensive operations
  message: {
    success: false,
    error: 'Too many scheduler requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS
});

export const genAIRateLimiter = rateLimit({
  windowMs: 900000, // 15 minutes
  max: 20,
  message: {
    success: false,
    error: 'Too many GenAI requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS
});
