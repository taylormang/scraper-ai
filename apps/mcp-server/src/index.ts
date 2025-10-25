#!/usr/bin/env node

/**
 * Scraper MCP Server
 *
 * MCP-first web scraping server that enables AI assistants to gather
 * and analyze web data through natural conversation.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

/**
 * Create and configure the MCP server
 */
const server = new Server(
  {
    name: 'scraper-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'ping',
        description:
          'Test tool that returns a pong message. Use this to verify the MCP server is working correctly.',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Optional message to echo back',
            },
          },
        },
      },
      {
        name: 'scrape_url',
        description:
          'Scrape a single URL quickly and return its content as markdown. Use this for one-off scraping. For recurring scrapes with pagination, use the "scrape" tool instead.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to scrape (must be a valid HTTP/HTTPS URL)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'scrape',
        description:
          'Smart scraping tool that finds or creates a Recipe and executes it to return scraped data. Use this for multi-page scraping with pagination. Example: "scrape hackernews" will find/create a Hacker News recipe and execute it.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description:
                'Natural language description of what to scrape. Can be just a site name like "hackernews" or detailed like "Scrape 10 pages of Hacker News posts, get title, author, link"',
            },
            user_id: {
              type: 'string',
              description: 'Optional user ID (defaults to "default_user")',
            },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'create_recipe',
        description:
          'Create a scraping Recipe from natural language. AI will analyze your prompt to determine the URL, fields to extract, and pagination depth. Example: "Scrape 10 pages of Hacker News posts, get title, author, link, and comments"',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description:
                'Natural language description of what to scrape (URL, fields, pagination depth)',
            },
            user_id: {
              type: 'string',
              description: 'Optional user ID (defaults to "default_user")',
            },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'list_recipes',
        description:
          'List all scraping Recipes, optionally filtered by user. Shows Recipe names, URLs, fields, and pagination settings.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Optional user ID to filter Recipes',
            },
          },
        },
      },
      {
        name: 'get_recipe',
        description:
          'Get detailed information about a specific Recipe by ID, including the compiled Firecrawl configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            recipe_id: {
              type: 'string',
              description: 'Recipe ID (e.g., "recipe_abc123")',
            },
          },
          required: ['recipe_id'],
        },
      },
      {
        name: 'list_sources',
        description:
          'List all Sources (website scraping configurations). Shows analyzed pagination strategies, detected fields, and usage stats.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_source',
        description:
          'Get detailed information about a specific Source by ID, including pagination analysis and content structure.',
        inputSchema: {
          type: 'object',
          properties: {
            source_id: {
              type: 'string',
              description: 'Source ID (e.g., "source_abc123")',
            },
          },
          required: ['source_id'],
        },
      },
      {
        name: 'execute_recipe',
        description:
          'Execute a Recipe to start scraping. This runs the Recipe and returns an Execution ID that you can use to monitor progress. The execution runs asynchronously in the background.',
        inputSchema: {
          type: 'object',
          properties: {
            recipe_id: {
              type: 'string',
              description: 'Recipe ID to execute (e.g., "recipe_abc123")',
            },
            user_id: {
              type: 'string',
              description: 'Optional user ID (defaults to "default_user")',
            },
          },
          required: ['recipe_id'],
        },
      },
      {
        name: 'list_executions',
        description:
          'List all executions, optionally filtered by Recipe. Shows execution status, progress, and results.',
        inputSchema: {
          type: 'object',
          properties: {
            recipe_id: {
              type: 'string',
              description: 'Optional Recipe ID to filter executions',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of executions to return',
            },
          },
        },
      },
      {
        name: 'get_execution',
        description:
          'Get detailed information about a specific Execution, including real-time progress, logs, and results.',
        inputSchema: {
          type: 'object',
          properties: {
            execution_id: {
              type: 'string',
              description: 'Execution ID (e.g., "execution_abc123")',
            },
          },
          required: ['execution_id'],
        },
      },
      {
        name: 'list_datasets',
        description:
          'List all Datasets (stored scraping results), optionally filtered by Recipe. Shows dataset statistics and item counts.',
        inputSchema: {
          type: 'object',
          properties: {
            recipe_id: {
              type: 'string',
              description: 'Optional Recipe ID to filter datasets',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of datasets to return',
            },
          },
        },
      },
      {
        name: 'get_dataset',
        description:
          'Get a Dataset by ID and optionally retrieve its items. Returns dataset metadata and paginated items.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: {
              type: 'string',
              description: 'Dataset ID (e.g., "dataset_abc123")',
            },
            include_items: {
              type: 'boolean',
              description: 'Whether to include dataset items in the response (default: true)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['dataset_id'],
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'ping': {
      const message = (args?.message as string) || 'pong';
      return {
        content: [
          {
            type: 'text',
            text: `🏓 ${message}`,
          },
        ],
      };
    }

    case 'scrape_url': {
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
          const errorData = (await response
            .json()
            .catch(() => ({ error: 'Unknown error' }))) as any;
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
          data.markdown.substring(0, 2000) + (data.markdown.length > 2000 ? '...' : ''),
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

    case 'scrape': {
      const prompt = args?.prompt as string;
      const user_id = (args?.user_id as string) || 'default_user';

      if (!prompt) {
        throw new Error('Prompt is required');
      }

      try {
        // Step 1: List existing recipes to see if we have a match
        const listResponse = await fetch(`${API_BASE_URL}/api/recipes?user_id=${encodeURIComponent(user_id)}`);

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
            return promptLower.includes(nameLower) ||
                   nameLower.includes(promptLower) ||
                   promptLower.includes(urlLower) ||
                   urlLower.includes(promptLower);
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
            throw new Error(`Failed to create recipe: ${errorData.error?.message || createResponse.statusText}`);
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
          throw new Error(`Failed to execute recipe: ${errorData.error?.message || executeResponse.statusText}`);
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
          ...(data.pages || []).slice(0, 3).map((page: any, idx: number) => [
            ``,
            `**Page ${idx + 1}**: ${page.url || 'N/A'}`,
            page.markdown
              ? `\`\`\`\n${page.markdown.substring(0, 500)}${page.markdown.length > 500 ? '...' : ''}\n\`\`\``
              : 'No content',
          ]).flat(),
          ``,
          data.pages && data.pages.length > 3
            ? `... and ${data.pages.length - 3} more pages`
            : '',
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
        throw new Error(
          `Failed to scrape: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    case 'create_recipe': {
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
          const errorData = (await response
            .json()
            .catch(() => ({ error: 'Unknown error' }))) as any;
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

    case 'list_recipes': {
      const user_id = args?.user_id as string | undefined;

      try {
        const url = user_id
          ? `${API_BASE_URL}/api/recipes?user_id=${encodeURIComponent(user_id)}`
          : `${API_BASE_URL}/api/recipes`;

        const response = await fetch(url);

        if (!response.ok) {
          const errorData = (await response
            .json()
            .catch(() => ({ error: 'Unknown error' }))) as any;
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

    case 'get_recipe': {
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
          const errorData = (await response
            .json()
            .catch(() => ({ error: 'Unknown error' }))) as any;
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

    case 'list_sources': {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sources`);

        if (!response.ok) {
          const errorData = (await response
            .json()
            .catch(() => ({ error: 'Unknown error' }))) as any;
          throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
        }

        const result = (await response.json()) as any;
        const sources = result.data.sources;

        if (sources.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No Sources found. Sources are automatically created when you create a Recipe.',
              },
            ],
          };
        }

        const responseText = [
          `🗂️ Found ${sources.length} Source${sources.length === 1 ? '' : 's'}:`,
          ``,
          ...sources
            .map((s: any) => [
              `**${s.domain}** (${s.id})`,
              `  URL: ${s.url}`,
              `  Strategy: ${s.pagination?.strategy || 'none'}`,
              `  Confidence: ${s.pagination?.confidence || 'N/A'}`,
              `  Validation: ${s.validation?.status || 'N/A'}`,
              `  Recipes using this: ${s.usage_stats?.recipe_count || 0}`,
              `  Total scrapes: ${s.usage_stats?.total_scrapes || 0}`,
              `  Created: ${new Date(s.created_at).toLocaleString()}`,
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
        console.error('[MCP] List sources error:', error);
        throw new Error(
          `Failed to list sources: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    case 'get_source': {
      const source_id = args?.source_id as string;

      if (!source_id) {
        throw new Error('Source ID is required');
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/sources/${source_id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Source not found: ${source_id}`);
          }
          const errorData = (await response
            .json()
            .catch(() => ({ error: 'Unknown error' }))) as any;
          throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
        }

        const result = (await response.json()) as any;
        const source = result.data.source;

        const responseText = [
          `📦 Source Details: ${source.domain}`,
          ``,
          `**ID**: ${source.id}`,
          `**URL**: ${source.url}`,
          `**Domain**: ${source.domain}`,
          `**Canonical URL**: ${source.canonical_url}`,
          ``,
          `**Pagination**:`,
          `- Strategy: ${source.pagination?.strategy || 'none'}`,
          `- Confidence: ${source.pagination?.confidence || 'N/A'}`,
          source.pagination?.navigation_schema?.next_selector
            ? `- Selector: ${source.pagination.navigation_schema.next_selector}`
            : '',
          source.pagination?.navigation_schema?.href_template
            ? `- Template: ${source.pagination.navigation_schema.href_template}`
            : '',
          source.pagination?.ai_analysis?.description
            ? `- Analysis: ${source.pagination.ai_analysis.description}`
            : '',
          ``,
          `**Content Structure**:`,
          `- Items per page: ${source.content_structure?.items_per_page || 'N/A'}`,
          source.content_structure?.item_selector
            ? `- Item selector: ${source.content_structure.item_selector}`
            : '',
          source.content_structure?.typical_fields?.length
            ? `- Detected fields: ${source.content_structure.typical_fields.map((f: any) => f.name).join(', ')}`
            : '',
          ``,
          `**Validation**:`,
          `- Status: ${source.validation?.status || 'N/A'}`,
          `- Test runs: ${source.validation?.test_runs || 0}`,
          `- Success rate: ${source.validation?.success_rate ? (source.validation.success_rate * 100).toFixed(0) + '%' : 'N/A'}`,
          source.validation?.last_validated
            ? `- Last validated: ${new Date(source.validation.last_validated).toLocaleString()}`
            : '',
          ``,
          `**Usage Stats**:`,
          `- Recipes: ${source.usage_stats?.recipe_count || 0}`,
          `- Total scrapes: ${source.usage_stats?.total_scrapes || 0}`,
          source.usage_stats?.last_used
            ? `- Last used: ${new Date(source.usage_stats.last_used).toLocaleString()}`
            : '',
          ``,
          `**Sample Data**:`,
          source.sample?.sample_items?.length
            ? `- ${source.sample.sample_items.length} sample items available`
            : '- No sample data',
          ``,
          `**Created**: ${new Date(source.created_at).toLocaleString()}`,
          `**Updated**: ${new Date(source.updated_at).toLocaleString()}`,
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
        console.error('[MCP] Get source error:', error);
        throw new Error(
          `Failed to get source: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    case 'execute_recipe': {
      const recipe_id = args?.recipe_id as string;
      const user_id = (args?.user_id as string) || 'default_user';

      if (!recipe_id) {
        throw new Error('Recipe ID is required');
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/executions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ recipe_id, user_id }),
        });

        if (!response.ok) {
          const errorData = (await response
            .json()
            .catch(() => ({ error: 'Unknown error' }))) as any;
          throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
        }

        const result = (await response.json()) as any;
        const execution = result.data.execution;

        const responseText = [
          `✅ Execution started successfully!`,
          ``,
          `**Execution ID**: ${execution.id}`,
          `**Recipe ID**: ${execution.recipe_id}`,
          `**Status**: ${execution.status}`,
          `**Created**: ${new Date(execution.created_at).toLocaleString()}`,
          ``,
          `**Progress**:`,
          `- Pages scraped: ${execution.stats.pages_scraped}`,
          `- Items scraped: ${execution.stats.items_scraped}`,
          `- Errors: ${execution.stats.errors}`,
          ``,
          `The execution is running in the background. Use get_execution to monitor progress.`,
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
        console.error('[MCP] Execute recipe error:', error);
        throw new Error(
          `Failed to execute recipe: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    case 'list_executions': {
      const recipe_id = args?.recipe_id as string | undefined;
      const limit = args?.limit as number | undefined;

      try {
        let url = `${API_BASE_URL}/api/executions`;
        const params = new URLSearchParams();
        if (recipe_id) params.append('recipe_id', recipe_id);
        if (limit) params.append('limit', String(limit));
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url);

        if (!response.ok) {
          const errorData = (await response
            .json()
            .catch(() => ({ error: 'Unknown error' }))) as any;
          throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
        }

        const result = (await response.json()) as any;
        const executions = result.data.executions;

        if (executions.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: recipe_id
                  ? `No executions found for recipe: ${recipe_id}`
                  : 'No executions found. Execute a Recipe with the execute_recipe tool!',
              },
            ],
          };
        }

        const responseText = [
          `📊 Found ${executions.length} Execution${executions.length === 1 ? '' : 's'}${recipe_id ? ` for recipe: ${recipe_id}` : ''}:`,
          ``,
          ...executions
            .map((e: any) => [
              `**${e.recipe_name}** (${e.id})`,
              `  Status: ${e.status}`,
              `  Progress: ${e.stats.pages_scraped} pages, ${e.stats.items_scraped} items`,
              e.error ? `  Error: ${e.error}` : '',
              e.started_at ? `  Started: ${new Date(e.started_at).toLocaleString()}` : '',
              e.completed_at ? `  Completed: ${new Date(e.completed_at).toLocaleString()}` : '',
              ``,
            ])
            .flat()
            .filter(Boolean),
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
        console.error('[MCP] List executions error:', error);
        throw new Error(
          `Failed to list executions: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    case 'get_execution': {
      const execution_id = args?.execution_id as string;

      if (!execution_id) {
        throw new Error('Execution ID is required');
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/executions/${execution_id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Execution not found: ${execution_id}`);
          }
          const errorData = (await response
            .json()
            .catch(() => ({ error: 'Unknown error' }))) as any;
          throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
        }

        const result = (await response.json()) as any;
        const execution = result.data.execution;
        const logs = result.data.logs;

        const responseText = [
          `📈 Execution Details: ${execution.recipe_name}`,
          ``,
          `**ID**: ${execution.id}`,
          `**Recipe ID**: ${execution.recipe_id}`,
          `**Status**: ${execution.status}`,
          `**User ID**: ${execution.user_id}`,
          ``,
          `**Configuration**:`,
          `- Engine: ${execution.config.engine}`,
          `- Strategy: ${execution.config.limit_strategy}`,
          `- Pages: ${execution.config.page_count || 'N/A'}`,
          `- Items: ${execution.config.item_count || 'N/A'}`,
          `- URL: ${execution.config.base_url}`,
          ``,
          `**Progress**:`,
          `- Pages scraped: ${execution.stats.pages_scraped}`,
          `- Items scraped: ${execution.stats.items_scraped}`,
          `- Errors: ${execution.stats.errors}`,
          execution.stats.current_page ? `- Current page: ${execution.stats.current_page}` : '',
          ``,
          execution.dataset_id ? `**Dataset ID**: ${execution.dataset_id}` : '',
          execution.error ? `**Error**: ${execution.error}` : '',
          ``,
          execution.started_at ? `**Started**: ${new Date(execution.started_at).toLocaleString()}` : '',
          execution.completed_at ? `**Completed**: ${new Date(execution.completed_at).toLocaleString()}` : '',
          `**Created**: ${new Date(execution.created_at).toLocaleString()}`,
          `**Updated**: ${new Date(execution.updated_at).toLocaleString()}`,
          ``,
          logs.length > 0 ? `**Recent Logs** (${logs.length} entries):` : '',
          ...logs.slice(-10).map((log: any) =>
            `  [${log.severity.toUpperCase()}] ${log.message}`
          ),
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
        console.error('[MCP] Get execution error:', error);
        throw new Error(
          `Failed to get execution: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    case 'list_datasets': {
      const recipe_id = args?.recipe_id as string | undefined;
      const limit = args?.limit as number | undefined;

      try {
        let url = `${API_BASE_URL}/api/datasets`;
        const params = new URLSearchParams();
        if (recipe_id) params.append('recipe_id', recipe_id);
        if (limit) params.append('limit', String(limit));
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url);

        if (!response.ok) {
          const errorData = (await response
            .json()
            .catch(() => ({ error: 'Unknown error' }))) as any;
          throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
        }

        const result = (await response.json()) as any;
        const datasets = result.data.datasets;

        if (datasets.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: recipe_id
                  ? `No datasets found for recipe: ${recipe_id}`
                  : 'No datasets found. Datasets are created when you execute a Recipe.',
              },
            ],
          };
        }

        const responseText = [
          `📊 Found ${datasets.length} Dataset${datasets.length === 1 ? '' : 's'}${recipe_id ? ` for recipe: ${recipe_id}` : ''}:`,
          ``,
          ...datasets
            .map((d: any) => [
              `**Dataset ${d.id}**`,
              `  Recipe ID: ${d.recipe_id}`,
              `  Execution ID: ${d.execution_id}`,
              `  Items: ${d.stats.item_count}`,
              d.stats.first_scraped_at
                ? `  First scraped: ${new Date(d.stats.first_scraped_at).toLocaleString()}`
                : '',
              d.stats.last_scraped_at
                ? `  Last scraped: ${new Date(d.stats.last_scraped_at).toLocaleString()}`
                : '',
              `  Created: ${new Date(d.created_at).toLocaleString()}`,
              ``,
            ])
            .flat()
            .filter(Boolean),
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
        console.error('[MCP] List datasets error:', error);
        throw new Error(
          `Failed to list datasets: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    case 'get_dataset': {
      const dataset_id = args?.dataset_id as string;
      const include_items = (args?.include_items as boolean) !== false; // Default true
      const limit = (args?.limit as number) || 50;
      const offset = (args?.offset as number) || 0;

      if (!dataset_id) {
        throw new Error('Dataset ID is required');
      }

      try {
        // Get dataset metadata
        const datasetResponse = await fetch(`${API_BASE_URL}/api/datasets/${dataset_id}`);

        if (!datasetResponse.ok) {
          if (datasetResponse.status === 404) {
            throw new Error(`Dataset not found: ${dataset_id}`);
          }
          const errorData = (await datasetResponse
            .json()
            .catch(() => ({ error: 'Unknown error' }))) as any;
          throw new Error(`API error: ${errorData.error?.message || datasetResponse.statusText}`);
        }

        const datasetResult = (await datasetResponse.json()) as any;
        const dataset = datasetResult.data.dataset;

        let items: any[] = [];
        let total = 0;
        let hasMore = false;

        // Optionally get items
        if (include_items && dataset.stats.item_count > 0) {
          const itemsResponse = await fetch(
            `${API_BASE_URL}/api/datasets/${dataset_id}/items?limit=${limit}&offset=${offset}`
          );

          if (itemsResponse.ok) {
            const itemsResult = (await itemsResponse.json()) as any;
            items = itemsResult.data.items;
            total = itemsResult.data.pagination.total;
            hasMore = itemsResult.data.pagination.hasMore;
          }
        }

        const responseLines = [
          `📦 Dataset Details: ${dataset_id}`,
          ``,
          `**ID**: ${dataset.id}`,
          `**Recipe ID**: ${dataset.recipe_id}`,
          `**Execution ID**: ${dataset.execution_id}`,
          `**User ID**: ${dataset.user_id}`,
          ``,
          `**Statistics**:`,
          `- Total items: ${dataset.stats.item_count}`,
          dataset.stats.first_scraped_at
            ? `- First scraped: ${new Date(dataset.stats.first_scraped_at).toLocaleString()}`
            : '',
          dataset.stats.last_scraped_at
            ? `- Last scraped: ${new Date(dataset.stats.last_scraped_at).toLocaleString()}`
            : '',
          ``,
          `**Created**: ${new Date(dataset.created_at).toLocaleString()}`,
          `**Updated**: ${new Date(dataset.updated_at).toLocaleString()}`,
        ].filter(Boolean);

        if (include_items && items.length > 0) {
          responseLines.push(
            ``,
            `**Items** (showing ${offset + 1}-${offset + items.length} of ${total}):`,
            ``
          );

          items.forEach((item: any, idx: number) => {
            const itemLines = [
              `**Item ${offset + idx + 1}** (${item.id})`,
              item.source_url ? `  URL: ${item.source_url}` : '',
            ];

            // Show extracted fields (excluding _raw if present)
            const dataFields = Object.keys(item.data || {}).filter(k => k !== '_raw');
            if (dataFields.length > 0) {
              itemLines.push(`  **Data**:`);
              for (const field of dataFields) {
                const value = item.data[field];
                const displayValue = value !== null && value !== undefined
                  ? (typeof value === 'string' && value.length > 100
                      ? value.substring(0, 100) + '...'
                      : JSON.stringify(value))
                  : 'null';
                itemLines.push(`    - ${field}: ${displayValue}`);
              }
            }

            itemLines.push(`  Scraped: ${new Date(item.scraped_at).toLocaleString()}`, ``);
            responseLines.push(...itemLines);
          });

          if (hasMore) {
            responseLines.push(`... and ${total - (offset + items.length)} more items`);
          }
        } else if (include_items) {
          responseLines.push(``, `No items in this dataset.`);
        }

        return {
          content: [
            {
              type: 'text',
              text: responseLines.filter(Boolean).join('\n'),
            },
          ],
        };
      } catch (error) {
        console.error('[MCP] Get dataset error:', error);
        throw new Error(
          `Failed to get dataset: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error('Scraper MCP Server running on stdio');
  console.error('Ready to receive tool calls');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
