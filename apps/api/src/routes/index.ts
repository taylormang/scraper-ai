import { Router } from 'express';
import healthRoutes from './health.js';
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

export default router;
