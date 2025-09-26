# Scraper Engine

AI-powered web scraping system with natural language extraction prompts.

## Features

- **AI-Powered Extraction**: Describe what you want extracted in natural language instead of writing CSS selectors
- **Configuration-Driven**: Add new scrapers in <5 minutes with simple config files
- **Multiple Site Support**: Tested with quotes, news articles, and more
- **Structured Data Output**: Automatically extracts arrays of structured objects
- **JSON Storage**: Local file-based storage with unique IDs and metadata

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   Create `.env` file with:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

3. **Run the scraper**:
   ```bash
   npm run dev
   ```

## How It Works

### Configuration System

Define scrapers in `src/test-configs.ts`:

```typescript
export const testConfigs = {
  quotes: {
    name: 'quotes-scraper-ai',
    baseUrl: 'http://quotes.toscrape.com',
    extractionPrompt: 'Extract each quote as a separate object with: quote text, author name, and tags (as an array). Return an array of quote objects.',
    headers: { 'User-Agent': 'Mozilla/5.0...' },
    timeout: 10000
  }
}
```

### AI Extraction

Instead of CSS selectors, use natural language:

```typescript
extractionPrompt: 'Extract each article as an object with: title, link URL, points/score, author, and comment count.'
```

The AI automatically:
- Parses the page content
- Identifies the requested data structures
- Returns structured JSON arrays
- Handles different content types (lists, tables, articles, etc.)

### Example Output

```json
[
  {
    "quote": "The world as we have created it is a process of our thinking...",
    "author": "Albert Einstein",
    "tags": ["change", "deep-thoughts", "thinking", "world"]
  },
  {
    "title": "Improved Gemini 2.5 Flash",
    "link": "https://googleblog.com",
    "points": 395,
    "author": "meetpateltech",
    "comments": 211
  }
]
```

## Supported Extraction Types

- **Lists**: Quote collections, product listings, article feeds
- **Tables**: Data tables, comparison charts
- **Articles**: News articles, blog posts
- **Structured Content**: Any repeating content pattern

## Storage

Data is stored as JSON files in `./data/` with:
- Unique IDs based on URL and timestamp
- Complete metadata (source, timestamp, duration)
- Easy retrieval and analysis

## Testing Different Sites

Change the config in `src/index.ts`:

```typescript
const configName = 'hackernews'; // Options: 'quotes', 'hackernews', 'products'
```

## Requirements

- Node.js 20+
- OpenAI API key
- Internet connection

## Architecture

- `src/scraper.ts` - Main scraper class with AI integration
- `src/ai-extractor.ts` - OpenAI API integration for content extraction
- `src/storage.ts` - JSON file storage system
- `src/test-configs.ts` - Site configuration definitions
- `src/types.ts` - TypeScript interfaces