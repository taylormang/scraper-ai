import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { config } from '../config/index.js';

// PostgreSQL connection string from environment
const connectionString = config.database.url || 'postgresql://postgres:devpassword@localhost:5432/scraper_dev';

// Create PostgreSQL connection with pooling
const queryClient = postgres(connectionString, {
  max: 10, // Connection pool size
  idle_timeout: 20, // Close idle connections after 20s
  connect_timeout: 10, // Connection timeout in seconds
});

// Create Drizzle database instance with schema
export const db = drizzle(queryClient, { schema });

// Export schema for use in queries
export { schema };

// Export types for convenience
export type {
  Run,
  NewRun,
  Plan,
  NewPlan,
  RunStep,
  NewRunStep,
  RunLog,
  NewRunLog,
  Trace,
  NewTrace,
  Recipe,
  NewRecipe,
  Execution,
  NewExecution,
  ExecutionLog,
  NewExecutionLog,
  ExecutionArtifact,
  NewExecutionArtifact,
} from './schema.js';

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    if (!config.database.url) {
      // SQLite mode does not maintain a network connection to verify.
      return true;
    }
    // Simple query to check connection
    await queryClient`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
