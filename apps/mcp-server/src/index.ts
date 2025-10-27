#!/usr/bin/env node

/**
 * Scraper MCP Server
 *
 * MCP-first web scraping server that enables AI assistants to gather
 * and analyze web data through natural conversation.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { toolDefinitions } from './tools/definitions.js';
import {
  handlePing,
  handleScrapeUrl,
  handleScrape,
  handleCreateRecipe,
  handleListRecipes,
  handleGetRecipe,
  handleListSources,
  handleGetSource,
  handleExecuteRecipe,
  handleListExecutions,
  handleGetExecution,
  handleWaitForExecution,
  handleListDatasets,
  handleGetDataset,
} from './tools/handlers/index.js';

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
    tools: toolDefinitions,
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'ping':
      return await handlePing(args);

    case 'scrape_url':
      return await handleScrapeUrl(args);

    case 'scrape':
      return await handleScrape(args);

    case 'create_recipe':
      return await handleCreateRecipe(args);

    case 'list_recipes':
      return await handleListRecipes(args);

    case 'get_recipe':
      return await handleGetRecipe(args);

    case 'list_sources':
      return await handleListSources();

    case 'get_source':
      return await handleGetSource(args);

    case 'execute_recipe':
      return await handleExecuteRecipe(args);

    case 'list_executions':
      return await handleListExecutions(args);

    case 'get_execution':
      return await handleGetExecution(args);

    case 'wait_for_execution':
      return await handleWaitForExecution(args);

    case 'list_datasets':
      return await handleListDatasets(args);

    case 'get_dataset':
      return await handleGetDataset(args);

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
