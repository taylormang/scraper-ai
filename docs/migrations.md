# Database Migrations

This project uses [Drizzle ORM](https://orm.drizzle.team/) for database schema management and migrations.

## Overview

- **Schema Definition**: `apps/api/src/db/schema.ts` - Single source of truth for database schema
- **Migration Files**: `apps/api/drizzle/` - Auto-generated SQL migration files
- **Migration Tracking**: Drizzle automatically tracks applied migrations in `drizzle.__drizzle_migrations` table

## Development Workflow

For rapid iteration during local development:

```bash
cd apps/api
npm run db:push
```

**What it does:**
- Directly syncs your `schema.ts` to the database
- No migration files generated
- Fast and convenient for prototyping
- ⚠️ **Does not create migration history** - use only for local development

## Production Workflow

For production-ready migrations with version control:

### 1. Generate Migration

After modifying `schema.ts`:

```bash
cd apps/api
npm run db:generate
```

**What it does:**
- Analyzes changes between `schema.ts` and current database state
- Generates SQL migration file in `apps/api/drizzle/` (e.g., `0001_add_column.sql`)
- Creates migration metadata in `apps/api/drizzle/meta/`

**Example output:**
```
[✓] Your SQL migration file ➜ apps/api/drizzle/0001_add_status_column.sql
```

### 2. Review Migration

Always review the generated SQL before applying:

```bash
cat apps/api/drizzle/0001_*.sql
```

Verify:
- Column types are correct
- Foreign keys are properly configured
- No unintended data loss (e.g., dropping columns)

### 3. Apply Migration

```bash
cd apps/api
npm run db:migrate
```

**What it does:**
- Executes all pending migration files in order
- Records migration in `drizzle.__drizzle_migrations` table
- Only runs migrations that haven't been applied yet

### 4. Commit Migration Files

```bash
git add apps/api/drizzle/
git commit -m "Add migration: description of changes"
```

**Always commit migration files to version control!** This ensures:
- Team members get the same database structure
- Production deployments have migration history
- Rollbacks are possible if needed

## Common Scenarios

### Adding a New Table

1. Define table in `schema.ts`:
```typescript
export const myNewTable = pgTable('my_new_table', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

2. Generate migration:
```bash
npm run db:generate
```

3. Apply migration:
```bash
npm run db:migrate
```

### Adding a Column

1. Add column to existing table in `schema.ts`:
```typescript
export const runs = pgTable('runs', {
  // ... existing columns
  newColumn: text('new_column'),
});
```

2. Generate and apply:
```bash
npm run db:generate
npm run db:migrate
```

### Renaming a Column

⚠️ **Drizzle can't detect renames!** It will generate DROP + ADD, causing data loss.

**Safe approach:**
1. Add new column with new name
2. Write data migration script to copy data
3. Drop old column in separate migration

### Modifying Column Type

Be careful when changing types - Drizzle may not generate safe migrations.

**Example:** Changing `text` to `integer` requires manual intervention:
1. Generate migration
2. Edit SQL to add `USING` clause:
```sql
ALTER TABLE runs ALTER COLUMN age TYPE integer USING age::integer;
```

## Available Commands

From `apps/api/` directory:

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run db:generate` | Generate migration from schema changes | After modifying `schema.ts` |
| `npm run db:migrate` | Apply pending migrations | After generating or pulling new migrations |
| `npm run db:push` | Sync schema directly (no migration files) | Local development, rapid iteration |
| `npm run db:studio` | Open Drizzle Studio UI | Browse/edit database visually |

## Configuration

**`apps/api/drizzle.config.ts`:**
```typescript
export default defineConfig({
  schema: join(configDir, './src/db/schema.ts'),
  out: join(configDir, './drizzle'),
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://taylormcmanus@localhost:5432/scraper_dev',
  },
});
```

**Environment Variables** (`apps/api/.env`):
```bash
DATABASE_URL=postgresql://taylormcmanus@localhost:5432/scraper_dev
```

## Troubleshooting

### Migration Already Applied Error

**Symptom:** Error about types/tables already existing

**Cause:** Trying to apply migrations to a database that was manually created

**Solution:**
```bash
# Drop and recreate database
dropdb scraper_dev && createdb scraper_dev

# Apply all migrations
cd apps/api && npm run db:migrate
```

### Migration Out of Sync

**Symptom:** Generated migration doesn't match actual schema changes

**Solution:**
```bash
# Pull fresh schema from database
npm run db:pull

# Then regenerate migration
npm run db:generate
```

### Lost Migration Files

**Never delete migration files from `drizzle/` folder!**

If lost:
1. Check version control history
2. Reconstruct from database schema using `db:pull`
3. Create new migration with missing changes

## Best Practices

1. **Always review generated SQL** before applying migrations
2. **Test migrations on local database** before production
3. **Commit migration files** to version control
4. **Use `db:push` for development**, `db:generate + db:migrate` for production
5. **Never edit applied migration files** - create a new migration to fix issues
6. **Back up production database** before applying migrations
7. **Keep migrations small and focused** - one logical change per migration

## Production Deployment

Recommended deployment workflow:

```bash
# In CI/CD pipeline or deployment script:
cd apps/api

# 1. Install dependencies
npm install

# 2. Run migrations
npm run db:migrate

# 3. Start application
npm run build
npm start
```

**Environment variables for production:**
- Set `DATABASE_URL` to production database
- Ensure database user has schema modification permissions
- Consider using read replicas for zero-downtime migrations

## Migration History

View applied migrations:
```bash
psql scraper_dev -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;"
```

View migration files:
```bash
ls -la apps/api/drizzle/
```

## References

- [Drizzle Migrations Documentation](https://orm.drizzle.team/docs/migrations)
- [Drizzle Kit Overview](https://orm.drizzle.team/docs/kit-overview)
- [PostgreSQL with Drizzle](https://orm.drizzle.team/docs/get-started/postgresql-new)
