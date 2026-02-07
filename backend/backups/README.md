# Database Backups

This directory contains automatic and manual database backups.

## Backup Files

- `backup-[timestamp].db` - Database backup file
- `backup-[timestamp].json` - Metadata file with record counts and migration version

## Usage

### Create Manual Backup
```bash
npm run db:backup
```

### Restore from Backup
```bash
npm run db:restore
```

### Safe Migration (with auto-backup)
```bash
npm run migrate
```

## Backup Retention

- Keep at least the last 5 backups
- Delete old backups manually when needed
- Before major updates, create a manual backup

## Important Notes

- Backups are created automatically before migrations
- Always verify backup files exist before major changes
- In production, backups are stored in the user's app data folder
