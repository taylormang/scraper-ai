import { Router } from 'express';
import healthRoutes from './health.js';

const router = Router();

// Mount health routes
router.use('/', healthRoutes);

// Future routes will be added here:
// router.use('/scrapes', scrapesRoutes);
// router.use('/jobs', jobsRoutes);

export default router;
