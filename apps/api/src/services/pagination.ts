import OpenAI from 'openai';
import { config } from '../config/index.js';
import {
  paginationInferenceResponseSchema,
  type PaginationInference,
  type PaginationInferenceResponse,
  type PaginationInferenceInput,
} from '../types/pagination.js';
import { TraceService } from './trace.js';
import { buildPaginationSummary } from '../utils/paginationSummary.js';

const MODEL_NAME = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You analyze HTML/markdown snippets to identify pagination behaviour.
Return JSON of the form:
{
  "pagination": {
    "strategy": "next_link" | "load_more" | "unknown",
    "confidence": "low" | "medium" | "high",
    "selector": string | null,
    "hrefTemplate": string | null,
    "actions": Array<object>,
    "notes": string | null
  },
  "reasoning": string | null
}
If no pagination is detected, use strategy "unknown". DO NOT invent selectors or templates unless evidence exists in the input.`;

export class PaginationInferenceService {
  private client: OpenAI;
  private traceService: TraceService;

  constructor(client?: OpenAI, traceService?: TraceService) {
    const apiKey = config.services.openai;
    if (!client && !apiKey) {
      throw new Error('OPENAI_API_KEY is required to infer pagination');
    }
    this.client = client ?? new OpenAI({ apiKey: apiKey as string });
    this.traceService = traceService ?? new TraceService();
  }

  async inferPagination(input: PaginationInferenceInput): Promise<PaginationInferenceResponse> {
    const summary = buildPaginationSummary(input);
    const prompt = [
      'Analyze the following JSON summary of a web page to determine pagination behaviour.',
      'Focus on the anchorSample, buttonSample, and navigationFragments fields.',
      'Summary:',
      JSON.stringify(summary),
    ].join('\n');

    const response = await this.client.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Pagination inference returned empty response');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error('Pagination inference returned invalid JSON');
    }

    const validated = paginationInferenceResponseSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(
        `Pagination inference failed validation: ${validated.error.message}`
      );
    }

    const payload = {
      ...validated.data,
      summary,
    };

    try {
      await this.traceService.recordTrace({
        type: 'infer-pagination',
        model: MODEL_NAME,
        prompt,
        response: payload,
        metadata: {
          completionId: response.id,
          usage: response.usage ?? null,
        },
      });
    } catch (traceError) {
      console.error('[PaginationInferenceService] Failed to record trace', traceError);
    }

    return payload;
  }
}

export type { PaginationInference };
