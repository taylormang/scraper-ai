import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define environment variable schema
const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  DATABASE_SQLITE_PATH: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);

// Export configuration
export const config = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  corsOrigin: env.CORS_ORIGIN,
  redis: {
    host: env.REDIS_HOST || 'localhost',
    port: env.REDIS_PORT ? parseInt(env.REDIS_PORT, 10) : 6379,
    password: env.REDIS_PASSWORD,
  },
  database: {
    url: env.DATABASE_URL,
    sqlitePath: env.DATABASE_SQLITE_PATH || 'data/scraper.sqlite',
  },
  services: {
    firecrawl: env.FIRECRAWL_API_KEY,
    openai: env.OPENAI_API_KEY,
  },
} as const;
