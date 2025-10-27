/**
 * Field Extraction Service
 *
 * Extracts structured data from scraped content based on Recipe field definitions
 */

import OpenAI from 'openai';
import { config } from '../config/index.js';
import type { RecipeField } from '../types/recipe.js';

export class FieldExtractionService {
  private openai: OpenAI;

  constructor() {
    if (!config.services.openai) {
      throw new Error('OPENAI_API_KEY is required for field extraction');
    }
    this.openai = new OpenAI({ apiKey: config.services.openai });
  }

  /**
   * Extract multiple items from content (e.g., list of posts, products, articles)
   */
  async extractMultipleItems(
    content: string,
    fields: RecipeField[],
    context?: {
      url?: string;
      metadata?: any;
    }
  ): Promise<Record<string, any>[]> {
    // Build the schema description for the AI
    const fieldDescriptions = fields.map((field) => {
      const desc = `- ${field.name} (${field.type})${field.required ? ' *required*' : ''}`;
      if (field.default !== undefined) {
        return `${desc} [default: ${JSON.stringify(field.default)}]`;
      }
      return desc;
    });

    const prompt = `Extract ALL items from this content. Each item should have the following fields. Return ONLY valid JSON with no additional text.

Fields for each item:
${fieldDescriptions.join('\n')}

Content:
${content.substring(0, 12000)}

Return a JSON object with an "items" array containing ALL extracted items. Example format:
{
  "items": [
    { ${fields.map(f => `"${f.name}": "value"`).join(', ')} },
    { ${fields.map(f => `"${f.name}": "value"`).join(', ')} }
  ]
}

Extract ALL items you can find in the content.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction expert. Extract ALL structured items from content and return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const extractedData = JSON.parse(response.choices[0].message.content || '{"items":[]}');
      const items = extractedData.items || [];

      // Process each item: apply defaults and type coercion
      return items.map((item: any) => {
        const result: Record<string, any> = {};

        for (const field of fields) {
          let value = item[field.name];

          // Apply default if no value found
          if (value === undefined || value === null) {
            if (field.default !== undefined) {
              value = field.default;
            } else if (field.required) {
              value = this.getDefaultValueForType(field.type);
            }
          }

          // Type coercion
          if (value !== null && value !== undefined) {
            value = this.coerceType(value, field.type);
          }

          result[field.name] = value;
        }

        return result;
      });
    } catch (error) {
      console.error('[FieldExtractionService] Multi-item extraction error:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Extract structured fields from content (single item)
   */
  async extractFields(
    content: string,
    fields: RecipeField[],
    context?: {
      url?: string;
      metadata?: any;
    }
  ): Promise<Record<string, any>> {
    // Build the schema description for the AI
    const fieldDescriptions = fields.map((field) => {
      const desc = `- ${field.name} (${field.type})${field.required ? ' *required*' : ''}`;
      if (field.default !== undefined) {
        return `${desc} [default: ${JSON.stringify(field.default)}]`;
      }
      return desc;
    });

    const prompt = `Extract the following fields from this content. Return ONLY valid JSON with no additional text.

Fields to extract:
${fieldDescriptions.join('\n')}

Content:
${content.substring(0, 8000)}

Return a JSON object with the extracted field values. If a field is not found and not required, use the default value or null.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction expert. Extract structured data from content and return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const extractedData = JSON.parse(response.choices[0].message.content || '{}');

      // Apply defaults and type coercion
      const result: Record<string, any> = {};

      for (const field of fields) {
        let value = extractedData[field.name];

        // Apply default if no value found
        if (value === undefined || value === null) {
          if (field.default !== undefined) {
            value = field.default;
          } else if (field.required) {
            // For required fields with no value, try to use a sensible default
            value = this.getDefaultValueForType(field.type);
          }
        }

        // Type coercion
        if (value !== null && value !== undefined) {
          value = this.coerceType(value, field.type);
        }

        result[field.name] = value;
      }

      return result;
    } catch (error) {
      console.error('[FieldExtractionService] Extraction error:', error);

      // Return defaults/nulls on error
      const fallbackResult: Record<string, any> = {};
      for (const field of fields) {
        fallbackResult[field.name] = field.default !== undefined ? field.default : null;
      }
      return fallbackResult;
    }
  }

  /**
   * Get a sensible default value for a type
   */
  private getDefaultValueForType(type: string): any {
    switch (type) {
      case 'string':
      case 'url':
        return '';
      case 'number':
        return 0;
      case 'date':
        return new Date().toISOString();
      default:
        return null;
    }
  }

  /**
   * Coerce a value to the specified type
   */
  private coerceType(value: any, type: string): any {
    switch (type) {
      case 'string':
      case 'url':
        return String(value);
      case 'number':
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      case 'date':
        if (value instanceof Date) {
          return value.toISOString();
        }
        const date = new Date(value);
        return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
      default:
        return value;
    }
  }
}
