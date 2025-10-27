/**
 * Execution tool handlers
 */

import { API_BASE_URL } from '../../config.js';
import { formatEventIcon, formatValue } from '../../utils/formatters.js';

export async function handleExecuteRecipe(args: any) {
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
      const errorData = (await response.json().catch(() => ({ error: 'Unknown error' }))) as any;
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

export async function handleListExecutions(args: any) {
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
      const errorData = (await response.json().catch(() => ({ error: 'Unknown error' }))) as any;
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

export async function handleGetExecution(args: any) {
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
      const errorData = (await response.json().catch(() => ({ error: 'Unknown error' }))) as any;
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
      `**Progress**: ${execution.progress?.percentage || 0}% (${execution.progress?.phase || 'unknown'})`,
      execution.progress?.current_page
        ? `- Current page: ${execution.progress.current_page}/${execution.progress.total_pages || '?'}`
        : '',
      execution.progress?.items_count !== undefined
        ? `- Items extracted: ${execution.progress.items_count}`
        : '',
      ``,
      execution.events && execution.events.length > 0 ? `**Progress Events**:` : '',
      ...(execution.events || []).map((event: any) => {
        const timestamp = new Date(event.timestamp).toLocaleTimeString();
        const icon = formatEventIcon(event.type);
        return `  [${timestamp}] ${icon} ${event.message}`;
      }),
      ``,
      execution.dataset_id ? `**Dataset ID**: ${execution.dataset_id}` : '',
      execution.error ? `**Error**: ${execution.error}` : '',
      ``,
      execution.started_at
        ? `**Started**: ${new Date(execution.started_at).toLocaleString()}`
        : '',
      execution.completed_at
        ? `**Completed**: ${new Date(execution.completed_at).toLocaleString()}`
        : '',
      `**Created**: ${new Date(execution.created_at).toLocaleString()}`,
      `**Updated**: ${new Date(execution.updated_at).toLocaleString()}`,
      ``,
      logs.length > 0 ? `**Debug Logs** (${logs.length} most recent):` : '',
      ...logs.slice(-10).map((log: any) => `  [${log.severity.toUpperCase()}] ${log.message}`),
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

export async function handleWaitForExecution(args: any) {
  const execution_id = args?.execution_id as string;
  const timeout_seconds = Math.min((args?.timeout_seconds as number) || 300, 600);
  const poll_interval_seconds = (args?.poll_interval_seconds as number) || 3;

  if (!execution_id) {
    throw new Error('Execution ID is required');
  }

  try {
    const startTime = Date.now();
    const timeoutMs = timeout_seconds * 1000;
    const pollIntervalMs = poll_interval_seconds * 1000;

    // Helper to sleep
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Poll until complete or timeout
    while (true) {
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Timeout waiting for execution after ${timeout_seconds} seconds`);
      }

      // Get execution status
      const response = await fetch(`${API_BASE_URL}/api/executions/${execution_id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Execution not found: ${execution_id}`);
        }
        const errorData = (await response.json().catch(() => ({ error: 'Unknown error' }))) as any;
        throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
      }

      const result = (await response.json()) as any;
      const execution = result.data.execution;

      // Check if completed
      if (execution.status === 'completed') {
        // Get the dataset
        if (!execution.dataset_id) {
          throw new Error('Execution completed but no dataset was created');
        }

        const datasetResponse = await fetch(
          `${API_BASE_URL}/api/datasets/${execution.dataset_id}/items?limit=50`
        );

        if (!datasetResponse.ok) {
          throw new Error('Failed to fetch dataset items');
        }

        const datasetResult = (await datasetResponse.json()) as any;
        const items = datasetResult.data.items;
        const pagination = datasetResult.data.pagination;

        const responseText = [
          `✅ Execution completed successfully!`,
          ``,
          `**Execution ID**: ${execution.id}`,
          `**Dataset ID**: ${execution.dataset_id}`,
          `**Recipe**: ${execution.recipe_name || execution.recipe_id}`,
          ``,
          `**Results**:`,
          `- Phase: ${execution.progress?.phase || 'complete'}`,
          `- Progress: ${execution.progress?.percentage || 100}%`,
          `- Items extracted: ${execution.progress?.items_count || execution.stats.items_scraped}`,
          `- Pages scraped: ${execution.stats.pages_scraped}`,
          ``,
          `**Dataset** (showing ${Math.min(items.length, 50)} of ${pagination.total} items):`,
          ``,
          ...items.slice(0, 10).map((item: any, idx: number) => {
            const dataFields = Object.keys(item.data || {}).filter((k) => k !== '_raw');
            const preview = dataFields
              .map((field) => {
                const value = item.data[field];
                const displayValue = formatValue(value, 60);
                return `    ${field}: ${displayValue}`;
              })
              .join('\n');
            return [`**Item ${idx + 1}**:`, preview, ``].join('\n');
          }),
          items.length > 10 ? `... and ${items.length - 10} more items` : '',
          pagination.total > 50
            ? `\n(Use get_dataset to view all ${pagination.total} items)`
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
      } else if (execution.status === 'failed') {
        throw new Error(`Execution failed: ${execution.error || 'Unknown error'}`);
      } else if (execution.status === 'cancelled') {
        throw new Error('Execution was cancelled');
      }

      // Still running, wait and poll again
      await sleep(pollIntervalMs);
    }
  } catch (error) {
    console.error('[MCP] Wait for execution error:', error);
    throw new Error(
      `Failed to wait for execution: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
