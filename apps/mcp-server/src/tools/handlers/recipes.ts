/**
 * Recipe tool handlers
 */

import { API_BASE_URL } from '../../config.js';

export async function handleCreateRecipe(args: any) {
  const prompt = args?.prompt as string;
  const user_id = (args?.user_id as string) || 'default_user';

  if (!prompt) {
    throw new Error('Prompt is required');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/recipes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, user_id }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: 'Unknown error' }))) as any;
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const result = (await response.json()) as any;
    const recipe = result.data.recipe;
    const source = result.data.source;

    const responseText = [
      `✅ Recipe created successfully!`,
      ``,
      `**Recipe ID**: ${recipe.id}`,
      `**Name**: ${recipe.name}`,
      `**Description**: ${recipe.description || 'N/A'}`,
      `**URL**: ${recipe.base_url}`,
      `**Source ID**: ${recipe.source_id}`,
      ``,
      `**Extraction Configuration**:`,
      `- Strategy: ${recipe.extraction.limit_strategy}`,
      `- Pages: ${recipe.extraction.page_count || 'N/A'}`,
      `- Items: ${recipe.extraction.item_count || 'N/A'}`,
      `- Deduplication: ${recipe.extraction.deduplicate ? 'Enabled' : 'Disabled'}`,
      recipe.extraction.deduplicate_field
        ? `- Deduplicate by: ${recipe.extraction.deduplicate_field}`
        : '',
      ``,
      `**Fields to Extract**:`,
      ...recipe.extraction.fields.map(
        (f: any) => `  - ${f.name} (${f.type})${f.required ? ' *required*' : ''}`
      ),
      ``,
      `**Engine Configuration**:`,
      `- Engine: ${recipe.execution.engine}`,
      `- Actions: ${recipe.execution.engine_config.firecrawl.actions.length} steps`,
      `- Strategy: ${source.pagination?.strategy || 'none'}`,
      ``,
      `**Created**: ${new Date(recipe.created_at).toLocaleString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    console.error('[MCP] Create recipe error:', error);
    throw new Error(
      `Failed to create recipe: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function handleListRecipes(args: any) {
  const user_id = args?.user_id as string | undefined;

  try {
    const url = user_id
      ? `${API_BASE_URL}/api/recipes?user_id=${encodeURIComponent(user_id)}`
      : `${API_BASE_URL}/api/recipes`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: 'Unknown error' }))) as any;
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const result = (await response.json()) as any;
    const recipes = result.data.recipes;

    if (recipes.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: user_id
              ? `No Recipes found for user: ${user_id}`
              : 'No Recipes found. Create your first Recipe with the create_recipe tool!',
          },
        ],
      };
    }

    const responseText = [
      `📋 Found ${recipes.length} Recipe${recipes.length === 1 ? '' : 's'}${user_id ? ` for user: ${user_id}` : ''}:`,
      ``,
      ...recipes
        .map((r: any) => [
          `**${r.name}** (${r.id})`,
          `  URL: ${r.base_url}`,
          `  Status: ${r.status}`,
          `  Fields: ${r.extraction.fields.map((f: any) => f.name).join(', ')}`,
          `  Pages: ${r.extraction.page_count || 'N/A'}`,
          `  Created: ${new Date(r.created_at).toLocaleString()}`,
          ``,
        ])
        .flat(),
    ].join('\n');

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    console.error('[MCP] List recipes error:', error);
    throw new Error(
      `Failed to list recipes: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function handleGetRecipe(args: any) {
  const recipe_id = args?.recipe_id as string;

  if (!recipe_id) {
    throw new Error('Recipe ID is required');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/recipes/${recipe_id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Recipe not found: ${recipe_id}`);
      }
      const errorData = (await response.json().catch(() => ({ error: 'Unknown error' }))) as any;
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const result = (await response.json()) as any;
    const recipe = result.data.recipe;

    const responseText = [
      `📄 Recipe Details: ${recipe.name}`,
      ``,
      `**ID**: ${recipe.id}`,
      `**Description**: ${recipe.description || 'N/A'}`,
      `**URL**: ${recipe.base_url}`,
      `**Source ID**: ${recipe.source_id}`,
      `**Status**: ${recipe.status}`,
      `**User ID**: ${recipe.user_id}`,
      ``,
      `**Extraction**:`,
      `- Strategy: ${recipe.extraction.limit_strategy}`,
      `- Page count: ${recipe.extraction.page_count || 'N/A'}`,
      `- Item count: ${recipe.extraction.item_count || 'N/A'}`,
      `- Deduplicate: ${recipe.extraction.deduplicate}`,
      recipe.extraction.deduplicate_field
        ? `- Deduplicate field: ${recipe.extraction.deduplicate_field}`
        : '',
      `- Include raw content: ${recipe.extraction.include_raw_content}`,
      ``,
      `**Fields**:`,
      ...recipe.extraction.fields.map(
        (f: any) =>
          `  - ${f.name} (${f.type})${f.required ? ' *required*' : ''}${f.default !== undefined ? ` [default: ${f.default}]` : ''}`
      ),
      ``,
      `**Execution**:`,
      `- Engine: ${recipe.execution.engine}`,
      `- Rate limit: ${recipe.execution.rate_limit.delay_ms}ms delay, max ${recipe.execution.rate_limit.max_concurrent} concurrent`,
      `- Retry: ${recipe.execution.retry.max_attempts} attempts, ${recipe.execution.retry.backoff_ms}ms backoff`,
      `- Timeout: ${recipe.execution.timeout_ms}ms`,
      ``,
      `**Dataset Stats**:`,
      `- Total runs: ${recipe.datasets.total_runs}`,
      recipe.datasets.last_run
        ? `- Last run: ${recipe.datasets.last_run.status} (${recipe.datasets.last_run.items_scraped} items, ${recipe.datasets.last_run.pages_scraped} pages)`
        : '',
      ``,
      `**Created**: ${new Date(recipe.created_at).toLocaleString()}`,
      `**Updated**: ${new Date(recipe.updated_at).toLocaleString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    console.error('[MCP] Get recipe error:', error);
    throw new Error(
      `Failed to get recipe: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
