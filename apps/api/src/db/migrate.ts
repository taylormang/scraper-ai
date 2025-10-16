import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { config } from '../config/index.js';

const connectionString = config.database.url || 'postgresql://postgres:devpassword@localhost:5432/scraper_dev';

async function main() {
  console.log('🔄 Starting database migration...');

  const queryClient = postgres(connectionString, { max: 1 });
  const db = drizzle(queryClient);

  try {
    // Create tables directly from schema
    console.log('Creating tables...');

    // Create scrapes table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS scrapes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        config JSONB NOT NULL,
        results JSONB,
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ Created scrapes table');

    // Create jobs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scrape_id UUID REFERENCES scrapes(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        attempts INTEGER DEFAULT 0 NOT NULL,
        progress INTEGER DEFAULT 0 NOT NULL,
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ Created jobs table');

    // Create datasets table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS datasets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        schema JSONB,
        items JSONB,
        item_count INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ Created datasets table');

    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await queryClient.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
