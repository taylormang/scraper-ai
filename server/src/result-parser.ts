export class ResultParser {
  /**
   * Parse JSON response from AI, handling various formats and markdown cleaning
   */
  static parseJSONResponse<T>(response: string): T[] {
    let cleanedText = response.trim();

    // Remove markdown code blocks if present
    if (response.includes('```json')) {
      cleanedText = response.replace(/```json\s*/g, '').replace(/\s*```/g, '');
    } else if (response.includes('```')) {
      cleanedText = response.replace(/```\s*/g, '').replace(/\s*```/g, '');
    }

    try {
      const parsedResult = JSON.parse(cleanedText);

      // Handle different response formats
      if (parsedResult.items && Array.isArray(parsedResult.items)) {
        // New format with "items" array
        return parsedResult.items;
      } else if (Array.isArray(parsedResult)) {
        // Direct array format
        return parsedResult;
      } else {
        // Single object format
        return [parsedResult];
      }
    } catch (parseError) {
      const preview = cleanedText.substring(0, 200);
      throw new Error(`Failed to parse AI response as JSON. Response preview: ${preview}`);
    }
  }

  /**
   * Extract CSS selector from AI response
   */
  static parseSelectorResponse(response: string): string | null {
    // Extract selector from the response
    const selectorMatch = response.match(/SELECTOR:\s*(.+)/);
    const selector = selectorMatch ? selectorMatch[1].trim() : null;

    if (!selector || selector === 'NONE' || selector.toLowerCase() === 'none') {
      return null;
    }

    return selector;
  }

  /**
   * Parse and validate extraction result with error context
   */
  static parseExtractionResult<T>(response: string, prompt: string): {
    success: boolean;
    data?: T[];
    error?: string;
    metadata?: {
      originalLength: number;
      cleanedLength: number;
      itemCount?: number;
    };
  } {
    try {
      const data = this.parseJSONResponse<T>(response);

      return {
        success: true,
        data,
        metadata: {
          originalLength: response.length,
          cleanedLength: response.replace(/```(json)?\s*/g, '').replace(/\s*```/g, '').length,
          itemCount: data.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown parsing error',
        metadata: {
          originalLength: response.length,
          cleanedLength: response.replace(/```(json)?\s*/g, '').replace(/\s*```/g, '').length
        }
      };
    }
  }

  /**
   * Parse navigation result with debugging information
   */
  static parseNavigationResult(response: string, instruction: string): {
    success: boolean;
    selector?: string;
    reasoning?: string;
    error?: string;
  } {
    try {
      const selector = this.parseSelectorResponse(response);

      if (!selector) {
        return {
          success: false,
          error: 'AI could not determine a suitable element to click',
          reasoning: response
        };
      }

      return {
        success: true,
        selector,
        reasoning: response
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown navigation parsing error',
        reasoning: response
      };
    }
  }

  /**
   * Validate that parsed data matches expected structure
   */
  static validateExtractionStructure<T>(
    data: T[],
    requiredFields: string[] = [],
    maxItems?: number
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!Array.isArray(data)) {
      issues.push('Data is not an array');
      return { isValid: false, issues };
    }

    if (data.length === 0) {
      issues.push('No items extracted');
    }

    if (maxItems && data.length > maxItems) {
      issues.push(`Too many items extracted: ${data.length} > ${maxItems}`);
    }

    // Validate required fields in each item
    if (requiredFields.length > 0 && data.length > 0) {
      const sampleItem = data[0] as any;
      const missingFields = requiredFields.filter(field => !(field in sampleItem));

      if (missingFields.length > 0) {
        issues.push(`Missing required fields in extracted data: ${missingFields.join(', ')}`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Clean and normalize text content from extractions
   */
  static cleanTextContent(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\r\n\t]/g, ' ') // Remove line breaks and tabs
      .trim();
  }

  /**
   * Extract error details from failed API responses
   */
  static parseErrorResponse(errorText: string): {
    type: 'api_error' | 'rate_limit' | 'auth_error' | 'unknown';
    message: string;
    retryable: boolean;
  } {
    const lowerText = errorText.toLowerCase();

    if (lowerText.includes('rate limit') || lowerText.includes('429')) {
      return {
        type: 'rate_limit',
        message: 'API rate limit exceeded',
        retryable: true
      };
    }

    if (lowerText.includes('unauthorized') || lowerText.includes('401')) {
      return {
        type: 'auth_error',
        message: 'Authentication failed - check API key',
        retryable: false
      };
    }

    if (lowerText.includes('400') || lowerText.includes('bad request')) {
      return {
        type: 'api_error',
        message: 'Invalid request to AI API',
        retryable: false
      };
    }

    return {
      type: 'unknown',
      message: errorText,
      retryable: true
    };
  }
}