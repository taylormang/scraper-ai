import { Router } from 'express';
import { z } from 'zod';
import { PlannerService } from '../services/planner.js';
import { ApiError } from '../types/index.js';
import { ReconService } from '../services/recon.js';
import { PaginationInferenceService } from '../services/pagination.js';
import { ExtractionSchemaService } from '../services/extraction.js';
import { JobAssemblyService } from '../services/jobAssembly.js';
import { extractionPlanInputSchema } from '../types/extraction.js';
import { jobAssemblyInputSchema } from '../types/job.js';

const router = Router();
let planner: PlannerService | null = null;
let recon: ReconService | null = null;
let pagination: PaginationInferenceService | null = null;
let extraction: ExtractionSchemaService | null = null;
let jobAssembly: JobAssemblyService | null = null;

function getPlanner(): PlannerService {
  if (!planner) {
    planner = new PlannerService();
  }
  return planner;
}

function getRecon(): ReconService {
  if (!recon) {
    recon = new ReconService();
  }
  return recon;
}

function getPagination(): PaginationInferenceService {
  if (!pagination) {
    pagination = new PaginationInferenceService();
  }
  return pagination;
}

function getExtraction(): ExtractionSchemaService {
  if (!extraction) {
    extraction = new ExtractionSchemaService();
  }
  return extraction;
}

function getJobAssembly(): JobAssemblyService {
  if (!jobAssembly) {
    jobAssembly = new JobAssemblyService();
  }
  return jobAssembly;
}

const requestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
});

const reconSchema = z.object({
  url: z.string().url('Valid URL is required'),
});

const paginationSchema = z.object({
  url: z.string().url('Valid URL is required'),
  markdown: z.string().optional(),
  html: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const extractionSchema = extractionPlanInputSchema;
const jobSchema = jobAssemblyInputSchema;

router.post('/', async (req, res, next) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const plan = await getPlanner().generatePlan(parsed.data.prompt);

    res.json({
      success: true,
      data: plan,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/recon', async (req, res, next) => {
  try {
    const parsed = reconSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const output = await getRecon().runRecon(parsed.data.url);

    res.json({
      success: true,
      data: output,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/pagination', async (req, res, next) => {
  try {
    const parsed = paginationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const output = await getPagination().inferPagination(parsed.data);

    res.json({
      success: true,
      data: output,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/extraction', async (req, res, next) => {
  try {
    const parsed = extractionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const output = await getExtraction().generateExtractionSchema(parsed.data);

    res.json({
      success: true,
      data: output,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/job', async (req, res, next) => {
  try {
    const parsed = jobSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const output = getJobAssembly().assembleJob(parsed.data);

    res.json({
      success: true,
      data: output,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
