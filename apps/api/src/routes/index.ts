import { Router } from 'express';
import healthRoutes from './health.js';
import plannerRoutes from './planner.js';
import tracesRoutes from './traces.js';
import runsRoutes from './runs.js';
import plansRoutes from './plans.js';
import firecrawlRoutes from './firecrawl.js';
import sourcesRoutes from './sources.js';
import recipesRoutes from './recipes.js';
import executionsRoutes from './executions.js';
import datasetsRoutes from './datasets.js';

const router = Router();

// Mount health routes
router.use('/', healthRoutes);

// Source management routes
router.use('/sources', sourcesRoutes);

// Recipe management routes
router.use('/recipes', recipesRoutes);

// Execution routes
router.use('/executions', executionsRoutes);

// Dataset routes
router.use('/datasets', datasetsRoutes);

// Direct Firecrawl test endpoint
router.use('/firecrawl', firecrawlRoutes);

// Run orchestration routes
router.use('/runs', runsRoutes);

// Planner routes
router.use('/planner', plannerRoutes);

// Plans routes
router.use('/plans', plansRoutes);

// Trace routes
router.use('/traces', tracesRoutes);

// Future routes will be added here:
// router.use('/jobs', jobsRoutes);

export default router;
