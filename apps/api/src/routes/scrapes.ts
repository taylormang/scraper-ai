import { Router } from 'express';
import { z } from 'zod';
import { ScraperService } from '../services/scraper.js';
import { ApiResponse, ApiError } from '../types/index.js';

const router = Router();
const scraperService = new ScraperService();

// Request validation schema
const paginationSchema = z
  .object({
    autoPaginate: z.boolean().optional(),
    maxPages: z
      .number()
      .int()
      .positive()
      .optional(),
    maxResults: z
      .number()
      .int()
      .positive()
      .optional(),
    maxWaitTime: z
      .number()
      .int()
      .positive()
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.autoPaginate !== undefined ||
      value.maxPages !== undefined ||
      value.maxResults !== undefined ||
      value.maxWaitTime !== undefined,
    {
      message: 'Pagination settings must include at least one value',
    }
  );

const scrapeRequestSchema = z
  .object({
    url: z.string().url('Invalid URL format'),
    prompt: z
      .string()
      .optional()
      .transform((value) => {
        if (!value) return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      })
      .refine((value) => !value || value.length <= 2000, {
        message: 'Prompt is too long',
      }),
    pagination: paginationSchema.optional(),
  })
  .strict();

/**
 * POST /api/scrapes
 * Scrape a URL and return markdown content
 */
router.post('/', async (req, res, next) => {
  try {
    // Validate request body
    const validationResult = scrapeRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      throw new ApiError(
        validationResult.error.errors[0].message,
        400,
        'VALIDATION_ERROR'
      );
    }

    const { url, prompt, pagination } = validationResult.data;

    // Scrape the URL
    const result = await scraperService.scrapeUrl(url, { prompt, pagination });

    // Return successful response
    const response: ApiResponse = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/scrapes/health
 * Check if scraper service is configured correctly
 */
router.get('/health', (req, res) => {
  try {
    // Try to instantiate the service to check if API key is configured
    new ScraperService();

    const response: ApiResponse = {
      success: true,
      data: {
        status: 'configured',
        message: 'Firecrawl API key is configured',
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Configuration error',
        code: 'NOT_CONFIGURED',
      },
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/scrapes
 * Get all scrapes from the database (most recent first)
 */
router.get('/', async (req, res, next) => {
  try {
    const scrapes = await scraperService.getAllScrapes();

    const response: ApiResponse = {
      success: true,
      data: {
        scrapes,
        count: scrapes.length,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/scrapes/:id
 * Get a specific scrape by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const scrape = await scraperService.getScrapeById(id);

    if (!scrape) {
      throw new ApiError('Scrape not found', 404, 'NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: scrape,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
