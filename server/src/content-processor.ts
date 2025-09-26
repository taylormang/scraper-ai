import * as cheerio from 'cheerio';
import { Page } from 'puppeteer';
import { ElementInfo } from './prompt-builder';

export class ContentProcessor {
  /**
   * Clean HTML content for AI processing
   * Removes scripts, styles, ads, and other non-content elements
   * Normalizes whitespace and limits content length
   */
  static cleanForAI(html: string, maxLength: number = 25000): string {
    const $ = cheerio.load(html);

    // Remove scripts, styles, and other non-content elements
    $('script, style, nav, footer, header, .ads, .advertisement').remove();

    // Get clean text content
    const fullContent = $('body').text()
      .replace(/\s+/g, ' ')
      .trim();

    // Limit content length for API efficiency
    const cleanContent = fullContent.substring(0, maxLength);

    console.log(`📝 Original content length: ${fullContent.length} chars, Limited to: ${cleanContent.length} chars`);

    return cleanContent;
  }

  /**
   * Extract page title from HTML
   */
  static getPageTitle(html: string): string | undefined {
    const $ = cheerio.load(html);
    const title = $('title').text().trim();
    return title || undefined;
  }

  /**
   * Extract clickable elements from a page for AI analysis
   */
  static async extractElements(
    page: Page,
    selectors: string[] = ['a', 'button', 'span', 'div', 'input[type="button"]', 'input[type="submit"]']
  ): Promise<ElementInfo[]> {
    const elements = await page.evaluate((selectorList) => {
      const allElements = Array.from(document.querySelectorAll(selectorList.join(', ')));

      return allElements
        .filter(el => {
          const style = window.getComputedStyle(el as Element);
          return style.display !== 'none' && style.visibility !== 'hidden';
        })
        .map((el, index) => ({
          index,
          tagName: el.tagName.toLowerCase(),
          textContent: el.textContent?.trim().substring(0, 100) || '[no text]',
          innerText: (el as any).innerText?.trim().substring(0, 100) || '[no inner text]',
          href: el.getAttribute('href') || '',
          id: el.id || '',
          className: el.className || '',
          outerHTML: el.outerHTML.substring(0, 300)
        }));
    }, selectors);

    console.log(`📋 Found ${elements.length} clickable elements`);

    return elements;
  }

  /**
   * Extract elements containing specific text (for debugging navigation)
   */
  static async findElementsContainingText(page: Page, searchText: string): Promise<ElementInfo[]> {
    const allElements = await this.extractElements(page);

    const matchingElements = allElements.filter(el =>
      el.textContent.toLowerCase().includes(searchText.toLowerCase()) ||
      el.innerText.toLowerCase().includes(searchText.toLowerCase())
    );

    console.log(`🔍 Elements containing "${searchText}": ${matchingElements.length}`);
    matchingElements.forEach((el, idx) => {
      console.log(`   ${idx}: <${el.tagName} class="${el.className}" href="${el.href}">TEXT:"${el.textContent}"</${el.tagName}>`);
    });

    return matchingElements;
  }

  /**
   * Create a content sample for logging/debugging
   */
  static createContentSample(content: string, maxLength: number = 500): string {
    const sample = content.substring(0, maxLength);
    return sample + (content.length > maxLength ? '...' : '');
  }

  /**
   * Preprocess HTML for specific extraction types
   */
  static preprocessForExtraction(html: string, extractionType: 'content' | 'navigation' | 'clickthrough'): string {
    const $ = cheerio.load(html);

    switch (extractionType) {
      case 'content':
        // For content extraction, remove navigation, ads, etc. but keep main content
        $('nav, footer, header, .ads, .advertisement, .sidebar, .menu').remove();
        break;

      case 'navigation':
        // For navigation, keep navigation elements but remove heavy content
        $('article, .content, .post-content, .description').remove();
        break;

      case 'clickthrough':
        // For click-through, keep everything but remove scripts/styles
        $('script, style').remove();
        break;
    }

    return $.html() || '';
  }

  /**
   * Extract structured data about the page for metadata
   */
  static extractPageMetadata(html: string): {
    title?: string;
    description?: string;
    url?: string;
    lang?: string;
    contentLength: number;
  } {
    const $ = cheerio.load(html);

    return {
      title: $('title').text().trim() || undefined,
      description: $('meta[name="description"]').attr('content') || undefined,
      url: $('meta[property="og:url"]').attr('content') || $('link[rel="canonical"]').attr('href') || undefined,
      lang: $('html').attr('lang') || undefined,
      contentLength: html.length
    };
  }
}