/**
 * Dataset tool handlers
 */

import { API_BASE_URL } from '../../config.js';
import { formatValue } from '../../utils/formatters.js';

export async function handleListDatasets(args: any) {
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
      const errorData = (await response.json().catch(() => ({ error: 'Unknown error' }))) as any;
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

export async function handleGetDataset(args: any) {
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
        const dataFields = Object.keys(item.data || {}).filter((k) => k !== '_raw');
        if (dataFields.length > 0) {
          itemLines.push(`  **Data**:`);
          for (const field of dataFields) {
            const value = item.data[field];
            const displayValue = formatValue(value, 100);
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
