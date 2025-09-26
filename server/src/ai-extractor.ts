import * as cheerio from 'cheerio';
import { AIExtractionResult } from './types';

export class AIExtractor {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
  }

  async extractStructuredData(html: string, prompt: string): Promise<AIExtractionResult> {
    try {
      // Clean up HTML to just text content for the AI
      const $ = cheerio.load(html);

      // Remove scripts, styles, and other non-content elements
      $('script, style, nav, footer, header, .ads, .advertisement').remove();

      // Get clean text content
      const fullContent = $('body').text()
        .replace(/\s+/g, ' ')
        .trim();

      // Increase content limit for better extraction coverage
      const cleanContent = fullContent.substring(0, 25000); // Increased limit

      console.log(`📝 Original content length: ${fullContent.length} chars, Limited to: ${cleanContent.length} chars`);

      // Debug: Show a sample of what we're sending to AI
      console.log(`📋 Content sample (first 500 chars): ${cleanContent.substring(0, 500)}...`);

      if (!this.apiKey) {
        throw new Error('OpenAI API key is required for AI extraction. Please set OPENAI_API_KEY in your .env file.');
      }

      // Call OpenAI API to extract structured data
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a web scraping assistant. Extract structured data from web page content and return it as a JSON array. Be precise and only extract the requested information.'
            },
            {
              role: 'user',
              content: `Extract ALL instances of the following from this web page content. Do not stop early - make sure to process the entire content and extract every single item that matches the criteria:\n\n${prompt}\n\nWeb page content:\n${cleanContent}\n\nIMPORTANT: Extract EVERY item that matches the criteria. Do not limit yourself to a subset. Return the results as a JSON object with an "items" array containing ALL the extracted data.`
            }
          ],
          temperature: 0.1,
          max_tokens: 3000,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const extractedText = result.choices[0]?.message?.content?.trim();

      if (!extractedText) {
        throw new Error('Empty response from OpenAI API');
      }

      // Clean and parse the JSON response
      let cleanedText = extractedText;

      // Remove markdown code blocks if present
      if (extractedText.includes('```json')) {
        cleanedText = extractedText.replace(/```json\s*/g, '').replace(/\s*```/g, '');
      } else if (extractedText.includes('```')) {
        cleanedText = extractedText.replace(/```\s*/g, '').replace(/\s*```/g, '');
      }

      let extractedData;
      try {
        const parsedResult = JSON.parse(cleanedText);
        // Handle the new format with "items" array
        if (parsedResult.items && Array.isArray(parsedResult.items)) {
          extractedData = parsedResult.items;
        } else if (Array.isArray(parsedResult)) {
          extractedData = parsedResult;
        } else {
          extractedData = [parsedResult];
        }
      } catch (parseError) {
        console.log(`⚠️  Failed to parse AI response as JSON: ${cleanedText.substring(0, 200)}`);
        throw new Error('AI returned invalid JSON');
      }

      console.log(`🤖 AI extracted ${extractedData.length} items`);

      return {
        success: true,
        data: extractedData
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown AI extraction error';
      console.log(`❌ AI extraction failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

}