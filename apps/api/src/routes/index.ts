import { Router } from 'express';
import healthRoutes from './health.js';
import scrapesRoutes from './scrapes.js';

const router = Router();

// Mount health routes
router.use('/', healthRoutes);

// Mount scrapes routes
router.use('/scrapes', scrapesRoutes);

// Future routes will be added here:
// router.use('/jobs', jobsRoutes);

export default router;
