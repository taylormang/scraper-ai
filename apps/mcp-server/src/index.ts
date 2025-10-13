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
 * Currently implements a simple 'ping' tool for testing
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'ping',
        description: 'Test tool that returns a pong message. Use this to verify the MCP server is working correctly.',
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
