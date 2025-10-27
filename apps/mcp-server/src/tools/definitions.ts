/**
 * MCP Tool Definitions
 */

export const toolDefinitions = [
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
      'Get detailed information about a specific Execution, including real-time progress tracking with phase, percentage, and event timeline. Shows all progress events from scraping and extraction.',
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
    name: 'wait_for_execution',
    description:
      'Wait for an Execution to complete and return the resulting Dataset. This tool polls the execution status internally and blocks until completion (or timeout). Use this instead of repeatedly calling get_execution.',
    inputSchema: {
      type: 'object',
      properties: {
        execution_id: {
          type: 'string',
          description: 'Execution ID to wait for (e.g., "execution_abc123")',
        },
        timeout_seconds: {
          type: 'number',
          description: 'Maximum time to wait in seconds (default: 300, max: 600)',
        },
        poll_interval_seconds: {
          type: 'number',
          description: 'How often to check status in seconds (default: 3)',
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
];
