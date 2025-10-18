import {
  pgEnum,
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
  bigint,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const runStatusEnum = pgEnum('run_status', [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export const runPhaseEnum = pgEnum('run_phase', [
  'plan',
  'execute',
  'store',
  'finalizing',
]);

export const runStepStatusEnum = pgEnum('run_step_status', [
  'pending',
  'in_progress',
  'success',
  'error',
]);

export const runLogSeverityEnum = pgEnum('run_log_severity', [
  'info',
  'warning',
  'error',
  'debug',
]);

export const planStatusEnum = pgEnum('plan_status', [
  'planning',
  'completed',
  'failed',
]);

export const runs = pgTable('runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  prompt: text('prompt').notNull(),
  status: runStatusEnum('status').notNull().default('queued'),
  phase: runPhaseEnum('phase').notNull().default('plan'),
  summary: jsonb('summary'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
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

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id')
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' })
    .unique(),
  status: planStatusEnum('status').notNull().default('planning'),
  error: text('error'),
  prompt: text('prompt').notNull(),
  site: text('site'),
  objective: text('objective'),
  baseUrl: text('base_url'),
  reasoning: text('reasoning'),
  sample: jsonb('sample'),
  schema: jsonb('schema'),
  pagination: jsonb('pagination'),
  config: jsonb('config'),
  meta: jsonb('meta'),
  model: text('model'),
  traceId: uuid('trace_id').references(() => traces.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const runSteps = pgTable(
  'run_steps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    runId: uuid('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'cascade' }),
    parentStepId: uuid('parent_step_id'),
    identifier: text('identifier').notNull(),
    label: text('label').notNull(),
    status: runStepStatusEnum('status').notNull().default('pending'),
    position: integer('position').notNull().default(0),
    context: jsonb('context'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    parentReference: foreignKey({
      columns: [table.parentStepId],
      foreignColumns: [table.id],
    }).onDelete('cascade'),
  })
);

export const runLogs = pgTable('run_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id')
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  stepId: uuid('step_id').references(() => runSteps.id, {
    onDelete: 'set null',
  }),
  sequence: bigint('sequence', { mode: 'number' }).notNull(),
  severity: runLogSeverityEnum('severity').notNull().default('info'),
  message: text('message').notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const runsRelations = relations(runs, ({ many, one }) => ({
  plan: one(plans, {
    fields: [runs.id],
    references: [plans.runId],
  }),
  steps: many(runSteps),
  logs: many(runLogs),
}));

export const plansRelations = relations(plans, ({ one }) => ({
  run: one(runs, {
    fields: [plans.runId],
    references: [runs.id],
  }),
}));

export const runStepsRelations = relations(runSteps, ({ one, many }) => ({
  run: one(runs, {
    fields: [runSteps.runId],
    references: [runs.id],
  }),
  parent: one(runSteps, {
    fields: [runSteps.parentStepId],
    references: [runSteps.id],
  }),
  logs: many(runLogs),
}));

export const runLogsRelations = relations(runLogs, ({ one }) => ({
  run: one(runs, {
    fields: [runLogs.runId],
    references: [runs.id],
  }),
  step: one(runSteps, {
    fields: [runLogs.stepId],
    references: [runSteps.id],
  }),
}));

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;

export type RunStep = typeof runSteps.$inferSelect;
export type NewRunStep = typeof runSteps.$inferInsert;

export type RunLog = typeof runLogs.$inferSelect;
export type NewRunLog = typeof runLogs.$inferInsert;

export type Trace = typeof traces.$inferSelect;
export type NewTrace = typeof traces.$inferInsert;
