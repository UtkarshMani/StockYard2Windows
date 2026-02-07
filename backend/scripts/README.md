# Safe Migration Guidelines

## Overview

This directory contains scripts for safe database migrations with automatic backup and data integrity verification.

## Scripts

### 1. safe-migrate.ts
**Purpose:** Run migrations with automatic backup and integrity checks

**Features:**
- Creates automatic backup before migration
- Runs Prisma migrations
- Verifies data integrity (checks record counts)
- Offers to restore backup if data loss detected

**Usage:**
```bash
cd backend
npm run migrate
```

### 2. backup-db.ts
**Purpose:** Create manual database backup

**Features:**
- Creates timestamped backup
- Stores in `backups/` folder
- Includes file size info

**Usage:**
```bash
cd backend
npm run db:backup
```

### 3. restore-db.ts
**Purpose:** Restore database from backup

**Features:**
- Lists all available backups
- Interactive selection
- Confirmation prompt
- Creates pre-restore backup

**Usage:**
```bash
cd backend
npm run db:restore
```

## Migration Workflow

### Creating a New Migration

```bash
# 1. Always backup first
npm run db:backup

# 2. Update Prisma schema
# Edit prisma/schema.prisma

# 3. Create migration (don't apply yet)
npm run migrate:create
# Enter migration name when prompted

# 4. Review the SQL
cat prisma/migrations/[timestamp]_[name]/migration.sql

# 5. Test migration
npm run migrate

# 6. Check integrity
# Review console output for any data loss warnings

# 7. If successful, commit
git add prisma/migrations
git commit -m "Migration: [description]"
```

## Best Practices

### ✅ Safe Operations
- `ADD COLUMN` with DEFAULT or NULL
- `CREATE TABLE`
- `CREATE INDEX`
- `ALTER TABLE ADD CONSTRAINT`

### ⚠️ Careful Operations
- `RENAME COLUMN` - Use multi-step approach
- `ALTER COLUMN TYPE` - May need data transformation
- `ADD NOT NULL` - Handle existing NULL values first

### ❌ Dangerous Operations
- `DROP COLUMN` - Permanent data loss!
- `DROP TABLE` - Permanent data loss!
- `TRUNCATE` - Deletes all data!

## Example: Safe Column Rename

**Wrong Way:**
```sql
ALTER TABLE items RENAME COLUMN old_name TO new_name;
```

**Right Way:**
```sql
-- Migration 1: Add new column
ALTER TABLE items ADD COLUMN new_name TEXT;

-- Migration 2: Copy data
UPDATE items SET new_name = old_name;

-- Migration 3: Drop old column (separate migration, after verification)
ALTER TABLE items DROP COLUMN old_name;
```

## Data Integrity Checks

The safe migration script checks record counts for:
- users
- categories
- items
- attributes
- attributeValues
- suppliers
- projects
- purchaseOrders
- billings

If any table shows reduced counts after migration:
1. Migration pauses
2. You're prompted to restore backup
3. Review the migration SQL
4. Fix the issue and retry

## Backup Storage

**Development:**
```
backend/backups/
├── backup-2026-01-28T10-30-00.db
├── backup-2026-01-28T10-30-00.json
└── manual-backup-2026-01-28T09-15-00.db
```

**Production (Electron app):**
```
%APPDATA%/Inventory Management System/backups/
~/Library/Application Support/Inventory Management System/backups/
~/.config/inventory-management-system/backups/
```

## Troubleshooting

### Migration Failed
1. Check error message in console
2. Review migration SQL file
3. Restore backup if needed: `npm run db:restore`
4. Fix schema and retry

### Data Loss Detected
1. Choose "yes" when prompted to restore
2. Review migration SQL for DROP/TRUNCATE commands
3. Rewrite migration to preserve data
4. Test again

### Cannot Find Backup
1. Check `backend/backups/` directory
2. Create manual backup: `npm run db:backup`
3. Verify DATABASE_URL environment variable

## Recovery Steps

If something goes wrong:

```bash
# 1. Stop all processes
# Press Ctrl+C in terminals

# 2. Restore from latest backup
npm run db:restore

# 3. Verify data
npm run dev
# Check the application

# 4. Fix migration issue
# Edit schema or migration SQL

# 5. Retry migration
npm run migrate
```

## Production Deployment

In production (Electron app), migrations run automatically on startup:

1. User installs update
2. App creates backup automatically
3. Runs pending migrations
4. Verifies data integrity
5. If issues, can restore backup

This ensures user data is never lost during updates!
