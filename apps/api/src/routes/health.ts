import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types/index.js';
import { config } from '../config/index.js';
import { checkDatabaseConnection } from '../db/index.js';

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
 * Detailed system status with service health checks
 */
router.get('/status', async (req: Request, res: Response) => {
  // Check database connection
  const dbHealthy = await checkDatabaseConnection();

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
        database: dbHealthy
          ? (config.database.url ? 'connected' : 'ready (sqlite)')
          : 'disconnected',
        redis: 'not_configured', // Will be updated in Phase 2 (Job Queue)
        queue: 'not_configured', // Will be updated in Phase 2 (Job Queue)
      },
      database: {
        mode: config.database.url ? 'postgresql' : 'sqlite',
        url: config.database.url ? 'configured' : 'not_configured',
        connected: dbHealthy,
      },
    },
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

export default router;
