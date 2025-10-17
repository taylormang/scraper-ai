import { pgTable, uuid, text, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Scrapes table - Main table for scraping operations
export const scrapes = pgTable('scrapes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  status: text('status').notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
  config: jsonb('config').notNull(), // ScraperConfig - flexible JSON configuration
  results: jsonb('results'), // Extracted data array - flexible schema
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const traces = pgTable('traces', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull(),
  model: text('model').notNull(),
  prompt: text('prompt').notNull(),
  response: jsonb('response'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Jobs table - Job queue tracking for BullMQ integration
export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  scrapeId: uuid('scrape_id').references(() => scrapes.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // 'pending' | 'active' | 'completed' | 'failed'
  attempts: integer('attempts').default(0).notNull(),
  progress: integer('progress').default(0).notNull(), // 0-100 percentage
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Datasets table - For organizing scraped data collections
export const datasets = pgTable('datasets', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  schema: jsonb('schema'), // Auto-generated schema metadata
  items: jsonb('items'), // Array of scraped items
  itemCount: integer('item_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations for Drizzle query builder
export const scrapesRelations = relations(scrapes, ({ many }) => ({
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  scrape: one(scrapes, {
    fields: [jobs.scrapeId],
    references: [scrapes.id],
  }),
}));

// TypeScript types for type-safe usage
export type Scrape = typeof scrapes.$inferSelect;
export type NewScrape = typeof scrapes.$inferInsert;

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export type Dataset = typeof datasets.$inferSelect;
export type NewDataset = typeof datasets.$inferInsert;

export type Trace = typeof traces.$inferSelect;
export type NewTrace = typeof traces.$inferInsert;
