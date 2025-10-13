# MCP Client Setup Guide

How to connect MCP clients like Claude Desktop to your local scraper MCP server.

## Claude Desktop Setup (Recommended)

### Prerequisites

- Claude Desktop app installed ([download here](https://claude.ai/download))
- MCP server built and working: `npm run build`

### Configuration

1. **Locate the Claude Desktop config file:**

   **macOS:**
   ```bash
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

   **Windows:**
   ```bash
   %APPDATA%\Claude\claude_desktop_config.json
   ```

   **Linux:**
   ```bash
   ~/.config/Claude/claude_desktop_config.json
   ```

2. **Edit the config file:**

   If the file doesn't exist, create it. Add the following configuration:

   ```json
   {
     "mcpServers": {
       "scraper": {
         "command": "npm",
         "args": ["run", "dev", "-w", "apps/mcp-server"],
         "cwd": "/absolute/path/to/scraper"
       }
     }
   }
   ```

   **⚠️ Important:** Replace `/absolute/path/to/scraper` with the actual absolute path to your scraper directory.

   **Example:**
   ```json
   {
     "mcpServers": {
       "scraper": {
         "command": "npm",
         "args": ["run", "dev", "-w", "apps/mcp-server"],
         "cwd": "/Users/taylormcmanus/Repos/scraper"
       }
     }
   }
   ```

3. **Restart Claude Desktop**

   Completely quit and restart Claude Desktop for the changes to take effect.

### Verifying the Connection

1. **Check Claude Desktop logs:**

   Claude Desktop will show MCP server status in the bottom-right corner. Look for:
   - 🟢 Green indicator = Connected
   - 🔴 Red indicator = Error

2. **Test with the ping tool:**

   In a new conversation with Claude:

   ```
   You: Use the ping tool

   Claude: [Calls the ping tool]
   Response: 🏓 pong
   ```

   Or with a custom message:

   ```
   You: Use the ping tool with message "hello world"

   Claude: [Calls the ping tool]
   Response: 🏓 hello world
   ```

3. **List available tools:**

   Ask Claude:
   ```
   You: What MCP tools do you have available?

   Claude: I have access to the following tools from the scraper MCP server:
   - ping: Test tool that returns a pong message
   ```

## Production Mode Setup

For production usage (built code instead of hot reload):

```json
{
  "mcpServers": {
    "scraper": {
      "command": "node",
      "args": ["/absolute/path/to/scraper/apps/mcp-server/dist/index.js"]
    }
  }
}
```

**Note:** You'll need to rebuild after code changes:
```bash
npm run build
```

## Alternative: Using MCP Inspector

The MCP Inspector is a testing tool for MCP servers without needing Claude Desktop.

### Installation

```bash
npm install -g @modelcontextprotocol/inspector
```

### Usage

1. **Start your MCP server:**
   ```bash
   npm run dev -w apps/mcp-server
   ```

2. **In another terminal, run the inspector:**
   ```bash
   mcp-inspector
   ```

3. **Configure the inspector:**
   - Server Command: `npm`
   - Server Args: `run dev -w apps/mcp-server`
   - Working Directory: `/absolute/path/to/scraper`

4. **Test tools:**
   - Click "Connect"
   - View available tools in the left panel
   - Call tools and see responses in the right panel

## Troubleshooting

### Claude Desktop not showing tools

**Problem:** Claude doesn't see the MCP tools or shows connection errors.

**Solutions:**

1. **Check the config path is correct:**
   ```bash
   # macOS - verify file exists
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Verify absolute path is correct:**
   ```bash
   # Get your current directory
   pwd
   # Should output something like: /Users/yourname/Repos/scraper
   ```

3. **Check for JSON syntax errors:**
   Use a JSON validator or try:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool
   ```

4. **Verify the server runs standalone:**
   ```bash
   cd /absolute/path/to/scraper
   npm run dev -w apps/mcp-server
   ```
   You should see:
   ```
   Scraper MCP Server running on stdio
   Ready to receive tool calls
   ```

5. **Check Claude Desktop logs:**

   **macOS:**
   ```bash
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```

   **Windows:**
   ```
   %APPDATA%\Claude\logs\mcp*.log
   ```

### Server starts but tools don't work

**Problem:** Server connects but tool calls fail.

**Solutions:**

1. **Check the server output for errors:**
   Tools should output errors to stderr (visible in logs)

2. **Verify TypeScript compilation:**
   ```bash
   npm run build
   npm run typecheck
   ```

3. **Test manually:**
   ```bash
   npm run dev -w apps/mcp-server
   # Should start without errors
   ```

### Permission errors

**Problem:** `EACCES` or permission denied errors.

**Solutions:**

1. **Ensure dependencies are installed:**
   ```bash
   npm install
   ```

2. **Check file permissions:**
   ```bash
   ls -la apps/mcp-server/dist/index.js
   # Should be readable
   ```

### Module not found errors

**Problem:** Cannot find module errors when starting.

**Solutions:**

1. **Rebuild the project:**
   ```bash
   npm run clean
   npm install
   npm run build
   ```

2. **Verify workspace structure:**
   ```bash
   npm ls @scraper/shared-types -w apps/mcp-server
   # Should show the package is linked
   ```

## Advanced Configuration

### Environment Variables

Pass environment variables to the MCP server:

```json
{
  "mcpServers": {
    "scraper": {
      "command": "npm",
      "args": ["run", "dev", "-w", "apps/mcp-server"],
      "cwd": "/absolute/path/to/scraper",
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Multiple MCP Servers

You can run multiple MCP servers simultaneously:

```json
{
  "mcpServers": {
    "scraper": {
      "command": "npm",
      "args": ["run", "dev", "-w", "apps/mcp-server"],
      "cwd": "/absolute/path/to/scraper"
    },
    "other-server": {
      "command": "node",
      "args": ["/path/to/other-server.js"]
    }
  }
}
```

Claude will have access to tools from all configured servers.

## Development Tips

### Hot Reload

When using dev mode (`npm run dev`), the server automatically reloads on code changes:

1. Make changes to `apps/mcp-server/src/index.ts`
2. Save the file
3. tsx will automatically restart the server
4. **Important:** You'll need to restart Claude Desktop to reconnect

### Viewing Server Logs

Server logs go to stderr, which Claude Desktop captures:

**macOS:**
```bash
# Watch logs in real-time
tail -f ~/Library/Logs/Claude/mcp-server-scraper.log
```

**Add debug logging to your server:**
```typescript
// In apps/mcp-server/src/index.ts
console.error('Debug:', someValue);  // Goes to stderr/logs
```

### Testing Without Claude Desktop

Use the MCP Inspector or write a simple test client:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'npm',
  args: ['run', 'dev', '-w', 'apps/mcp-server'],
  cwd: '/absolute/path/to/scraper'
});

const client = new Client({
  name: 'test-client',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);
const result = await client.callTool({ name: 'ping' });
console.log(result);  // { content: [{ type: 'text', text: '🏓 pong' }] }
```

## Getting Help

If you're still having issues:

1. Check the [MCP documentation](https://modelcontextprotocol.io)
2. Verify your setup matches `/docs/technical_architecture.md`
3. Test the server runs standalone: `npm run dev -w apps/mcp-server`
4. Check Claude Desktop logs for specific error messages

## See Also

- `/apps/mcp-server/README.md` - MCP server documentation
- `/docs/technical_architecture.md` - Technical details
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Claude Desktop Documentation](https://claude.ai/docs)
