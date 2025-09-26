import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { ScraperConfig, ScrapedData, ScraperResult } from './types';
import { AIExtractor } from './ai-extractor';

export class BasicScraper {
  private config: ScraperConfig;
  private aiExtractor: AIExtractor;

  constructor(config: ScraperConfig) {
    this.config = config;
    this.aiExtractor = new AIExtractor();
  }

  async scrape(url: string): Promise<ScraperResult> {
    const startTime = Date.now();

    try {
      console.log(`🔍 Starting scrape of: ${url}`);

      // Fetch HTML content
      const response: AxiosResponse<string> = await axios.get(url, {
        headers: this.config.headers || {},
        timeout: this.config.timeout || 10000
      });

      console.log(`📡 HTTP ${response.status} - Content length: ${response.data.length}`);

      // Parse HTML with cheerio
      const $ = cheerio.load(response.data);
      const title = $('title').text().trim() || undefined;

      let content: any;

      // Choose extraction method
      if (this.config.extractionPrompt) {
        console.log('🤖 Using AI-powered extraction...');
        const aiResult = await this.aiExtractor.extractStructuredData(response.data, this.config.extractionPrompt);

        if (aiResult.success) {
          content = aiResult.data;
          console.log(`✅ AI extracted ${Array.isArray(content) ? content.length : 1} items`);
        } else {
          throw new Error(`AI extraction failed: ${aiResult.error}`);
        }
      } else {
        console.log('🔧 Using legacy selector-based extraction...');
        content = this.legacySelectorExtraction($);
      }

      const scrapedData: ScrapedData = {
        url,
        title,
        content,
        metadata: {
          scrapedAt: new Date(),
          source: this.config.name,
          success: true,
          duration: Date.now() - startTime
        }
      };

      const duration = Date.now() - startTime;
      console.log(`✅ Scrape completed in ${duration}ms`);

      return {
        success: true,
        data: scrapedData,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.log(`❌ Scrape failed after ${duration}ms: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }

  private legacySelectorExtraction($: cheerio.CheerioAPI): Record<string, any> {
    const content: Record<string, any> = {};

    if (!this.config.selectors) {
      return { message: 'No selectors or extraction prompt configured' };
    }

    for (const [key, selector] of Object.entries(this.config.selectors)) {
      const element = $(selector);
      if (element.length > 0) {
        content[key] = element.text().trim();
        console.log(`✅ Extracted ${key}: ${content[key].substring(0, 50)}${content[key].length > 50 ? '...' : ''}`);
      } else {
        console.log(`⚠️  Selector '${selector}' not found for ${key}`);
        content[key] = null;
      }
    }

    return content;
  }
}