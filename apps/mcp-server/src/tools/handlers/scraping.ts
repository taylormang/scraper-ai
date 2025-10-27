/**
 * Scraping tool handlers
 */

import { API_BASE_URL } from '../../config.js';
import { truncate } from '../../utils/formatters.js';

export async function handleScrapeUrl(args: any) {
  const url = args?.url as string;

  if (!url) {
    throw new Error('URL is required');
  }

  try {
    // Call the API server to scrape the URL
    const response = await fetch(`${API_BASE_URL}/api/scrapes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: 'Unknown error' }))) as any;
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const result = (await response.json()) as any;
    const data = result.data;

    // Format the response for Claude
    const responseText = [
      `Successfully scraped: ${url}`,
      ``,
      `**Title**: ${data.metadata?.title || 'N/A'}`,
      `**Language**: ${data.metadata?.language || 'N/A'}`,
      `**Duration**: ${data.duration}ms`,
      ``,
      `**Content (Markdown)**:`,
      `\`\`\`markdown`,
      truncate(data.markdown, 2000),
      `\`\`\``,
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
    console.error('[MCP] Scrape error:', error);
    throw new Error(
      `Failed to scrape URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function handleScrape(args: any) {
  const prompt = args?.prompt as string;
  const user_id = (args?.user_id as string) || 'default_user';

  if (!prompt) {
    throw new Error('Prompt is required');
  }

  try {
    // Step 1: List existing recipes to see if we have a match
    const listResponse = await fetch(
      `${API_BASE_URL}/api/recipes?user_id=${encodeURIComponent(user_id)}`
    );

    let recipeId: string | null = null;
    let recipeName: string | null = null;

    if (listResponse.ok) {
      const listResult = (await listResponse.json()) as any;
      const recipes = listResult.data.recipes;

      // Try to find a matching recipe by looking for keywords in the prompt
      const promptLower = prompt.toLowerCase();
      const matchingRecipe = recipes.find((r: any) => {
        const nameLower = r.name.toLowerCase();
        const urlLower = r.base_url.toLowerCase();
        return (
          promptLower.includes(nameLower) ||
          nameLower.includes(promptLower) ||
          promptLower.includes(urlLower) ||
          urlLower.includes(promptLower)
        );
      });

      if (matchingRecipe) {
        recipeId = matchingRecipe.id;
        recipeName = matchingRecipe.name;
      }
    }

    // Step 2: If no recipe found, create one
    if (!recipeId) {
      const createResponse = await fetch(`${API_BASE_URL}/api/recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, user_id }),
      });

      if (!createResponse.ok) {
        const errorData = (await createResponse
          .json()
          .catch(() => ({ error: 'Unknown error' }))) as any;
        throw new Error(
          `Failed to create recipe: ${errorData.error?.message || createResponse.statusText}`
        );
      }

      const createResult = (await createResponse.json()) as any;
      recipeId = createResult.data.recipe.id;
      recipeName = createResult.data.recipe.name;
    }

    // Step 3: Execute the recipe
    const executeResponse = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id }),
    });

    if (!executeResponse.ok) {
      const errorData = (await executeResponse
        .json()
        .catch(() => ({ error: 'Unknown error' }))) as any;
      throw new Error(
        `Failed to execute recipe: ${errorData.error?.message || executeResponse.statusText}`
      );
    }

    const executeResult = (await executeResponse.json()) as any;
    const { execution, data, recipe } = executeResult.data;

    // Format the response
    const responseText = [
      `✅ Successfully scraped ${recipeName}!`,
      ``,
      `**Recipe**: ${recipe.name} (${recipe.id})`,
      `**URL**: ${recipe.base_url}`,
      `**Execution**: ${execution.id}`,
      `**Status**: ${execution.status}`,
      ``,
      `**Results**:`,
      `- Pages scraped: ${execution.stats.pages_scraped}`,
      `- Items scraped: ${execution.stats.items_scraped}`,
      `- Total credits used: ${data.creditsUsed || 'N/A'}`,
      ``,
      data.pages && data.pages.length > 0
        ? `**Sample Data** (first ${Math.min(3, data.pages.length)} pages):`
        : '',
      ...(data.pages || [])
        .slice(0, 3)
        .map((page: any, idx: number) => [
          ``,
          `**Page ${idx + 1}**: ${page.url || 'N/A'}`,
          page.markdown
            ? `\`\`\`\n${truncate(page.markdown, 500)}\n\`\`\``
            : 'No content',
        ])
        .flat(),
      ``,
      data.pages && data.pages.length > 3 ? `... and ${data.pages.length - 3} more pages` : '',
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
    console.error('[MCP] Scrape error:', error);
    throw new Error(`Failed to scrape: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
