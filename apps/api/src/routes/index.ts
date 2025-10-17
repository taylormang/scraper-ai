import { Router } from 'express';
import healthRoutes from './health.js';
import scrapesRoutes from './scrapes.js';
import plannerRoutes from './planner.js';
import tracesRoutes from './traces.js';

const router = Router();

// Mount health routes
router.use('/', healthRoutes);

// Mount scrapes routes
router.use('/scrapes', scrapesRoutes);

// Planner routes
router.use('/planner', plannerRoutes);

// Trace routes
router.use('/traces', tracesRoutes);

// Future routes will be added here:
// router.use('/jobs', jobsRoutes);

export default router;
