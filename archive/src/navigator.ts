import puppeteer, { Browser, Page } from 'puppeteer';
import { AIService } from './ai-service';
import { PromptBuilder } from './prompt-builder';
import { ContentProcessor } from './content-processor';
import { ResultParser } from './result-parser';
import { NavigationPatternCache } from './navigation-pattern-cache';

export class PageNavigator {
  private browser?: Browser;
  private aiService: AIService;
  private navigationCache: NavigationPatternCache;

  constructor(apiKey?: string) {
    this.aiService = new AIService(apiKey);
    this.navigationCache = new NavigationPatternCache();
  }

  async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      console.log('🌐 Browser initialized');
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
      console.log('🌐 Browser closed');
    }
  }

  async getInitialPage(url: string): Promise<{ success: boolean; html?: string; page?: Page; error?: string }> {
    try {
      await this.initBrowser();
      if (!this.browser) throw new Error('Browser not initialized');

      const page = await this.browser.newPage();

      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      console.log(`🔗 Loading initial page: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Get initial page HTML
      const html = await page.content();

      return { success: true, html, page };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown navigation error';
      console.log(`❌ Initial page load failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  async navigateToNextPage(page: Page, navigationPrompt?: string): Promise<{ success: boolean; html?: string; error?: string }> {
    try {
      if (!navigationPrompt) {
        return { success: false, error: 'No navigation prompt provided' };
      }

      console.log(`🔍 Looking for navigation element: "${navigationPrompt}"`);

      // Get current content for comparison
      const oldContent = await page.content();
      const oldLength = oldContent.length;

      const navigationResult = await this.findAndClickElement(page, navigationPrompt);
      if (navigationResult.success) {
        console.log('✅ Successfully clicked navigation element, waiting for new content...');

        // Wait for content to change
        let attempts = 0;
        const maxAttempts = 10;
        let newContent = oldContent;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          newContent = await page.content();

          // Check if content has actually changed
          if (newContent.length !== oldLength || newContent !== oldContent) {
            console.log(`📄 Content changed! Old: ${oldLength} chars, New: ${newContent.length} chars`);
            break;
          }

          attempts++;
          console.log(`⏳ Waiting for content change... attempt ${attempts}/${maxAttempts}`);
        }

        if (attempts >= maxAttempts) {
          console.log('⚠️  Content didn\'t change after navigation, returning anyway');
        }

        return { success: true, html: newContent };
      } else {
        return { success: false, error: `Navigation failed: ${navigationResult.error}` };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown navigation error';
      console.log(`❌ Navigation to next page failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  private async findAndClickElement(page: Page, navigationPrompt: string): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUrl = page.url();
      const domain = new URL(currentUrl).hostname;

      // Step 1: Try cached navigation pattern first
      console.log('🔍 Checking for cached navigation pattern...');
      const cachedPattern = await this.navigationCache.getCachedPattern(page, domain, navigationPrompt);

      if (cachedPattern) {
        console.log(`⚡ Attempting cached navigation: ${cachedPattern.selector}`);
        const cachedClickResult = await this.clickBySelector(page, cachedPattern.selector);

        if (cachedClickResult) {
          console.log('✅ Cached navigation pattern worked!');
          return { success: true };
        } else {
          console.log('❌ Cached pattern failed, falling back to AI analysis...');
          // Pattern failed, it will be removed from cache by the getCachedPattern method
        }
      }

      // Step 2: Fall back to AI analysis
      console.log('🤖 Using AI to analyze page elements for navigation...');

      // Extract clickable elements using ContentProcessor
      const clickableElements = await ContentProcessor.extractElements(page);

      // Debug: Show elements that contain specific text
      if (navigationPrompt.toLowerCase().includes('more')) {
        await ContentProcessor.findElementsContainingText(page, 'more');
      }

      // Use AI to determine which element to click
      const selector = await this.getClickSelector(clickableElements, navigationPrompt);

      if (!selector) {
        return { success: false, error: 'AI could not determine which element to click' };
      }

      console.log(`🎯 AI determined selector: ${selector}`);

      // Click the element
      const clickResult = await this.clickBySelector(page, selector);
      if (clickResult) {
        // Step 3: Cache the successful pattern for future use
        console.log('💾 Caching successful navigation pattern...');
        await this.navigationCache.storePattern(page, domain, navigationPrompt, selector);

        return { success: true };
      }

      return { success: false, error: 'Failed to click the determined element' };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown click error' };
    }
  }


  private async clickBySelector(page: Page, selector: string): Promise<boolean> {
    try {
      console.log(`🎯 Attempting to click selector: ${selector}`);

      // Wait for element to be available
      await page.waitForSelector(selector, { timeout: 5000 });

      // Check if element exists and is visible
      const element = await page.$(selector);
      if (!element) {
        console.log(`❌ Element not found: ${selector}`);
        return false;
      }

      // Check if element is visible and clickable
      const isVisible = await element.isIntersectingViewport();
      if (!isVisible) {
        console.log(`⚠️  Element not visible, scrolling into view: ${selector}`);
        await element.scrollIntoView();
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait a bit after scrolling
      }

      // Try to click the element
      await element.click();
      console.log(`✅ Successfully clicked: ${selector}`);
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown click error';
      console.log(`❌ Click failed for ${selector}: ${errorMessage}`);

      // Try alternative clicking method
      try {
        console.log(`🔄 Trying alternative click method for: ${selector}`);
        await page.click(selector);
        console.log(`✅ Alternative click succeeded: ${selector}`);
        return true;
      } catch (altError) {
        console.log(`❌ Alternative click also failed: ${altError instanceof Error ? altError.message : 'Unknown error'}`);
        return false;
      }
    }
  }

  private async getClickSelector(elements: any[], navigationPrompt: string): Promise<string | null> {
    try {
      // Create element selection prompt using template
      const messages = PromptBuilder.elementSelection(elements, navigationPrompt);

      // Call AI service
      const aiResponse = await this.aiService.chat(messages, {
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 800,
        responseFormat: 'text'
      });

      // Log the full reasoning for debugging
      console.log('🧠 AI reasoning:', aiResponse.content);

      // Parse navigation result
      const navResult = ResultParser.parseNavigationResult(aiResponse.content, navigationPrompt);

      if (navResult.success && navResult.selector) {
        return navResult.selector;
      } else {
        console.log(`🤖 AI could not determine a suitable element to click: ${navResult.error}`);
        return null;
      }

    } catch (error) {
      console.log(`❌ AI selector determination failed: ${error}`);
      return null;
    }
  }

  /**
   * Get navigation cache statistics
   */
  getCacheStats() {
    return this.navigationCache.getCacheStats();
  }

  /**
   * Clear the navigation cache (useful for testing)
   */
  clearNavigationCache(): void {
    this.navigationCache.clearCache();
  }

  /**
   * Clean up expired navigation patterns
   */
  cleanupExpiredPatterns(maxAgeInDays: number = 30): number {
    return this.navigationCache.cleanupExpiredPatterns(maxAgeInDays);
  }
}