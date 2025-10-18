import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const configFile = fileURLToPath(import.meta.url);
const configDir = dirname(configFile);

// Load .env file from the apps/api directory
dotenv.config({ path: join(configDir, '.env') });

export default defineConfig({
  schema: join(configDir, './src/db/schema.ts'),
  out: join(configDir, './drizzle'),
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://taylormcmanus@localhost:5432/scraper_dev',
  },
});
