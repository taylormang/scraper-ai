import { AIExtractionResult } from './types';
import { AIService } from './ai-service';
import { PromptBuilder } from './prompt-builder';
import { ContentProcessor } from './content-processor';
import { ResultParser } from './result-parser';

export class AIExtractor {
  private aiService: AIService;

  constructor(apiKey?: string) {
    this.aiService = new AIService(apiKey);
  }

  async extractStructuredData(html: string, prompt: string): Promise<AIExtractionResult> {
    try {
      // Clean HTML content for AI processing
      const cleanContent = ContentProcessor.cleanForAI(html, 25000);

      // Debug: Show a sample of what we're sending to AI
      const contentSample = ContentProcessor.createContentSample(cleanContent, 500);
      console.log(`📋 Content sample (first 500 chars): ${contentSample}...`);

      // Create extraction prompt using template
      const messages = PromptBuilder.contentExtraction(prompt, cleanContent);

      // Call AI service with JSON response format
      const aiResponse = await this.aiService.chat(messages, {
        model: 'gpt-3.5-turbo',
        temperature: 0.1,
        maxTokens: 3000,
        responseFormat: 'json'
      });

      // Parse the extraction result
      const parseResult = ResultParser.parseExtractionResult(aiResponse.content, prompt);

      if (parseResult.success && parseResult.data) {
        console.log(`🤖 AI extracted ${parseResult.data.length} items`);

        return {
          success: true,
          data: parseResult.data
        };
      } else {
        console.log(`⚠️  Parsing failed: ${parseResult.error}`);
        throw new Error(parseResult.error || 'Failed to parse AI response');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown AI extraction error';
      console.log(`❌ AI extraction failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Health check for the AI service
   */
  async healthCheck(): Promise<boolean> {
    return this.aiService.healthCheck();
  }

  /**
   * Extract content from detail pages (for future click-through functionality)
   */
  async extractDetailContent(html: string, prompt: string): Promise<AIExtractionResult> {
    try {
      const cleanContent = ContentProcessor.cleanForAI(html, 15000); // Smaller limit for detail pages
      const messages = PromptBuilder.clickThroughExtraction(cleanContent, prompt);

      const aiResponse = await this.aiService.chat(messages, {
        model: 'gpt-3.5-turbo',
        temperature: 0.1,
        maxTokens: 2000,
        responseFormat: 'json'
      });

      const parseResult = ResultParser.parseExtractionResult(aiResponse.content, prompt);

      if (parseResult.success && parseResult.data) {
        // For detail pages, we return the parsed data as is (it's already an array)
        return {
          success: true,
          data: parseResult.data
        };
      } else {
        throw new Error(parseResult.error || 'Failed to parse detail extraction response');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown detail extraction error';
      console.log(`❌ Detail extraction failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}