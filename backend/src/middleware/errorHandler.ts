/**
 * Global error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { HTTP_STATUS, ERROR_CODES } from '@agenda-manager/shared';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export class ValidationError extends Error implements AppError {
  statusCode = HTTP_STATUS.BAD_REQUEST;
  code = ERROR_CODES.VALIDATION_ERROR;
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = HTTP_STATUS.NOT_FOUND;
  code = ERROR_CODES.NOT_FOUND;
  isOperational = true;
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class AuthenticationError extends Error implements AppError {
  statusCode = HTTP_STATUS.UNAUTHORIZED;
  code = ERROR_CODES.AUTHENTICATION_ERROR;
  isOperational = true;
  
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  statusCode = HTTP_STATUS.FORBIDDEN;
  code = ERROR_CODES.AUTHORIZATION_ERROR;
  isOperational = true;
  
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const code = error.code || ERROR_CODES.INTERNAL_ERROR;
  
  // Log error
  if (statusCode >= 500) {
    logger.error('Internal server error:', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method
    });
  } else {
    logger.warn('Client error:', {
      error: error.message,
      path: req.path,
      method: req.method,
      statusCode
    });
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    error: error.message,
    code,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
