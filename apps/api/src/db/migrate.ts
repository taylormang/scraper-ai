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
    console.log('Resetting legacy tables...');
    await db.execute(sql`DROP TABLE IF EXISTS run_logs CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS run_steps CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS plans CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS runs CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS jobs CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS datasets CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS scrapes CASCADE;`);

    console.log('Ensuring enum types exist...');
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'run_status') THEN
          CREATE TYPE run_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');
        END IF;
      END
      $$;
    `);

    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'run_phase') THEN
          CREATE TYPE run_phase AS ENUM ('plan', 'execute', 'store', 'finalizing');
        END IF;
      END
      $$;
    `);

    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'run_step_status') THEN
          CREATE TYPE run_step_status AS ENUM ('pending', 'in_progress', 'success', 'error');
        END IF;
      END
      $$;
    `);

    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'run_log_severity') THEN
          CREATE TYPE run_log_severity AS ENUM ('info', 'warning', 'error', 'debug');
        END IF;
      END
      $$;
    `);

    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_status') THEN
          CREATE TYPE plan_status AS ENUM ('planning', 'completed', 'failed');
        END IF;
      END
      $$;
    `);

    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    console.log('Creating tables...');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        prompt TEXT NOT NULL,
        status run_status NOT NULL DEFAULT 'queued',
        phase run_phase NOT NULL DEFAULT 'plan',
        summary JSONB,
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        completed_at TIMESTAMP
      )
    `);
    console.log('✅ Created runs table');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS traces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt TEXT NOT NULL,
        response JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ Ensured traces table exists');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID UNIQUE NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        status plan_status NOT NULL DEFAULT 'planning',
        error TEXT,
        prompt TEXT NOT NULL,
        site TEXT,
        objective TEXT,
        base_url TEXT,
        reasoning TEXT,
        sample JSONB,
        schema JSONB,
        pagination JSONB,
        config JSONB,
        meta JSONB,
        model TEXT,
        trace_id UUID REFERENCES traces(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ Created plans table');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS run_steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        parent_step_id UUID REFERENCES run_steps(id) ON DELETE CASCADE,
        identifier TEXT NOT NULL,
        label TEXT NOT NULL,
        status run_step_status NOT NULL DEFAULT 'pending',
        position INTEGER NOT NULL DEFAULT 0,
        context JSONB,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ Created run_steps table');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS run_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        step_id UUID REFERENCES run_steps(id) ON DELETE SET NULL,
        sequence BIGINT NOT NULL,
        severity run_log_severity NOT NULL DEFAULT 'info',
        message TEXT NOT NULL,
        payload JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ Created run_logs table');

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS run_logs_sequence_unique
        ON run_logs(run_id, sequence);
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS run_steps_identifier_unique
        ON run_steps(run_id, identifier);
    `);

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
