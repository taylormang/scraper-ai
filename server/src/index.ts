import axios from 'axios';
import * as cheerio from 'cheerio';
import { BasicScraper } from './scraper';
import { JsonStorage } from './storage';
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

// Test the storage module
const storage = new JsonStorage('./data');
console.log('💾 JsonStorage instance created successfully');

// Test storage functionality
async function testStorage() {
  console.log('\n--- Testing Storage ---');
  
  // List existing records
  const existingRecords = await storage.listRecords();
  console.log(`📋 Existing records: ${existingRecords.join(', ') || 'none'}`);
  
  console.log('✅ Storage module test completed');
}

testStorage().catch(console.error);