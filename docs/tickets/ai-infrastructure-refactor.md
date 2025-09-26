# AI Infrastructure Refactoring

## Priority
**HIGH** - Prerequisite for click-through extraction feature

## Description

Current AI extraction patterns have significant code duplication and scattered logic across multiple files. Before implementing the click-through extraction feature, we need to refactor the AI infrastructure to create maintainable, reusable abstractions.

## Current Problems

### Code Duplication
- **Identical OpenAI API calls**: `ai-extractor.ts:37` and `navigator.ts:265` have duplicated fetch() logic
- **HTML preprocessing**: cheerio loading and text cleaning repeated across files
- **Response parsing**: JSON cleaning and validation logic duplicated

### Inconsistent Patterns
- **API key handling**: ai-extractor uses constructor parameter, navigator uses process.env directly
- **Error handling**: Different error patterns across AI components
- **Prompt engineering**: Ad-hoc prompts scattered in classes rather than centralized templates

### Scalability Issues
- **No rate limiting**: Risk of hitting OpenAI API limits
- **No connection pooling**: New fetch() for every AI call
- **No caching**: Repeated identical AI requests
- **No batching**: Sequential AI calls could be optimized

## Requirements

### Create Reusable AI Abstractions
- **AIService**: Centralized OpenAI API layer with retry logic, rate limiting, and error handling
- **PromptBuilder**: Template-based prompt engineering for consistent AI interactions
- **ContentProcessor**: HTML cleaning, element extraction, and content preparation utilities
- **ResultParser**: Standardized response parsing with type safety

### Refactor Existing Components
- Update `AIExtractor` to use new abstractions (breaking change)
- Update `PageNavigator` to use new abstractions (breaking change)
- Maintain 100% functional compatibility - all existing functionality must work unchanged

### Add Production Features
- Rate limiting for OpenAI API calls
- Retry logic with exponential backoff
- Proper error handling and logging
- Type-safe interfaces for all AI operations

## Implementation Plan

### Phase 1: Core AI Service Layer

#### 1.1 Create `ai-service.ts`
```typescript
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIService {
  private apiKey: string;
  private baseUrl: string;
  private rateLimiter: RateLimiter;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY!;
    this.baseUrl = 'https://api.openai.com/v1';
    this.rateLimiter = new RateLimiter({ requestsPerMinute: 60 });
  }

  async chat(messages: ChatMessage[], config: AIConfig = {}): Promise<AIResponse> {
    // Centralized OpenAI API calls with:
    // - Rate limiting
    // - Retry logic with exponential backoff
    // - Proper error handling
    // - Request/response logging
    // - Connection pooling
  }

  async healthCheck(): Promise<boolean> {
    // Verify API key and service availability
  }
}
```

#### 1.2 Create `rate-limiter.ts`
```typescript
export class RateLimiter {
  private requests: number[] = [];
  private readonly requestsPerMinute: number;

  constructor(config: { requestsPerMinute: number }) {
    this.requestsPerMinute = config.requestsPerMinute;
  }

  async waitIfNeeded(): Promise<void> {
    // Implement sliding window rate limiting
  }
}
```

### Phase 2: Content Processing Utilities

#### 2.1 Create `content-processor.ts`
```typescript
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

export class ContentProcessor {
  static cleanForAI(html: string, maxLength: number = 25000): string {
    // Centralized HTML cleaning:
    // - Load with cheerio
    // - Remove scripts, styles, ads, nav, footer, header
    // - Normalize whitespace
    // - Limit content length
    // - Return clean text
  }

  static async extractElements(page: Page, selectors: string[] = ['a', 'button', 'span', 'div', 'input[type="button"]', 'input[type="submit"]']): Promise<ElementInfo[]> {
    // Centralized element extraction for AI analysis
    // - Get all clickable elements
    // - Filter visible elements
    // - Extract text content, attributes
    // - Return structured data for AI
  }

  static getPageTitle(html: string): string | undefined {
    // Extract page title using cheerio
  }
}
```

### Phase 3: Prompt Engineering Templates

#### 3.1 Create `prompt-builder.ts`
```typescript
export class PromptBuilder {
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
}
```

### Phase 4: Response Parsing Utilities

#### 4.1 Create `result-parser.ts`
```typescript
export class ResultParser {
  static parseJSONResponse<T>(response: string): T[] {
    // Clean and parse JSON response:
    // - Remove markdown code blocks
    // - Parse JSON with error handling
    // - Handle different array formats (items array vs direct array)
    // - Return normalized array

    let cleanedText = response.trim();

    if (response.includes('```json')) {
      cleanedText = response.replace(/```json\s*/g, '').replace(/\s*```/g, '');
    } else if (response.includes('```')) {
      cleanedText = response.replace(/```\s*/g, '').replace(/\s*```/g, '');
    }

    try {
      const parsedResult = JSON.parse(cleanedText);
      if (parsedResult.items && Array.isArray(parsedResult.items)) {
        return parsedResult.items;
      } else if (Array.isArray(parsedResult)) {
        return parsedResult;
      } else {
        return [parsedResult];
      }
    } catch (parseError) {
      throw new Error(`Failed to parse AI response as JSON: ${cleanedText.substring(0, 200)}`);
    }
  }

  static parseSelectorResponse(response: string): string | null {
    // Extract CSS selector from AI response
    const selectorMatch = response.match(/SELECTOR:\s*(.+)/);
    const selector = selectorMatch ? selectorMatch[1].trim() : null;

    if (!selector || selector === 'NONE') {
      return null;
    }

    return selector;
  }
}
```

### Phase 5: Refactor Existing Components

#### 5.1 Update `ai-extractor.ts`
- **BREAKING CHANGE**: Replace direct OpenAI API calls with `AIService`
- Use `PromptBuilder.contentExtraction()` for consistent prompts
- Use `ContentProcessor.cleanForAI()` for HTML preprocessing
- Use `ResultParser.parseJSONResponse()` for response handling
- Maintain exact same public interface and functionality

#### 5.2 Update `navigator.ts`
- **BREAKING CHANGE**: Replace direct OpenAI API calls with `AIService`
- Use `PromptBuilder.elementSelection()` for consistent prompts
- Use `ContentProcessor.extractElements()` for element collection
- Use `ResultParser.parseSelectorResponse()` for response parsing
- Maintain exact same public interface and functionality

#### 5.3 Update `types.ts`
```typescript
// Add new AI-related interfaces
export interface AIConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

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
```

## Testing Requirements

### Functional Testing
- All existing scraper configurations must work unchanged
- All existing test cases must pass
- AI extraction behavior must be identical to current implementation
- Element selection behavior must be identical to current implementation

### Performance Testing
- Rate limiting should prevent API errors
- Response times should be similar or better than current implementation
- Memory usage should not increase significantly

### Integration Testing
- Test with quotes.toscrape.com configuration
- Test with Hacker News configuration
- Test error handling with invalid API keys
- Test rate limiting with high-frequency requests

## Success Criteria

### Code Quality
- ✅ Eliminate all code duplication in AI handling
- ✅ Consistent error handling across all AI operations
- ✅ Type-safe interfaces for all AI interactions
- ✅ Centralized configuration for AI parameters

### Functionality
- ✅ 100% backward compatibility - all existing functionality works unchanged
- ✅ All existing test configurations pass
- ✅ No regression in extraction accuracy or navigation reliability

### Performance & Reliability
- ✅ Rate limiting prevents API abuse
- ✅ Retry logic handles transient failures
- ✅ Proper error messages for debugging
- ✅ Foundation ready for click-through extraction feature

### Documentation
- ✅ Clear interfaces and usage examples
- ✅ Migration guide for any breaking changes
- ✅ Updated PROGRESS.md with completion status

## Future Benefits

This refactoring creates the foundation for:
- **Click-through extraction** (immediate next feature)
- **Multiple AI providers** (Anthropic, local models)
- **Advanced prompting** (chain-of-thought, function calling)
- **Caching and optimization** (response caching, prompt optimization)
- **Monitoring and analytics** (token usage, success rates)