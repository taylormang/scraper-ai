import { Router } from 'express';
import { z } from 'zod';
import { ApiError, type ApiResponse } from '../types/index.js';
import { config } from '../config/index.js';
import { JsonSourceRepository } from '../repositories/jsonSourceRepository.js';
import { createSourceFromUrl } from '../services/sourceService.js';
import { executeSourceWorkflow } from '../services/source/index.js';

const router = Router();
const sourceRepository = new JsonSourceRepository();

// Schema for Source creation request
const createSourceSchema = z.object({
  url: z.string().url('Invalid URL'),
  rebuild: z.boolean().optional().default(false),
});

/**
 * POST /api/sources
 *
 * AI Workflow to create or update a Source:
 * 1. Intakes URL
 * 2. AI Agent:
 *    - Fetch page (screenshot + markdown + html)
 *    - Analyze pagination strategy
 *    - Generate navigation_schema
 *    - Detect typical fields/items
 *    - Create engine_configs for available engines
 *    - Store sample data
 * 3. Save Source with status="needs_validation"
 */
router.post('/', async (req, res, next) => {
  try {
    const parsed = createSourceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const { url, rebuild } = parsed.data;

    console.log('[Sources] Starting Source generation workflow for:', url);

    // Check if Source already exists
    let source = await sourceRepository.findByUrl(url);
    let isNewSource = !source;

    if (source && !rebuild) {
      console.log('[Sources] Source already exists:', source.id);

      const response: ApiResponse = {
        success: true,
        data: {
          source,
          created: false,
          rebuilt: false,
        },
        timestamp: new Date().toISOString(),
      };

      return res.json(response);
    }

    // If rebuilding existing Source, preserve usage_stats
    const preservedData = source
      ? {
          id: source.id,
          usage_stats: source.usage_stats,
          created_at: source.created_at,
          created_by: source.created_by,
        }
      : null;

    if (source && rebuild) {
      console.log('[Sources] Rebuilding existing Source:', source.id);
    }

    // ========================================================================
    // AI WORKFLOW: Generate Source Configuration
    // ========================================================================

    if (!config.services.firecrawl) {
      throw new ApiError('FIRECRAWL_API_KEY not configured', 500, 'CONFIG_ERROR');
    }

    console.log('[Sources] Starting AI workflow for URL:', url);
    let workflowResult;
    try {
      workflowResult = await executeSourceWorkflow({
        url,
        firecrawlApiKey: config.services.firecrawl,
      });
      console.log('[Sources] ✓ AI workflow completed successfully');
    } catch (error: any) {
      console.error('[Sources] AI workflow failed:', error?.message);
      throw new ApiError(
        `Failed to generate Source configuration: ${error?.message || 'Unknown error'}`,
        500,
        'WORKFLOW_ERROR'
      );
    }

    // ========================================================================
    // Create or update Source
    // ========================================================================

    if (preservedData) {
      // Rebuild: Update existing Source
      const sourceData = createSourceFromUrl(url);
      source = await sourceRepository.update(preservedData.id, {
        ...sourceData,
        sample: workflowResult.sample,
        engine_configs: workflowResult.engine_configs,
        content_structure: workflowResult.content_structure,
        pagination: workflowResult.pagination,
        // Preserve historical data
        usage_stats: preservedData.usage_stats,
        created_at: preservedData.created_at,
        created_by: preservedData.created_by,
      });

      console.log('[Sources] Rebuilt Source:', source.id);
    } else {
      // New Source: Create
      const sourceData = createSourceFromUrl(url);
      source = await sourceRepository.create({
        ...sourceData,
        sample: workflowResult.sample,
        engine_configs: workflowResult.engine_configs,
        content_structure: workflowResult.content_structure,
        pagination: workflowResult.pagination,
      });

      console.log('[Sources] Created Source:', source.id);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        source: {
          id: source.id,
          url: source.url,
          domain: source.domain,
          canonical_url: source.canonical_url,
          sample: source.sample,
          engine_configs: source.engine_configs,
          content_structure: source.content_structure,
          pagination: source.pagination,
          validation: source.validation,
          created_at: source.created_at,
          updated_at: source.updated_at,
        },
        created: isNewSource,
        rebuilt: !isNewSource,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Sources] Error:', error);
    next(error);
  }
});

/**
 * GET /api/sources/:id
 * Get a Source by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const source = await sourceRepository.findById(id);

    if (!source) {
      throw new ApiError('Source not found', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: { source },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Sources] Error:', error);
    next(error);
  }
});

/**
 * GET /api/sources
 * List all Sources
 */
router.get('/', async (req, res, next) => {
  try {
    const sources = await sourceRepository.list();

    const response: ApiResponse = {
      success: true,
      data: { sources, count: sources.length },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('[Sources] Error:', error);
    next(error);
  }
});

export default router;
