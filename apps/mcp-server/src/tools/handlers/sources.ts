/**
 * Source tool handlers
 */

import { API_BASE_URL } from '../../config.js';

export async function handleListSources() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sources`);

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: 'Unknown error' }))) as any;
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

export async function handleGetSource(args: any) {
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
      const errorData = (await response.json().catch(() => ({ error: 'Unknown error' }))) as any;
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
