import OpenAI from 'openai';
import { config } from '../../config/index.js';
import type { Recipe, RecipeField } from '../../types/recipe.js';

const MODEL_NAME = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You analyze natural language recipe update requests to extract what should be changed.

You receive:
1. The current recipe configuration (JSON)
2. The user's update request (natural language)

Return JSON indicating ONLY the fields that should be updated. Use null to explicitly remove optional fields.

Output format:
{
  "name": "Updated Recipe Name" (only if name should change),
  "description": "Updated description" (only if description should change),
  "fields": [...] (only if fields should change - return COMPLETE field list),
  "depth": 20 (only if scrape depth changes - must be 1-10),
  "deduplicate": true (only if deduplication setting changes),
  "deduplicate_field": "link" (only if deduplicate field changes)
}

Rules:
- Return ONLY the fields that should be updated based on the user's request
- If user wants to modify fields, return the COMPLETE updated field list (not just the new/changed fields)
- If user wants to change scrape depth (e.g., "scrape 20 pages"), update depth (capped at 10)
- Interpret depth from user intent:
  * "X pages" → depth: X (capped at 10)
  * "X items" → depth: Math.ceil(X / 30), assuming ~30 items per page (capped at 10)
  * "deep", "everything", "all pages" → depth: 10 (maximum)
- depth must be between 1-10 (enforced maximum)
- If user wants to add a field, include it in the complete fields array
- If user wants to remove a field, exclude it from the fields array
- Be conservative: don't change things the user didn't mention
- Empty object {} means no changes needed

Examples:

Current Recipe: {"name": "HN Posts", "depth": 3, "fields": [{"name": "title", "type": "string", "required": true}]}
User: "Change to 5 pages"
Output: {"depth": 5}

Current Recipe: {"name": "HN Posts", "fields": [{"name": "title", "type": "string", "required": true}, {"name": "link", "type": "url", "required": true}]}
User: "Add a 'score' field as a number"
Output: {"fields": [{"name": "title", "type": "string", "required": true}, {"name": "link", "type": "url", "required": true}, {"name": "score", "type": "number", "required": false}]}

Current Recipe: {"name": "Amazon Laptops", "description": "Laptop listings"}
User: "Rename this to 'Gaming Laptops' and update description to include gaming focus"
Output: {"name": "Gaming Laptops", "description": "Gaming laptop listings with specs and pricing"}

Current Recipe: {"depth": 3}
User: "Go deeper, get everything"
Output: {"depth": 10}

Current Recipe: {"fields": [{"name": "title", "type": "string", "required": true}, {"name": "author", "type": "string", "required": false}]}
User: "Remove the author field"
Output: {"fields": [{"name": "title", "type": "string", "required": true}]}`;

export interface UpdatePromptAnalysisResult {
  name?: string;
  description?: string;
  fields?: RecipeField[];
  depth?: number; // Scrape depth (1-10)
  deduplicate?: boolean;
  deduplicate_field?: string | null;
}

/**
 * Analyze natural language update prompt to extract what should change in the Recipe
 */
export async function analyzeRecipeUpdatePrompt(
  currentRecipe: Recipe,
  updatePrompt: string
): Promise<UpdatePromptAnalysisResult> {
  if (!config.services.openai) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  console.log('[RecipeUpdateAnalysis] Analyzing update prompt...');

  // Build context from current recipe
  const currentConfig = {
    name: currentRecipe.name,
    description: currentRecipe.description,
    base_url: currentRecipe.base_url,
    fields: currentRecipe.extraction.fields,
    depth: currentRecipe.extraction.depth,
    deduplicate: currentRecipe.extraction.deduplicate,
    deduplicate_field: currentRecipe.extraction.deduplicate_field,
  };

  const client = new OpenAI({ apiKey: config.services.openai });
  const response = await client.chat.completions.create({
    model: MODEL_NAME,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Current Recipe:\n${JSON.stringify(currentConfig, null, 2)}\n\nUpdate Request: ${updatePrompt}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned empty response');
  }

  console.log('[RecipeUpdateAnalysis] OpenAI response:', content);

  const parsed = JSON.parse(content);

  // Return only the fields that were included in the response
  const result: UpdatePromptAnalysisResult = {};

  if (parsed.name !== undefined) result.name = parsed.name;
  if (parsed.description !== undefined) result.description = parsed.description;
  if (parsed.fields !== undefined) result.fields = parsed.fields;
  if (parsed.depth !== undefined) result.depth = parsed.depth;
  if (parsed.deduplicate !== undefined) result.deduplicate = parsed.deduplicate;
  if (parsed.deduplicate_field !== undefined) result.deduplicate_field = parsed.deduplicate_field;

  console.log('[RecipeUpdateAnalysis] Extracted updates:', result);

  return result;
}
