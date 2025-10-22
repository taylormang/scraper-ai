import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://taylormcmanus@localhost:5432/scraper_dev',
  },
});
