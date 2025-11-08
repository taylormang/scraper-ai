// Test HackerNews Executor
// Tests both URL pattern and next button strategies

import { FirecrawlExecutor } from './apps/api/src/executors/firecrawl';
import { Recipe } from './apps/api/src/types/recipe';
import { config } from 'dotenv';

config({ path: './apps/api/.env' });

// HackerNews Recipe with URL Pattern Strategy
const hnRecipeUrlPattern: Recipe = {
  id: 'test-hn-url',
  name: 'HN front page posts (URL pattern)',
  description: 'Scrape HackerNews posts using URL pattern pagination',
  userId: 'test-user',
  version: 1,

  sources: [
    {
      sourceId: 'hn_source_id',
      label: 'hackernews',
    },
  ],

  extraction: {
    schema: {
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
    },
    selectorsBySource: {},
  },

  pagination: {
    strategy: 'url_pattern',
    config: {
      type: 'url_pattern',
      template: 'https://news.ycombinator.com/?p={n}',
      startPage: 1,
      pageParam: 'p',
    },
    maxPages: 3, // Scrape 3 pages (90 items)
  },

  executor: 'firecrawl',

  metrics: {
    totalExecutions: 0,
    successRate: 0,
    avgDuration: 0,
    avgCost: 0,
    avgItemsPerExecution: 0,
  },

  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function testUrlPattern() {
  console.log('\n========================================');
  console.log('Testing HackerNews URL Pattern Strategy');
  console.log('========================================\n');

  const executor = new FirecrawlExecutor(process.env.FIRECRAWL_API_KEY!);

  try {
    const result = await executor.execute(hnRecipeUrlPattern);

    console.log('\n✅ Success!');
    console.log(`Items scraped: ${result.items.length}`);
    console.log(`Total requests: ${result.metadata.totalRequests}`);
    console.log(`Cost: $${result.metadata.cost.toFixed(4)}`);
    console.log(`Duration: ${(result.metadata.duration / 1000).toFixed(2)}s`);

    // Show first 3 items
    console.log('\nFirst 3 items:');
    result.items.slice(0, 3).forEach((item, i) => {
      console.log(`\n${i + 1}. ${item.data.title}`);
      console.log(`   URL: ${item.data.url}`);
      console.log(`   Points: ${item.data.points} | Author: ${item.data.author}`);
    });
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Code:', error.code);
    throw error;
  }
}

async function main() {
  try {
    await testUrlPattern();

    console.log('\n========================================');
    console.log('All tests passed! ✅');
    console.log('========================================\n');
  } catch (error) {
    console.error('\nTests failed! ❌');
    process.exit(1);
  }
}

main();
