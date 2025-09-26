import axios from 'axios';
import * as cheerio from 'cheerio';
import { BasicScraper } from './scraper';
import { ScraperConfig } from './types';

console.log('🚀 Scraper Engine starting up...');
console.log('✅ TypeScript setup working');
console.log('📦 Dependencies loaded:', {
  axios: !!axios,
  cheerio: !!cheerio
});

// Test the scraper module
const testConfig: ScraperConfig = {
  name: 'test-scraper',
  baseUrl: 'https://example.com',
  selectors: {
    heading: 'h1',
    content: 'p'
  }
};

const scraper = new BasicScraper(testConfig);
console.log('🔧 BasicScraper instance created successfully');
console.log('📋 Test config:', testConfig);