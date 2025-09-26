import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { ScraperConfig, ScrapedData, ScraperResult } from './types';
import { AIExtractor } from './ai-extractor';
import { PageNavigator } from './navigator';

export class BasicScraper {
  private config: ScraperConfig;
  private aiExtractor: AIExtractor;
  private navigator?: PageNavigator;

  constructor(config: ScraperConfig) {
    this.config = config;
    this.aiExtractor = new AIExtractor();

    // Initialize navigator if multi-page scraping is needed
    if (this.config.navigationType && this.config.navigationType !== 'none') {
      this.navigator = new PageNavigator();
    }
  }

  async scrape(url: string): Promise<ScraperResult> {
    const startTime = Date.now();

    try {
      console.log(`🔍 Starting scrape of: ${url}`);

      const maxPages = this.config.maxPages || 2;
      const allContent: any[] = [];
      const urlsScraped: string[] = [];
      let currentUrl = url;
      let pageTitle: string | undefined;

      let browserPage: any = null;

      // Multi-page scraping loop
      for (let page = 1; page <= maxPages; page++) {
        console.log(`📄 Scraping page ${page} of ${maxPages}...`);

        let html: string;

        if (page === 1) {
          // First page - establish initial browser state if navigation needed
          if (this.navigator && this.config.navigationType !== 'none') {
            // Use browser for first page to maintain state for navigation
            const navResult = await this.navigator.getInitialPage(currentUrl);
            if (!navResult.success || !navResult.html) {
              throw new Error(`Failed to load initial page: ${navResult.error}`);
            }
            html = navResult.html;
            browserPage = navResult.page; // Keep reference to browser page
            urlsScraped.push(currentUrl);
            console.log(`📡 Browser initial load completed - Content length: ${html.length}`);
          } else {
            // Regular HTTP request for single-page or no-navigation configs
            const response: AxiosResponse<string> = await axios.get(currentUrl, {
              headers: this.config.headers || {},
              timeout: this.config.timeout || 10000
            });

            console.log(`📡 HTTP ${response.status} - Content length: ${response.data.length}`);
            html = response.data;
            urlsScraped.push(currentUrl);
          }
        } else {
          // Subsequent pages - use existing browser state for navigation
          if (!this.navigator || !browserPage) {
            console.log('⚠️  No browser state available for navigation');
            break;
          }

          const navResult = await this.navigator.navigateToNextPage(browserPage, this.config.navigationPrompt);
          if (!navResult.success || !navResult.html) {
            console.log(`⚠️  Navigation failed on page ${page}: ${navResult.error}`);
            break; // Stop scraping if navigation fails
          }
          html = navResult.html;

          // Get current URL from the page after navigation
          const pageUrl = await browserPage.url();
          urlsScraped.push(pageUrl);
          console.log(`📡 Navigation to page ${page} completed - Content length: ${html.length}`);
        }

        // Parse HTML with cheerio
        const $ = cheerio.load(html);
        if (page === 1) {
          pageTitle = $('title').text().trim() || undefined;
        }

        let pageContent: any;

        // Choose extraction method
        if (this.config.extractionPrompt) {
          console.log(`🤖 Using AI-powered extraction on page ${page}...`);
          const aiResult = await this.aiExtractor.extractStructuredData(html, this.config.extractionPrompt);

          if (aiResult.success) {
            pageContent = aiResult.data;
            console.log(`✅ AI extracted ${Array.isArray(pageContent) ? pageContent.length : 1} items from page ${page}`);
          } else {
            console.log(`⚠️  AI extraction failed on page ${page}: ${aiResult.error}`);
            continue; // Skip this page but continue with others
          }
        } else {
          console.log(`🔧 Using legacy selector-based extraction on page ${page}...`);
          pageContent = this.legacySelectorExtraction($);
        }

        // Add page content to results
        if (Array.isArray(pageContent)) {
          allContent.push(...pageContent);
        } else {
          allContent.push(pageContent);
        }

        // For button navigation, we need to continue from the same page state
        // The navigator handles clicking and getting the new content
      }

      // Clean up navigator
      if (this.navigator) {
        await this.navigator.closeBrowser();
      }

      const scrapedData: ScrapedData = {
        url,
        title: pageTitle,
        content: allContent,
        metadata: {
          scrapedAt: new Date(),
          source: this.config.name,
          success: true,
          duration: Date.now() - startTime,
          pagesScraped: urlsScraped.length,
          urlsScraped: urlsScraped,
          totalItems: allContent.length
        }
      };

      const duration = Date.now() - startTime;
      console.log(`✅ Multi-page scrape completed in ${duration}ms - ${allContent.length} total items from ${scrapedData.metadata.pagesScraped || 1} pages`);

      return {
        success: true,
        data: scrapedData,
        duration
      };

    } catch (error) {
      // Clean up navigator on error
      if (this.navigator) {
        await this.navigator.closeBrowser();
      }

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