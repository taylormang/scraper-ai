import { Request, Response, NextFunction } from 'express';
import { ApiError, ApiResponse } from '../types/index.js';
import { config } from '../config/index.js';

/**
 * Global error handling middleware
 * Catches all errors and formats them consistently
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Default to 500 internal server error
  let statusCode = 500;
  let message = 'Internal server error';
  let code: string | undefined;
  let details: any;

  // Check if it's our custom ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if (err.name === 'ValidationError') {
    // Zod validation errors
    statusCode = 400;
    message = 'Validation error';
    details = err.message;
  } else {
    // Generic error
    message = err.message;
  }

  // Log error in development
  if (config.nodeEnv === 'development') {
    console.error('Error:', {
      statusCode,
      message,
      code,
      details,
      stack: err.stack,
      url: req.url,
      method: req.method,
    });
  }

  // Send error response
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      code,
      details: config.nodeEnv === 'development' ? details : undefined,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  const response: ApiResponse = {
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
    },
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
}

/**
 * Async route handler wrapper
 * Catches async errors and passes them to error handler
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
