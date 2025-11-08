// Simple test - just scrape page 1
import Firecrawl from '@mendable/firecrawl-js';
import { config } from 'dotenv';

config({ path: './apps/api/.env' });

const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY! });

const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      url: { type: 'string' },
      points: { type: 'number' },
      author: { type: 'string' },
      comments: { type: 'number' },
    },
  },
};

async function test() {
  console.log('Testing scrape with JSON extraction...\n');

  try {
    const result = await firecrawl.crawl('https://news.ycombinator.com/?p=1', {
      limit: 1,
      scrapeOptions: {
        formats: [
          {
            type: 'json',
            schema,
          },
        ],
      },
    });

    console.log('Success!');
    console.log('Status:', result.status);
    console.log('Data pages:', result.data?.length);
    console.log('Credits:', result.creditsUsed);

    if (result.data?.[0]?.json) {
      console.log('\nExtracted items:', result.data[0].json.length);
      console.log('\nFirst 3 items:');
      result.data[0].json.slice(0, 3).forEach((item: any, i: number) => {
        console.log(`${i + 1}. ${item.title} (${item.points} points)`);
      });
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Code:', error.code);
  }
}

test();
