import OpenAI from 'openai';
import { config } from '../../config/index.js';
import type { RecipeField } from '../../types/recipe.js';

const MODEL_NAME = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You analyze natural language scraping requests to extract structured configuration.

Return JSON of the form:
{
  "url": "https://example.com/path",
  "name": "User-friendly recipe name",
  "description": "Brief description of what's being scraped",
  "fields": [
    {"name": "title", "type": "string", "required": true},
    {"name": "author", "type": "string", "required": false},
    {"name": "link", "type": "url", "required": true}
  ],
  "limit_strategy": "page_count",
  "page_count": 10,
  "deduplicate": true,
  "deduplicate_field": "link"
}

Rules:
- Extract the target URL from the user's request
- Infer field names and types from what the user wants to extract
- Field types: "string", "number", "date", "url"
- Mark fields as required if they seem essential to the user's request
- Default to page_count strategy (use item_count or date_range only if explicitly mentioned)
- If user says "all pages" or similar, use a high page_count like 100
- If user doesn't specify pagination depth, default to 5 pages
- Generate a clear, descriptive name for the recipe
- Enable deduplication by default if there's a clear unique identifier field

Examples:

User: "Scrape the first 10 pages of Hacker News, get the title, author, link, and comment count"
Output: {
  "url": "https://news.ycombinator.com/news",
  "name": "Hacker News Posts",
  "description": "First 10 pages of HN posts with title, author, link, comment count",
  "fields": [
    {"name": "title", "type": "string", "required": true},
    {"name": "author", "type": "string", "required": false},
    {"name": "link", "type": "url", "required": true},
    {"name": "comments", "type": "number", "required": false}
  ],
  "limit_strategy": "page_count",
  "page_count": 10,
  "deduplicate": true,
  "deduplicate_field": "link"
}

User: "Get product listings from amazon.com/s?k=laptops - need name, price, rating, and URL. Go deep, get everything."
Output: {
  "url": "https://amazon.com/s?k=laptops",
  "name": "Amazon Laptop Listings",
  "description": "Product listings for laptops with name, price, rating, URL",
  "fields": [
    {"name": "name", "type": "string", "required": true},
    {"name": "price", "type": "number", "required": false},
    {"name": "rating", "type": "number", "required": false},
    {"name": "url", "type": "url", "required": true}
  ],
  "limit_strategy": "page_count",
  "page_count": 100,
  "deduplicate": true,
  "deduplicate_field": "url"
}`;

export interface PromptAnalysisResult {
  url: string;
  name: string;
  description?: string;
  fields: RecipeField[];
  limit_strategy: 'page_count' | 'item_count' | 'date_range';
  page_count?: number;
  item_count?: number;
  date_range?: {
    start: string;
    end: string;
  };
  deduplicate: boolean;
  deduplicate_field?: string;
}

/**
 * Analyze natural language prompt to extract Recipe configuration
 */
export async function analyzeRecipePrompt(prompt: string): Promise<PromptAnalysisResult> {
  if (!config.services.openai) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  console.log('[RecipePromptAnalysis] Analyzing user prompt...');

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

  console.log('[RecipePromptAnalysis] OpenAI response:', content);

  const parsed = JSON.parse(content);

  return {
    url: parsed.url,
    name: parsed.name || 'Untitled Recipe',
    description: parsed.description,
    fields: parsed.fields || [],
    limit_strategy: parsed.limit_strategy || 'page_count',
    page_count: parsed.page_count,
    item_count: parsed.item_count,
    date_range: parsed.date_range,
    deduplicate: parsed.deduplicate ?? true,
    deduplicate_field: parsed.deduplicate_field,
  };
}
