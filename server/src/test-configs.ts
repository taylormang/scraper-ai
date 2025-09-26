import { ScraperConfig } from './types';

export const testConfigs: Record<string, ScraperConfig> = {
  quotes: {
    name: 'quotes-scraper-ai',
    baseUrl: 'http://quotes.toscrape.com',
    extractionPrompt: 'Extract each quote as a separate object with: quote text, author name, and tags (as an array). Return an array of quote objects.',
    navigationType: 'button',
    navigationPrompt: 'click next button',
    maxPages: 3,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    },
    timeout: 10000
  },

  // Multi-page news site with navigation
  hackernews: {
    name: 'hackernews-scraper',
    baseUrl: 'https://news.ycombinator.com',
    extractionPrompt: 'Extract each article as an object with: title, link URL, points/score, author, and comment count. Return an array of article objects.',
    navigationType: 'button',
    navigationPrompt: 'click "More"',
    maxPages: 3,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    },
    timeout: 10000
  },

  // Example for a product listing site (not tested yet)
  products: {
    name: 'products-scraper',
    baseUrl: 'https://example-store.com',
    extractionPrompt: 'Extract each product as an object with: name, price, description, and availability status. Return an array of product objects.',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    },
    timeout: 10000
  }
};