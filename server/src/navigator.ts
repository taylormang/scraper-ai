import puppeteer, { Browser, Page } from 'puppeteer';
import { AIExtractor } from './ai-extractor';

export class PageNavigator {
  private browser?: Browser;
  private aiExtractor: AIExtractor;

  constructor() {
    this.aiExtractor = new AIExtractor();
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
      console.log('🤖 Using AI to analyze page elements for navigation...');

      // Get all clickable elements from the page
      const clickableElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, button, span, div, input[type="button"], input[type="submit"]'));
        return elements
          .filter(el => {
            const style = window.getComputedStyle(el as Element);
            return style.display !== 'none' && style.visibility !== 'hidden';
          })
          .map((el, index) => ({
            index,
            tagName: el.tagName.toLowerCase(),
            textContent: el.textContent?.trim().substring(0, 100) || '[no text]',
            innerText: (el as any).innerText?.trim().substring(0, 100) || '[no inner text]',
            href: (el as any).href || '',
            id: el.id || '',
            className: el.className || '',
            outerHTML: el.outerHTML.substring(0, 300)
          }));
      });

      console.log(`📋 Found ${clickableElements.length} clickable elements`);

      // Debug: Show elements that contain "More" text to verify they're in our collection
      const moreElements = clickableElements.filter(el =>
        el.textContent.toLowerCase().includes('more') ||
        el.innerText.toLowerCase().includes('more')
      );
      console.log(`🔍 Elements containing "more": ${moreElements.length}`);
      moreElements.forEach((el, idx) => {
        console.log(`   ${idx}: <${el.tagName} class="${el.className}" href="${el.href}">TEXT:"${el.textContent}"</${el.tagName}>`);
      });

      // Use AI to determine which element to click
      const selector = await this.getClickSelector(clickableElements, navigationPrompt);

      if (!selector) {
        return { success: false, error: 'AI could not determine which element to click' };
      }

      console.log(`🎯 AI determined selector: ${selector}`);

      // Click the element
      const clickResult = await this.clickBySelector(page, selector);
      if (clickResult) {
        return { success: true };
      }

      return { success: false, error: 'Failed to click the determined element' };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown click error' };
    }
  }


  private async clickBySelector(page: Page, selector: string): Promise<boolean> {
    try {
      const element = await page.$(selector);
      if (element) {
        await element.click();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private async getClickSelector(elements: any[], navigationPrompt: string): Promise<string | null> {
    try {
      if (!this.aiExtractor) {
        throw new Error('AI extractor not available');
      }

      // Send all elements to AI, let token limits be the natural constraint
      const elementsInfo = elements.map(el => {
        let attrs = '';
        if (el.id) attrs += ` id="${el.id}"`;
        if (el.className) attrs += ` class="${el.className}"`;
        if (el.href) attrs += ` href="${el.href}"`;

        return `Element ${el.index}: <${el.tagName}${attrs}>TEXT:"${el.textContent}"</${el.tagName}>`;
      }).join('\n');

      const prompt = `
Navigation instruction: "${navigationPrompt}"

Available clickable elements on the page:
${elementsInfo}

Think step by step:

Step 1: Parse the instruction
What specific action does the user want me to perform? What text or element characteristics should I look for?

Step 2: Identify candidates
Scan through ALL elements listed above. For each element, ask:
- Does this element's TEXT content match what the user is asking for?
- Does this element seem like it would perform the requested navigation action?

Step 3: Exact matching
If the instruction contains quoted text (like "More"), look for elements whose text content EXACTLY matches that quoted text. List any exact matches you find.

Step 4: Evaluate candidates
For each potential candidate element, analyze:
- How well does the text content match the instruction?
- Do the element attributes (href, class) support that this is the right element?
- Would clicking this element logically perform the requested action?

Step 5: Make decision
Select the single best element that matches the user's instruction. If the user said 'click "More"', choose the element whose text is exactly "More".

Step 6: Generate CSS selector
Create the most specific CSS selector for your chosen element:
- If it has a unique class: ".classname"
- If it has an id: "#id"
- If it has a unique href: "a[href='exact-href']"
- Otherwise use the most specific combination

After completing all steps above, provide your final answer on a new line as:
SELECTOR: [your_css_selector_here]
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a web automation assistant. Use step-by-step reasoning to analyze the user\'s navigation instruction and find the HTML element that EXACTLY matches what they want to click. Show your reasoning for each step, then conclude with the CSS selector on a new line starting with "SELECTOR:".'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const fullResponse = result.choices[0]?.message?.content?.trim();

      if (!fullResponse) {
        console.log('🤖 AI did not provide a response');
        return null;
      }

      // Log the full reasoning for debugging
      console.log('🧠 AI reasoning:', fullResponse);

      // Extract selector from the response
      const selectorMatch = fullResponse.match(/SELECTOR:\s*(.+)/);
      const selector = selectorMatch ? selectorMatch[1].trim() : null;

      if (!selector || selector === 'NONE') {
        console.log('🤖 AI could not determine a suitable element to click');
        return null;
      }

      return selector;

    } catch (error) {
      console.log(`❌ AI selector determination failed: ${error}`);
      return null;
    }
  }
}