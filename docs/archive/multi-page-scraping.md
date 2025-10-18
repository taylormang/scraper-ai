# Multi-Page Scraping Implementation

## Overview

The multi-page scraping system enables automatic traversal of paginated content using AI-powered element identification. This allows scrapers to collect data from multiple pages without hardcoded selectors or site-specific navigation logic.

## Architecture

### Core Components

**PageNavigator** (`src/navigator.ts`)
- Manages browser automation using Puppeteer
- Handles initial page loading and subsequent navigation
- Integrates with OpenAI GPT for element identification

**ScraperConfig Interface** (`src/types.ts`)
- `navigationType`: Defines navigation method ('button', 'scroll', or 'none')
- `navigationPrompt`: Natural language instruction for navigation (e.g., "click More")
- `maxPages`: Maximum number of pages to scrape (default: 2)

### AI-Powered Navigation

The system uses OpenAI's GPT-3.5-turbo to analyze page elements and determine which element to click based on user instructions:

1. **Element Discovery**: Extracts all clickable elements (links, buttons, inputs) from the page
2. **AI Analysis**: Sends element information and navigation prompt to LLM
3. **Selector Generation**: LLM returns appropriate CSS selector for the target element
4. **Navigation**: System clicks the identified element and waits for content changes

### Configuration Example

```typescript
{
  name: "hackernews",
  url: "https://news.ycombinator.com",
  navigationType: "button",
  navigationPrompt: "click \"More\"",
  maxPages: 2,
  // ... other config options
}
```

## Key Features

### Content Change Detection
- Monitors page content length and HTML changes after navigation
- Implements retry logic with configurable timeout (10 attempts, 1s intervals)
- Ensures navigation actually succeeded before proceeding

### Browser State Management
- Maintains single browser instance across page navigations
- Preserves cookies, session state, and JavaScript context
- Reduces overhead compared to launching new browser per page

### Enhanced AI Extraction
- Processes up to 25,000 characters of cleaned content per page
- Uses explicit prompts to ensure ALL items are extracted (not just subsets)
- Supports up to 3,000 tokens in AI responses for comprehensive data extraction
- Includes debugging output showing content samples and extraction counts

### Comprehensive Metadata Tracking
- Records all URLs visited during multi-page navigation
- Tracks total item count across all pages
- Provides detailed timing and success metrics
- Example metadata: `{"urlsScraped": ["url1", "url2"], "totalItems": 59, "pagesScraped": 2}`

### Error Handling
- Graceful fallbacks when navigation elements cannot be found
- Comprehensive error logging for debugging navigation issues
- Continues scraping even if subsequent pages fail to load

## Usage Patterns

### Button-Based Navigation
For sites with "Next", "More", or numbered pagination buttons:
```typescript
navigationType: "button"
navigationPrompt: "click Next Page"
```

### URL Parameter Navigation
For sites with query parameter pagination (handled automatically):
```typescript
navigationType: "button"
navigationPrompt: "click More"
// System identifies links like "?p=2" automatically
```

### Custom Navigation Instructions
Users can specify any natural language instruction:
```typescript
navigationPrompt: "click the arrow pointing right"
navigationPrompt: "click Load More Results"
navigationPrompt: "click Continue Reading"
```

## Technical Implementation

### Element Analysis Process

1. **Query Execution**: `document.querySelectorAll('a, button, span, div, input[type="button"], input[type="submit"]')`
2. **Filtering**: Remove hidden elements (`display: none`, `visibility: hidden`)
3. **Data Extraction**: Collect tagName, textContent, href, id, className, and outerHTML
4. **Token Optimization**: Limit to 100 elements to stay within LLM context limits
5. **AI Processing**: Send structured element data to OpenAI API

### LLM Prompt Structure

Navigation uses chain-of-thought reasoning:

```
Navigation instruction: "click More"

Available clickable elements on the page:
Element 489: <a class="morelink" href="https://news.ycombinator.com/?p=2">TEXT:"More"</a>
...

Think step by step:
Step 1: Parse the instruction - What specific action does the user want?
Step 2: Identify candidates - Scan through ALL elements
Step 3: Exact matching - Look for elements with exact text matches
Step 4: Evaluate candidates - Analyze text content and attributes
Step 5: Make decision - Select the single best element

SELECTOR: .morelink
```

Extraction uses comprehensive prompts:

```
Extract ALL instances of the following from this web page content.
Do not stop early - process the entire content and extract every single item:

Extract each article as an object with: title, link URL, points/score, author, comment count

IMPORTANT: Extract EVERY item that matches the criteria.
```

### Response Processing
- Extracts CSS selector from LLM response
- Validates selector format and attempts click
- Falls back to error state if selector is invalid or element not found

## Performance Considerations

### Token Efficiency
- Limits element analysis to 100 most relevant elements
- Truncates long text content and HTML to reduce token usage
- Optimizes prompt structure for consistent, minimal responses

### Browser Resource Management
- Reuses single browser instance across navigations
- Sets appropriate timeouts for page loads (30s) and navigation (10 attempts)
- Closes browser properly on completion or error

### Rate Limiting
- Implements 1-second delays between navigation attempts
- Waits for `networkidle0` state before considering page loaded
- Respects site's loading patterns and JavaScript execution

## Debugging and Monitoring

### Logging Output
- Detailed element discovery logs showing found clickable elements
- AI decision logging with selected selector and reasoning
- Content change verification with before/after character counts
- Error tracking with specific failure modes

### Common Issues
- **Element Not Found**: AI cannot identify matching element from prompt
- **Navigation Failed**: Click succeeded but content didn't change
- **Timeout Errors**: Page taking too long to load or change
- **Selector Invalid**: AI returned malformed CSS selector

This implementation provides a flexible, AI-powered approach to multi-page scraping that adapts to different site structures without requiring custom navigation code for each target.