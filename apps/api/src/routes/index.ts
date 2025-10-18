import { Router } from 'express';
import healthRoutes from './health.js';
import plannerRoutes from './planner.js';
import tracesRoutes from './traces.js';
import runsRoutes from './runs.js';

const router = Router();

// Mount health routes
router.use('/', healthRoutes);

// Run orchestration routes
router.use('/runs', runsRoutes);

// Planner routes
router.use('/planner', plannerRoutes);

// Trace routes
router.use('/traces', tracesRoutes);

// Future routes will be added here:
// router.use('/jobs', jobsRoutes);

export default router;
