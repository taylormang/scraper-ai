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
      {
        name: 'scrape_url',
        description: 'Scrape a URL and return its content as markdown and HTML. Perfect for extracting content from any webpage.',
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
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as any;
          throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
        }

        const result = await response.json() as any;
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
