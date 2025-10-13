import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types/index.js';
import { config } from '../config/index.js';

const router = Router();

/**
 * GET /api/health
 * Basic health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      version: '0.1.0',
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

/**
 * GET /api/status
 * Detailed system status (for future expansion)
 */
router.get('/status', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      server: {
        status: 'running',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
      },
      services: {
        database: 'not_configured', // Will be updated when DB is added
        redis: 'not_configured', // Will be updated when Redis is added
        queue: 'not_configured', // Will be updated when queue is added
      },
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

export default router;
