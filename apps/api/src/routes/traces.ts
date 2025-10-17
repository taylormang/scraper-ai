import { Router } from 'express';
import { TraceService } from '../services/trace.js';

const router = Router();
const traceService = new TraceService();

router.get('/', async (req, res, next) => {
  try {
    const limitParam = typeof req.query.limit === 'string' ? req.query.limit : undefined;
    const limit = limitParam ? Math.min(Math.max(Number.parseInt(limitParam, 10), 1), 200) : 100;
    const traces = (await traceService.listTraces(limit)).map((trace) => ({
      ...trace,
      createdAt: trace.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      data: { traces },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
