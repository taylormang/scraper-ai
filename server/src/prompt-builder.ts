import { ChatMessage } from './ai-service';

export interface ElementInfo {
  index: number;
  tagName: string;
  textContent: string;
  innerText: string;
  href: string;
  id: string;
  className: string;
  outerHTML: string;
}

export class PromptBuilder {
  /**
   * Create content extraction prompt for structured data extraction from web pages
   */
  static contentExtraction(userPrompt: string, content: string): ChatMessage[] {
    return [
      {
        role: 'system',
        content: 'You are a web scraping assistant. Extract structured data from web page content and return it as a JSON array. Be precise and only extract the requested information.'
      },
      {
        role: 'user',
        content: `Extract ALL instances of the following from this web page content. Do not stop early - make sure to process the entire content and extract every single item that matches the criteria:\n\n${userPrompt}\n\nWeb page content:\n${content}\n\nIMPORTANT: Extract EVERY item that matches the criteria. Do not limit yourself to a subset. Return the results as a JSON object with an "items" array containing ALL the extracted data.`
      }
    ];
  }

  /**
   * Create element selection prompt for finding clickable elements on a page
   */
  static elementSelection(elements: ElementInfo[], instruction: string): ChatMessage[] {
    const elementsInfo = elements.map(el => {
      let attrs = '';
      if (el.id) attrs += ` id="${el.id}"`;
      if (el.className) attrs += ` class="${el.className}"`;
      if (el.href) attrs += ` href="${el.href}"`;

      return `Element ${el.index}: <${el.tagName}${attrs}>TEXT:"${el.textContent}"</${el.tagName}>`;
    }).join('\n');

    return [
      {
        role: 'system',
        content: 'You are a web automation assistant. Use step-by-step reasoning to analyze the user\'s navigation instruction and find the HTML element that EXACTLY matches what they want to click. Show your reasoning for each step, then conclude with the CSS selector on a new line starting with "SELECTOR:".'
      },
      {
        role: 'user',
        content: `Navigation instruction: "${instruction}"\n\nAvailable clickable elements on the page:\n${elementsInfo}\n\nThink step by step:\n\nStep 1: Parse the instruction\nWhat specific action does the user want me to perform? What text or element characteristics should I look for?\n\nStep 2: Identify candidates\nScan through ALL elements listed above. For each element, ask:\n- Does this element's TEXT content match what the user is asking for?\n- Does this element seem like it would perform the requested navigation action?\n\nStep 3: Exact matching\nIf the instruction contains quoted text (like "More"), look for elements whose text content EXACTLY matches that quoted text. List any exact matches you find.\n\nStep 4: Evaluate candidates\nFor each potential candidate element, analyze:\n- How well does the text content match the instruction?\n- Do the element attributes (href, class) support that this is the right element?\n- Would clicking this element logically perform the requested action?\n\nStep 5: Make decision\nSelect the single best element that matches the user's instruction. If the user said 'click "More"', choose the element whose text is exactly "More".\n\nStep 6: Generate CSS selector\nCreate the most specific CSS selector for your chosen element:\n- If it has a unique class: ".classname"\n- If it has an id: "#id"\n- If it has a unique href: "a[href='exact-href']"\n- Otherwise use the most specific combination\n\nAfter completing all steps above, provide your final answer on a new line as:\nSELECTOR: [your_css_selector_here]`
      }
    ];
  }

  /**
   * Create click-through extraction prompt for extracting content from detail pages
   */
  static clickThroughExtraction(content: string, userPrompt: string): ChatMessage[] {
    return [
      {
        role: 'system',
        content: 'You are a web scraping assistant specializing in detail page extraction. Extract structured data from web page content with high accuracy and return it as a JSON object. Focus only on the content requested by the user.'
      },
      {
        role: 'user',
        content: `Extract the following information from this detail page content:\n\n${userPrompt}\n\nDetail page content:\n${content}\n\nIMPORTANT: This is a detail page for a specific item. Extract the relevant information as requested and return it as a JSON object with clear field names. If certain information is not available, omit those fields rather than guessing.`
      }
    ];
  }

  /**
   * Create prompt for identifying clickable elements within list items
   */
  static listItemLinkSelection(itemHtml: string, linkPrompt: string): ChatMessage[] {
    return [
      {
        role: 'system',
        content: 'You are a web automation assistant. Analyze the HTML for a single list item and identify the specific element that should be clicked to access the detail page. Return the CSS selector that can be used to click this element.'
      },
      {
        role: 'user',
        content: `List item HTML:\n${itemHtml}\n\nInstruction: ${linkPrompt}\n\nAnalyze this list item HTML and identify which element should be clicked. Look for links, buttons, or clickable elements that match the instruction. Return the most specific CSS selector that can be used to click this element.\n\nProvide your answer on a new line as:\nSELECTOR: [your_css_selector_here]`
      }
    ];
  }

  /**
   * Create debugging prompt for analyzing extraction failures
   */
  static debugExtraction(content: string, prompt: string, error: string): ChatMessage[] {
    return [
      {
        role: 'system',
        content: 'You are a web scraping debug assistant. Analyze why an extraction might have failed and suggest improvements to the extraction prompt or approach.'
      },
      {
        role: 'user',
        content: `Extraction failed with the following details:\n\nOriginal prompt: ${prompt}\nError: ${error}\n\nContent sample: ${content.substring(0, 1000)}...\n\nAnalyze why this extraction might have failed and suggest:\n1. Potential issues with the content or prompt\n2. Improved prompt wording\n3. Alternative extraction approaches\n\nProvide specific, actionable recommendations.`
      }
    ];
  }
}