import OpenAI from 'openai';
import { config } from '../config/index.js';
import {
  planResponseSchema,
  type ScrapePlan,
  type PlanResponse,
} from '../types/planner.js';
import { TraceService } from './trace.js';

const MODEL_NAME = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You translate user scraping requests into a structured plan for a web scraping orchestrator.
Always return JSON with this shape:
{
  "plan": {
    "baseUrl": string | null,
    "alternativeUrls": string[],
    "searchQuery": string | null,
    "objective": string,
    "extractionFormat": "json" | "markdown" | "html",
    "extractionFields": Array<{ "name": string, "description": string, "required": boolean }>,
    "pagination": {
      "strategy": "page_count" | "item_count" | "unknown",
      "targetValue": number | null,
      "notes": string | null
    },
    "constraints": string[],
    "assumptions": string[],
    "confidence": "low" | "medium" | "high"
  },
  "reasoning": string | null
}
Return ONLY valid JSON, with booleans for "required" and nulls where data is unknown. Do not include markdown fences or extra text.`;

export class PlannerService {
  private client: OpenAI;
  private traceService: TraceService;

  constructor(client?: OpenAI, traceService?: TraceService) {
    const apiKey = config.services.openai;
    if (!client && !apiKey) {
      throw new Error('OPENAI_API_KEY is required to generate scrape plans');
    }
    this.client = client ?? new OpenAI({ apiKey: apiKey as string });
    this.traceService = traceService ?? new TraceService();
  }

  async generatePlan(prompt: string): Promise<PlanResponse> {
    if (!prompt || !prompt.trim()) {
      throw new Error('Prompt is required');
    }

    const response = await this.client.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt.trim() },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Planner response was empty');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error('Planner returned invalid JSON');
    }

    const validated = planResponseSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(
        `Planner response failed validation: ${validated.error.message}`
      );
    }

    const plan = validated.data;

    try {
      await this.traceService.recordTrace({
        type: 'create-scrape-plan',
        model: MODEL_NAME,
        prompt,
        response: plan,
        metadata: {
          completionId: response.id,
          usage: response.usage ?? null,
        },
      });
    } catch (traceError) {
      console.error('[PlannerService] Failed to record trace', traceError);
    }

    return plan;
  }
}

export type { ScrapePlan, PlanResponse };
