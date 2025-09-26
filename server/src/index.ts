import 'dotenv/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { BasicScraper } from './scraper';
import { JsonStorage } from './storage';
import { ScraperConfig } from './types';
import { testConfigs } from './test-configs';

console.log('🚀 Scraper Engine starting up...');
console.log('✅ TypeScript setup working');
console.log('📦 Dependencies loaded:', {
  axios: !!axios,
  cheerio: !!cheerio
});
console.log('🔑 OpenAI API key loaded:', !!process.env.OPENAI_API_KEY);
console.log('⚙️  Available test configs:', Object.keys(testConfigs).join(', '));

async function runFullTest() {
  console.log('\n--- Full End-to-End Test ---');

  // Choose which config to test - change this to test different sites
  const configName = 'quotes'; // Options: 'quotes', 'hackernews', 'products'
  const config = testConfigs[configName];

  if (!config) {
    throw new Error(`Config '${configName}' not found in testConfigs`);
  }

  console.log(`🎯 Testing config: ${configName} (${config.name})`);

  const scraper = new BasicScraper(config);
  const storage = new JsonStorage('./data');

  try {
    // Test scraping
    console.log('📡 Testing scraper...');
    const result = await scraper.scrape(config.baseUrl);

    if (result.success && result.data) {
      console.log('\n✅ Scraping successful!');
      console.log(`Title: ${result.data.title}`);
      console.log(`Content type: ${Array.isArray(result.data.content) ? `Array with ${result.data.content.length} items` : 'Object'}`);
      console.log(`Duration: ${result.duration}ms`);

      // Show sample extracted data
      if (Array.isArray(result.data.content) && result.data.content.length > 0) {
        console.log(`Sample item: ${JSON.stringify(result.data.content[0], null, 2)}\n`);
      } else {
        console.log(`Content preview: ${JSON.stringify(result.data.content).substring(0, 200)}...\n`);
      }

      // Test storage
      console.log('💾 Testing storage...');
      const storageResult = await storage.store(result.data);

      if (storageResult.success) {
        console.log(`✅ Data stored at: ${storageResult.filePath}`);

        // Test retrieval
        console.log('\n📖 Testing data retrieval...');
        const recordFiles = await storage.listRecords();
        console.log(`✅ Found ${recordFiles.length} stored records`);

        if (recordFiles.length > 0) {
          console.log(`Latest record file: ${recordFiles[0]}`);
        }
      } else {
        console.log(`❌ Storage failed: ${storageResult.error}`);
      }
    } else {
      console.log(`❌ Scraping failed: ${result.error}`);
    }

  } catch (error) {
    console.log(`💥 Test failed: ${error}`);
  }
}

// Run the full test
runFullTest().catch(console.error);