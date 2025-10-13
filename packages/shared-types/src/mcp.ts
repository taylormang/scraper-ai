/**
 * Basic MCP (Model Context Protocol) types
 * These types define the structure of requests and responses for MCP tools
 */

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolRequest {
  name: string;
  arguments?: Record<string, any>;
}

export interface MCPTextContent {
  type: 'text';
  text: string;
}

export interface MCPToolResponse {
  content: MCPTextContent[];
  metadata?: Record<string, any>;
}

export interface MCPError {
  code: string;
  message: string;
  details?: any;
}
