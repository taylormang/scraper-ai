import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { buildPaginationSummary } from '../../utils/paginationSummary.js';
import type { PaginationSummary } from '../../types/pagination.js';

const MODEL_NAME = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You analyze HTML/markdown snippets to identify pagination behaviour.
Return JSON of the form:
{
  "pagination": {
    "strategy": "next_link" | "load_more" | "numbered_pages" | "infinite_scroll" | "none",
    "confidence": "low" | "medium" | "high",
    "selector": string | null,
    "hrefTemplate": string | null,
    "reasoning": string
  }
}

Strategy definitions:
- "next_link": Site uses a clickable next/more link (e.g., <a class="next">Next</a>)
- "load_more": Site uses a "Load More" button that likely triggers JS
- "numbered_pages": Site uses numbered page links (1, 2, 3) or URL templates (?p=1, ?p=2)
- "infinite_scroll": Site automatically loads more content on scroll
- "none": No pagination detected

DO NOT invent selectors unless clear evidence exists in the input.`;

export interface PaginationAnalysisInput {
  url: string;
  html: string;
  markdown: string;
}

export interface PaginationAnalysisResult {
  strategy: 'next_link' | 'numbered_pages' | 'load_more' | 'infinite_scroll' | 'none';
  confidence: 'low' | 'medium' | 'high';
  selector: string | null;
  hrefTemplate: string | null;
  reasoning: string;
  summary: PaginationSummary;
}

/**
 * Analyze page content to determine pagination strategy
 * Stripped-down version for Source creation workflow
 */
export async function analyzePagination(
  input: PaginationAnalysisInput
): Promise<PaginationAnalysisResult> {
  if (!config.services.openai) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Build summary of navigation elements
  const summary = buildPaginationSummary({
    url: input.url,
    html: input.html,
    markdown: input.markdown,
  });

  console.log('[PaginationAnalysis] Summary:', {
    totalAnchors: summary.stats?.totalAnchors,
    totalButtons: summary.stats?.totalButtons,
    topAnchorScores: summary.anchorSample?.slice(0, 5).map((a) => ({
      text: a.text.substring(0, 40),
      score: a.score,
    })),
  });

  // Build prompt for AI analysis
  const prompt = [
    'Analyze the following JSON summary of a web page to determine pagination behaviour.',
    'Focus on the anchorSample, buttonSample, and navigationFragments fields.',
    'Summary:',
    JSON.stringify(
      {
        url: summary.url,
        title: summary.title,
        anchorSample: summary.anchorSample?.slice(0, 20), // Top 20 anchors
        buttonSample: summary.buttonSample?.slice(0, 10), // Top 10 buttons
        navigationFragments: summary.navigationFragments?.slice(0, 5), // Top 5 nav sections
      },
      null,
      2
    ),
  ].join('\n');

  // Call OpenAI
  const client = new OpenAI({ apiKey: config.services.openai });
  const response = await client.chat.completions.create({
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
    throw new Error('OpenAI returned empty response');
  }

  console.log('[PaginationAnalysis] OpenAI response:', content);

  const parsed = JSON.parse(content);
  const result = parsed.pagination;

  return {
    strategy: result.strategy || 'none',
    confidence: result.confidence || 'low',
    selector: result.selector || null,
    hrefTemplate: result.hrefTemplate || null,
    reasoning: result.reasoning || '',
    summary,
  };
}
