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
  unique,
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

export const executionStatusEnum = pgEnum('execution_status', [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export const traces = pgTable('traces', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull(),
  model: text('model').notNull(),
  prompt: text('prompt').notNull(),
  response: jsonb('response'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const recipes = pgTable(
  'recipes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    site: text('site').notNull(),
    baseUrl: text('base_url').notNull(),
    pagination: jsonb('pagination'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    baseUrlUnique: unique('recipes_base_url_unique').on(table.baseUrl),
  })
);

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').references(() => recipes.id, {
    onDelete: 'set null',
  }),
  status: planStatusEnum('status').notNull().default('planning'),
  error: text('error'),
  prompt: text('prompt').notNull(),
  site: text('site'),
  objective: text('objective'),
  baseUrl: text('base_url'),
  startingUrl: text('starting_url'),
  reasoning: text('reasoning'),
  sample: jsonb('sample'),
  schema: jsonb('schema'),
  pagination: jsonb('pagination'),
  config: jsonb('config'),
  meta: jsonb('meta'),
  paginationOverrides: jsonb('pagination_overrides'),
  model: text('model'),
  traceId: uuid('trace_id').references(() => traces.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const runs = pgTable('runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').references(() => plans.id, {
    onDelete: 'set null',
  }),
  prompt: text('prompt').notNull(),
  status: runStatusEnum('status').notNull().default('queued'),
  phase: runPhaseEnum('phase').notNull().default('plan'),
  summary: jsonb('summary'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const executions = pgTable('executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id')
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').references(() => plans.id, {
    onDelete: 'set null',
  }),
  engine: text('engine').notNull(),
  status: executionStatusEnum('status').notNull().default('queued'),
  config: jsonb('config').notNull(),
  result: jsonb('result'),
  error: text('error'),
  metadata: jsonb('metadata'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const executionLogs = pgTable('execution_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  executionId: uuid('execution_id')
    .notNull()
    .references(() => executions.id, { onDelete: 'cascade' }),
  runId: uuid('run_id')
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  sequence: bigint('sequence', { mode: 'number' }).notNull(),
  severity: runLogSeverityEnum('severity').notNull().default('info'),
  message: text('message').notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const executionArtifacts = pgTable('execution_artifacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  executionId: uuid('execution_id')
    .notNull()
    .references(() => executions.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
    identifierUnique: unique().on(table.runId, table.identifier),
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
    fields: [runs.planId],
    references: [plans.id],
  }),
  steps: many(runSteps),
  logs: many(runLogs),
  executions: many(executions),
}));

export const plansRelations = relations(plans, ({ one, many }) => ({
  recipe: one(recipes, {
    fields: [plans.recipeId],
    references: [recipes.id],
  }),
  runs: many(runs),
}));

export const recipesRelations = relations(recipes, ({ many }) => ({
  plans: many(plans),
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

export const executionsRelations = relations(executions, ({ one, many }) => ({
  run: one(runs, {
    fields: [executions.runId],
    references: [runs.id],
  }),
  plan: one(plans, {
    fields: [executions.planId],
    references: [plans.id],
  }),
  logs: many(executionLogs),
  artifacts: many(executionArtifacts),
}));

export const executionLogsRelations = relations(executionLogs, ({ one }) => ({
  execution: one(executions, {
    fields: [executionLogs.executionId],
    references: [executions.id],
  }),
  run: one(runs, {
    fields: [executionLogs.runId],
    references: [runs.id],
  }),
}));

export const executionArtifactsRelations = relations(executionArtifacts, ({ one }) => ({
  execution: one(executions, {
    fields: [executionArtifacts.executionId],
    references: [executions.id],
  }),
}));

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;

export type RunStep = typeof runSteps.$inferSelect;
export type NewRunStep = typeof runSteps.$inferInsert;

export type RunLog = typeof runLogs.$inferSelect;
export type NewRunLog = typeof runLogs.$inferInsert;

export type Trace = typeof traces.$inferSelect;
export type NewTrace = typeof traces.$inferInsert;

export type Execution = typeof executions.$inferSelect;
export type NewExecution = typeof executions.$inferInsert;

export type ExecutionLog = typeof executionLogs.$inferSelect;
export type NewExecutionLog = typeof executionLogs.$inferInsert;

export type ExecutionArtifact = typeof executionArtifacts.$inferSelect;
export type NewExecutionArtifact = typeof executionArtifacts.$inferInsert;
