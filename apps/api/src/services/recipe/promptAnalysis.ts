import OpenAI from 'openai';
import { config } from '../../config/index.js';
import type { RecipeField } from '../../types/recipe.js';
import { DEFAULT_SCRAPE_DEPTH, MAX_SCRAPE_DEPTH } from '../../types/recipe.js';

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
  "depth": 3,
  "deduplicate": true,
  "deduplicate_field": "link"
}

Rules:
- Extract the target URL from the user's request
- Infer field names and types from what the user wants to extract
- Field types: "string", "number", "date", "url"
- Mark fields as required if they seem essential to the user's request
- "depth" represents number of pages to scrape (1-10, default 3)
- Interpret user's intent for depth:
  * No mention of quantity → depth: 3 (default, fast results)
  * "quick", "fast", "sample" → depth: 1
  * "X pages" → depth: X (capped at 10)
  * "X items" → depth: Math.ceil(X / 30), assuming ~30 items per page (capped at 10)
  * "deep", "comprehensive", "everything" → depth: 10 (maximum)
  * "all pages" → depth: 10 (maximum)
- IMPORTANT: depth must be between 1-10 (enforced maximum)
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
  "depth": 10,
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
  "depth": 10,
  "deduplicate": true,
  "deduplicate_field": "url"
}

User: "scrape zillow real estate listings for spring city, pa - extract 100 items total"
Output: {
  "url": "https://www.zillow.com/spring-city-pa/",
  "name": "Zillow Real Estate Listings for Spring City, PA",
  "description": "100 real estate listings from Zillow for Spring City, PA",
  "fields": [
    {"name": "address", "type": "string", "required": true},
    {"name": "price", "type": "number", "required": true},
    {"name": "bedrooms", "type": "number", "required": false},
    {"name": "bathrooms", "type": "number", "required": false},
    {"name": "square_footage", "type": "number", "required": false},
    {"name": "listing_url", "type": "url", "required": true}
  ],
  "depth": 4,
  "deduplicate": true,
  "deduplicate_field": "listing_url"
}`;

export interface PromptAnalysisResult {
  url: string;
  name: string;
  description?: string;
  fields: RecipeField[];
  depth: number; // Scrape depth (1-10)
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

  // Extract and validate depth
  let depth = parsed.depth ?? DEFAULT_SCRAPE_DEPTH;

  // Apply MAX_SCRAPE_DEPTH cap
  if (depth > MAX_SCRAPE_DEPTH) {
    console.log(`[PromptAnalysis] Depth ${depth} exceeds max (${MAX_SCRAPE_DEPTH}), capping to ${MAX_SCRAPE_DEPTH}`);
    depth = MAX_SCRAPE_DEPTH;
  } else if (depth < 1) {
    console.log(`[PromptAnalysis] Depth ${depth} below minimum (1), setting to ${DEFAULT_SCRAPE_DEPTH}`);
    depth = DEFAULT_SCRAPE_DEPTH;
  }

  return {
    url: parsed.url,
    name: parsed.name || 'Untitled Recipe',
    description: parsed.description,
    fields: parsed.fields || [],
    depth,
    deduplicate: parsed.deduplicate ?? true,
    deduplicate_field: parsed.deduplicate_field,
  };
}
