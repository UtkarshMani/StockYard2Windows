# Data Migration & Update System

## ✅ Implemented Features

Your Inventory Management System now has a **production-grade data migration system** that ensures:

1. **Data Persists Across Updates** - Database stored in user data directory
2. **Automatic Backups** - Before every update/migration
3. **Safe Migrations** - Rollback on failure
4. **Cross-Platform Support** - Works on Windows, macOS, and Linux

---

## 📂 Data Storage Locations

### Linux
```
~/.local/share/inventory-management-system/
├── inventory.db                    # Main database
├── inventory.db.backup-1737624000  # Backup 1
├── inventory.db.backup-1737625000  # Backup 2
└── ...                             # Up to 5 backups kept
```

### Windows
```
C:\Users\YourName\AppData\Roaming\InventoryManagement\
├── inventory.db
└── backups...
```

### macOS
```
~/Library/Application Support/InventoryManagement/
├── inventory.db
└── backups...
```

**⚠️ Important:** The database is now SEPARATE from the application files, so:
- ✅ Reinstalling the app won't delete your data
- ✅ Updating to a new version preserves all data
- ✅ You can backup the entire data folder easily

---

## 🔄 How Updates Work

### When User Installs an Update:

1. **Old app is replaced** with new version
2. **Database stays in user data folder** (untouched)
3. **App starts** and automatically:
   - Detects existing database
   - Creates backup (`.backup-timestamp`)
   - Runs any new migrations
   - Updates schema if needed
   - Validates data integrity
4. **If migration fails:**
   - Automatically restores from backup
   - Logs the error
   - User's data is safe

---

## 🛠️ For Developers: Making Schema Changes

### Step 1: Update Prisma Schema

Edit `backend/prisma/schema.prisma`:

```prisma
model Item {
  // ...existing fields...
  notes String?  // ← New field added
}
```

### Step 2: Create Migration

```bash
cd backend
npx prisma migrate dev --name add_item_notes
```

This creates a new migration file in `backend/prisma/migrations/`

### Step 3: Test Locally

```bash
# Test with existing database
npm run dev

# Check logs to see migration applied
# Look for: "✅ Database migrations completed successfully"
```

### Step 4: Build New Version

```bash
cd ..
npm run build:linux
```

### Step 5: Distribute

Users install the new `.deb` or run new `.AppImage`:
- Migration runs automatically
- Data is preserved
- New field is added

---

## 📦 Example Update Scenario

### Current Version: 1.0.0
- Items have: name, barcode, quantity, unitCost

### New Version: 1.1.0
- Want to add: warranty, serialNumber, notes

**What You Do:**

```prisma
model Item {
  // ...existing fields...
  warranty      String?
  serialNumber  String?
  notes         String?
}
```

```bash
npx prisma migrate dev --name add_warranty_and_notes
npm run build:linux
```

**What User Does:**

```bash
# Install update
sudo dpkg -i inventory-management-system_1.1.0_amd64.deb
```

**What Happens Automatically:**

```
🔄 Checking database migrations...
💾 Backup created: inventory.db.backup-1737624123
📊 Running migration: add_warranty_and_notes
✅ Migration completed successfully
✅ Server running on port 5000
💾 Using database: ~/.local/share/inventory-management-system/inventory.db

Existing items: ✅ All preserved
New fields: ✅ Added (null/empty for existing items)
Old data: ✅ Completely intact
```

---

## 🎯 Testing the Migration System

### Test 1: First Run (New Installation)

```bash
# Delete data directory to simulate first install
rm -rf ~/.local/share/inventory-management-system/

# Start app
npm run dev

# Expected output:
# 🆕 First run - creating new database...
# ✅ Database migrations completed successfully
```

### Test 2: Update Simulation

```bash
# 1. Create some test data in current version
# 2. Add new field to schema
# 3. Create migration
# 4. Restart app

# Expected output:
# 📊 Existing database found - checking for migrations...
# 💾 Backup created: inventory.db.backup-...
# ✅ Database migrations completed successfully
```

### Test 3: Verify Data Preserved

```bash
# After migration, check your items
# All existing data should be intact
# New fields should exist (as null/empty)
```

---

## 🔒 Backup System Details

### Automatic Backups

- **When:** Before every migration
- **Format:** `inventory.db.backup-<timestamp>`
- **Retention:** Last 5 backups kept
- **Storage:** Same directory as database

### Manual Backup (Future Enhancement)

Can add UI button to trigger manual backup:

```typescript
// In backend API
import { createManualBackup } from './utils/migration';

app.post('/api/backup/create', async (req, res) => {
  const backupPath = await createManualBackup();
  res.json({ success: true, backupPath });
});
```

### Restore from Backup (Manual)

If user needs to manually restore:

```bash
cd ~/.local/share/inventory-management-system/
cp inventory.db inventory.db.current  # Save current
cp inventory.db.backup-1737624123 inventory.db  # Restore backup
```

---

## 🚨 Troubleshooting

### Migration Fails

**Symptom:** App won't start, logs show migration error

**Solution:**
1. Check backup exists: `ls ~/.local/share/inventory-management-system/`
2. Restore manually (see above)
3. Report the error
4. Fix migration script
5. Release patch update

### Database Locked

**Symptom:** "Database is locked" error

**Solution:**
1. Close all instances of the app
2. Check for orphaned processes: `ps aux | grep inventory`
3. Kill if needed: `pkill -f inventory`
4. Restart app

### Data Not Appearing After Update

**Symptom:** App starts but shows no data

**Solution:**
1. Verify database exists: `ls -lh ~/.local/share/inventory-management-system/`
2. Check logs for migration errors
3. Database path in logs should match actual location
4. If mismatch, check environment variables

---

## 📊 Monitoring Migrations

### Check Current Schema Version

```bash
cd backend
npx prisma migrate status
```

Shows:
- Applied migrations
- Pending migrations
- Database schema state

### View Migration History

```bash
ls -la backend/prisma/migrations/
```

Each folder is a migration with:
- Timestamp
- Descriptive name
- SQL file

---

## 🎓 Best Practices

### For Schema Changes

✅ **DO:**
- Make changes backward compatible when possible
- Add new fields as optional (nullable)
- Test migrations on copy of production database
- Keep migrations small and focused
- Document breaking changes

❌ **DON'T:**
- Delete fields users depend on
- Rename fields without data migration
- Make required fields without defaults
- Skip migration testing

### For Releases

✅ **DO:**
- Increment version number
- Test update path from previous version
- Provide rollback instructions
- Announce breaking changes
- Keep changelog updated

❌ **DON'T:**
- Deploy untested migrations
- Skip backup testing
- Make multiple schema changes in one release
- Forget to document changes

---

## 📈 Version Update Checklist

Before releasing update:

- [ ] Schema changes made in Prisma
- [ ] Migration created and tested
- [ ] Backup system verified
- [ ] Rollback tested
- [ ] Version number bumped
- [ ] CHANGELOG.md updated
- [ ] Build tested
- [ ] Installation tested
- [ ] Data preservation verified
- [ ] Documentation updated

---

## 🔐 Data Safety Guarantee

With this system:

1. **Data never lost during updates** ✅
2. **Automatic backups before changes** ✅
3. **Rollback on failure** ✅
4. **Separate from app files** ✅
5. **Easy to backup manually** ✅
6. **Cross-platform compatible** ✅

Your users can confidently update without fear of losing data! 🎉
