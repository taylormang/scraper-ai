import { Router } from 'express';
import { ApiError, type ApiResponse } from '../types/index.js';
import { JsonDatasetRepository } from '../repositories/jsonDatasetRepository.js';

const router = Router();
const datasetRepository = new JsonDatasetRepository();

/**
 * GET /api/datasets
 * List all Datasets (optionally filtered by recipe_id)
 */
router.get('/', async (req, res, next) => {
  try {
    const { recipe_id, limit } = req.query;

    let datasets;
    if (recipe_id) {
      datasets = await datasetRepository.findByRecipeId(recipe_id as string);
    } else {
      const limitNum = limit ? parseInt(limit as string, 10) : undefined;
      datasets = await datasetRepository.list(limitNum);
    }

    const response: ApiResponse = {
      success: true,
      data: { datasets, count: datasets.length },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Datasets] Error:', error);
    next(error);
  }
});

/**
 * GET /api/datasets/:id
 * Get a Dataset by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const dataset = await datasetRepository.findById(id);

    if (!dataset) {
      throw new ApiError('Dataset not found', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: { dataset },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Datasets] Error:', error);
    next(error);
  }
});

/**
 * GET /api/datasets/:id/items
 * Get items for a Dataset with optional pagination
 */
router.get('/:id/items', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;

    // Check if dataset exists
    const dataset = await datasetRepository.findById(id);
    if (!dataset) {
      throw new ApiError('Dataset not found', 404, 'NOT_FOUND');
    }

    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    const offsetNum = offset ? parseInt(offset as string, 10) : 0;

    const result = await datasetRepository.getItemsPaginated(id, limitNum, offsetNum);

    const response: ApiResponse = {
      success: true,
      data: {
        items: result.items,
        pagination: {
          total: result.total,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < result.total,
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Datasets] Error:', error);
    next(error);
  }
});

/**
 * DELETE /api/datasets/:id
 * Delete a Dataset and all its items
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await datasetRepository.delete(id);

    if (!deleted) {
      throw new ApiError('Dataset not found', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: { deleted: true },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Datasets] Error:', error);
    next(error);
  }
});

export default router;
