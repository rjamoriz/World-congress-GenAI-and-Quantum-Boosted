/**
 * Request Timeout Middleware
 * 
 * Adds configurable timeouts to prevent long-running requests from hanging.
 * Particularly important for:
 * - Quantum optimization (can take minutes)
 * - AI qualification (external API calls)
 * - Complex database queries
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface TimeoutOptions {
  /**
   * Timeout duration in milliseconds
   */
  timeout: number;
  
  /**
   * Custom error message
   */
  message?: string;
  
  /**
   * Whether to log timeout events
   */
  logTimeout?: boolean;
}

/**
 * Creates a timeout middleware with specified duration
 * 
 * @param options - Timeout configuration
 * @returns Express middleware
 * 
 * @example
 * router.post('/optimize', timeoutMiddleware({ timeout: 120000 }), handler);
 */
export const timeoutMiddleware = (options: TimeoutOptions) => {
  const { timeout, message, logTimeout = true } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Set socket timeout
    req.socket.setTimeout(timeout);
    
    // Set server response timeout
    res.setTimeout(timeout, () => {
      if (logTimeout) {
        logger.warn('Request timeout', {
          method: req.method,
          url: req.originalUrl,
          timeout,
          ip: req.ip,
          userAgent: req.get('user-agent')
        });
      }
      
      // Only send response if headers haven't been sent
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request Timeout',
          message: message || `Request exceeded ${timeout}ms timeout`,
          code: 'TIMEOUT',
          timestamp: new Date().toISOString()
        });
      }
    });
    
    next();
  };
};

/**
 * Pre-configured timeout middleware for common scenarios
 */
export const timeouts = {
  /**
   * Standard API timeout (30 seconds)
   * For regular CRUD operations
   */
  standard: timeoutMiddleware({
    timeout: 30000,
    message: 'Request timed out after 30 seconds'
  }),
  
  /**
   * Long timeout (2 minutes)
   * For complex queries or batch operations
   */
  long: timeoutMiddleware({
    timeout: 120000,
    message: 'Request timed out after 2 minutes'
  }),
  
  /**
   * Quantum optimization timeout (5 minutes)
   * For quantum scheduling operations
   */
  quantum: timeoutMiddleware({
    timeout: 300000,
    message: 'Quantum optimization timed out after 5 minutes. Try reducing the problem size or using classical algorithm.'
  }),
  
  /**
   * AI/External API timeout (60 seconds)
   * For OpenAI, Microsoft Graph, or other external service calls
   */
  ai: timeoutMiddleware({
    timeout: 60000,
    message: 'AI service request timed out after 60 seconds'
  }),
  
  /**
   * Short timeout (10 seconds)
   * For health checks and lightweight operations
   */
  short: timeoutMiddleware({
    timeout: 10000,
    message: 'Request timed out after 10 seconds'
  })
};

/**
 * Utility to check if request has timed out
 * Can be used in long-running operations to bail out early
 */
export const isTimedOut = (res: Response): boolean => {
  return res.headersSent || res.writableEnded;
};
