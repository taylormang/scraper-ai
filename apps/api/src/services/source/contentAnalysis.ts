import OpenAI from 'openai';
import { config } from '../../config/index.js';
import cheerio from 'cheerio';

const MODEL_NAME = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You analyze HTML/markdown content to identify repeating data items and their structure.

Return JSON of the form:
{
  "content_structure": {
    "typical_fields": [
      {
        "name": "title",
        "type": "string",
        "selector": ".post-title",
        "attribute": null
      },
      {
        "name": "link",
        "type": "string",
        "selector": ".post-title a",
        "attribute": "href"
      }
    ],
    "items_per_page": 30,
    "item_selector": ".post-item"
  },
  "sample_items": [
    {"title": "Example 1", "link": "https://example.com/1"},
    {"title": "Example 2", "link": "https://example.com/2"}
  ]
}

Rules:
- Identify repeating patterns (list items, posts, products, etc.)
- Extract field names that make sense for the data (title, author, price, date, etc.)
- Provide CSS selectors for each field
- Include 2-5 sample items with actual extracted data
- If no clear repeating structure, return empty arrays
- Field types: "string", "number", "date", "url"
- Use "attribute" field for href, src, data-* attributes (null if text content)`;

export interface ContentAnalysisInput {
  url: string;
  html: string;
  markdown: string;
}

export interface ContentField {
  name: string;
  type: string;
  selector?: string;
  attribute?: string;
}

export interface ContentAnalysisResult {
  typical_fields: ContentField[];
  items_per_page: number;
  item_selector?: string;
  ai_detected: boolean;
  sample_items: Array<Record<string, any>>;
}

/**
 * Analyze page content to detect data structure and extract samples
 */
export async function analyzeContentStructure(
  input: ContentAnalysisInput
): Promise<ContentAnalysisResult> {
  if (!config.services.openai) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Build a condensed HTML summary for AI analysis
  const $ = cheerio.load(input.html);
  $('script, style, noscript').remove();

  // Get a sample of the body HTML (first 4000 chars to stay under token limits)
  const bodyHtml = $('body').html()?.substring(0, 4000) || '';

  // Also get markdown sample
  const markdownSample = input.markdown.substring(0, 2000);

  const prompt = [
    'Analyze this web page to identify repeating data items (e.g., posts, products, news items).',
    'Extract the structure and provide sample data.',
    '',
    'URL:', input.url,
    '',
    'HTML Sample:',
    bodyHtml,
    '',
    'Markdown Sample:',
    markdownSample,
  ].join('\n');

  console.log('[ContentAnalysis] Analyzing content structure...');

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

  console.log('[ContentAnalysis] OpenAI response:', content.substring(0, 500));

  const parsed = JSON.parse(content);

  return {
    typical_fields: parsed.content_structure?.typical_fields || [],
    items_per_page: parsed.content_structure?.items_per_page || 0,
    item_selector: parsed.content_structure?.item_selector,
    ai_detected: true,
    sample_items: parsed.sample_items || [],
  };
}
