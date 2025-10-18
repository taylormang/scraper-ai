import OpenAI from 'openai';
import Firecrawl from '@mendable/firecrawl-js';
import { z } from 'zod';
import { config } from '../config/index.js';
import { extractionPlanInputSchema, extractionSchemaResponseSchema, extractionFieldSchema, type ExtractionSchemaResponse, type ExtractionPlanInput, type ExtractionField } from '../types/extraction.js';
import { TraceService } from './trace.js';

const MODEL_NAME = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are an expert data extraction planner. A user has described data they want to scrape from a website. You are provided the user's prompt, the current scrape plan, pagination details (if any), and a snapshot of the first page.

Respond with JSON matching this schema:
{
  "refinedPrompt": string,
  "notes": string | null,
  "llmFields": Array<{
     "name": string,
     "description": string,
     "required": boolean,
     "type": string,
     "example"?: unknown
  }>
}

Guidelines:
- Honour explicit user instructions (e.g. "don't add more fields"). Only propose additional fields if instructions allow it.
- Prefer concise field names that map to the content on the page.
- Include URLs if they are essential to the dataset (e.g. detail links, image URLs).
- The refined prompt should explain what to extract from the first page so Firecrawl's JSON extraction returns the desired fields in a consistent structure.
- Keep the refined prompt actionable, focusing on desired fields, formats, and any constraints.
- Set "notes" to null if you have nothing extra to add.`;

const MAX_CONTEXT_LENGTH = 8000;

export class ExtractionSchemaService {
  private openai: OpenAI;
  private firecrawl: Firecrawl;
  private traceService: TraceService;

  constructor(
    openaiClient?: OpenAI,
    firecrawlClient?: Firecrawl,
    traceService?: TraceService
  ) {
    const openaiKey = config.services.openai;
    const firecrawlKey = config.services.firecrawl;

    if (!openaiClient && !openaiKey) {
      throw new Error('OPENAI_API_KEY is required to generate extraction prompts');
    }
    if (!firecrawlClient && !firecrawlKey) {
      throw new Error('FIRECRAWL_API_KEY is required to run Firecrawl extraction');
    }

    this.openai = openaiClient ?? new OpenAI({ apiKey: openaiKey as string });
    this.firecrawl = firecrawlClient ?? new Firecrawl({ apiKey: firecrawlKey });
    this.traceService = traceService ?? new TraceService();
  }

  async generateExtractionSchema(input: ExtractionPlanInput): Promise<ExtractionSchemaResponse> {
    const parsed = extractionPlanInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0]?.message ?? 'Invalid extraction input');
    }

    const normalized = parsed.data;
    const llmResponse = await this.generateRefinedPrompt(normalized);
    const firecrawlResult = await this.runFirecrawlExtraction(normalized.recon.url, llmResponse.refinedPrompt);
    const inferredFields = this.inferFieldsFromExtract(firecrawlResult.data);

    const finalResponse: ExtractionSchemaResponse = {
      refinedPrompt: llmResponse.refinedPrompt,
      notes: llmResponse.notes ?? null,
      llmFields: llmResponse.llmFields,
      inferredFields,
      extractStatus: firecrawlResult.status ?? null,
      sample: firecrawlResult.sample,
      rawExtract: firecrawlResult.data,
    };

    const validated = extractionSchemaResponseSchema.parse(finalResponse);

    try {
      await this.traceService.recordTrace({
        type: 'plan-extraction-schema',
        model: MODEL_NAME,
        prompt: llmResponse.promptPayload,
        response: validated,
        metadata: {
          firecrawlStatus: firecrawlResult.status ?? null,
        },
      });
    } catch (error) {
      console.error('[ExtractionSchemaService] Failed to record trace', error);
    }

    return validated;
  }

  private async generateRefinedPrompt(input: ExtractionPlanInput) {
    const markdown = this.truncate(input.recon.markdown ?? '', MAX_CONTEXT_LENGTH / 2);
    const html = this.truncate(input.recon.html ?? '', MAX_CONTEXT_LENGTH / 2);

    const payload = {
      userPrompt: input.userPrompt,
      plan: input.plan,
      pagination: input.pagination ?? null,
      summary: input.recon.summary ?? null,
      markdownSample: markdown,
      htmlSample: html,
    };

    const userContent = JSON.stringify(payload, null, 2);

    const response = await this.openai.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    });

    const choice = response.choices[0]?.message?.content;
    if (!choice) {
      throw new Error('Extraction planner returned empty content');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(choice);
    } catch (error) {
      throw new Error('Extraction planner returned invalid JSON');
    }

    const refined = zodExtractionLLMResponse.parse(parsed);
    return {
      ...refined,
      promptPayload: userContent,
    };
  }

  private async runFirecrawlExtraction(url: string, prompt: string) {
    const response = await this.firecrawl.extract({
      urls: [url],
      prompt,
      timeout: 120,
      pollInterval: 2,
      scrapeOptions: {
        waitFor: 5000,
        timeout: 90000,
        onlyMainContent: false,
        mobile: false,
      },
    });

    const data = response.data ?? null;
    const status = response.status ?? null;
    const sample = this.extractSample(data);

    return { data, status, sample };
  }

  private inferFieldsFromExtract(data: unknown): ExtractionField[] {
    const sample = this.extractSample(data);
    if (!sample || typeof sample !== 'object' || Array.isArray(sample)) {
      return [];
    }

    return Object.entries(sample).map(([name, value]) => {
      const { type, example } = this.describeValue(value);
      return {
        name,
        description: `Value inferred from Firecrawl extract (${type})`,
        required: value !== null && value !== undefined,
        type,
        example,
        source: 'inferred',
      } satisfies ExtractionField;
    });
  }

  private extractSample(data: unknown): unknown {
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    if (data && typeof data === 'object') {
      return data;
    }
    return null;
  }

  private describeValue(value: unknown): { type: string; example: unknown } {
    if (value === null) return { type: 'null', example: value };
    if (value === undefined) return { type: 'undefined', example: value };
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return { type: 'array', example: [] };
      }
      const first = value[0];
      const inner = this.describeValue(first);
      return { type: `array<${inner.type}>`, example: value.slice(0, 3) };
    }
    switch (typeof value) {
      case 'string':
        if (/^https?:\/\//i.test(value)) {
          return { type: 'url', example: value };
        }
        return { type: 'string', example: value };
      case 'number':
        return { type: Number.isInteger(value) ? 'integer' : 'number', example: value };
      case 'boolean':
        return { type: 'boolean', example: value };
      case 'object':
        return { type: 'object', example: value };
      default:
        return { type: typeof value, example: value };
    }
  }

  private truncate(value: string, maxLength: number): string {
    if (!value) return '';
    if (value.length <= maxLength) return value;
    const head = value.slice(0, Math.floor(maxLength / 2));
    const tail = value.slice(-Math.floor(maxLength / 2));
    return `${head}\n... [truncated ${value.length - maxLength} chars] ...\n${tail}`;
  }
}

const zodExtractionLLMField = extractionFieldSchema.extend({
  type: extractionFieldSchema.shape.type.default('string'),
  required: extractionFieldSchema.shape.required.default(true),
  source: z.literal('llm').default('llm'),
});

const zodExtractionLLMResponse = z.object({
  refinedPrompt: z.string(),
  notes: z.string().nullable().optional(),
  llmFields: z.array(zodExtractionLLMField),
});
