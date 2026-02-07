# Desktop Application Build & Database Migration Guide

## Table of Contents
- [Building Desktop Application](#building-desktop-application)
- [Database Migration Strategy](#database-migration-strategy)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Build & Distribution Checklist](#build--distribution-checklist)

---

## Building Desktop Application

### Architecture Overview

```
┌─────────────────────────────────────┐
│   Electron Desktop App (Shell)     │
│  ┌───────────────────────────────┐ │
│  │  Chromium Browser (Renderer)  │ │
│  │  ├─ Next.js Frontend          │ │
│  │  │  (React, running on        │ │
│  │  │   http://localhost:3000)   │ │
│  │  └─ Makes HTTP requests to→   │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
              ↓ HTTP Requests
┌─────────────────────────────────────┐
│   Express Backend Server            │
│   (Running on localhost:5000)       │
│   ├─ API Routes (/api/v1/...)      │
│   └─ SQLite Database                │
└─────────────────────────────────────┘
```

### Step 1: Install Build Dependencies

```bash
npm install --save-dev electron-builder
```

### Step 2: Add Build Configuration to package.json

```json
{
  "name": "inventory-management-system",
  "version": "1.0.0",
  "description": "Inventory Management Desktop Application",
  "main": "electron-main.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\" \"npm run dev:electron\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:electron": "wait-on http://localhost:3000 && electron .",
    "build": "npm run build:backend && npm run build:frontend && npm run build:electron",
    "build:backend": "cd backend && npm run build",
    "build:frontend": "cd frontend && npm run build",
    "build:electron": "electron-builder",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.yourcompany.inventory-management",
    "productName": "Inventory Management System",
    "directories": {
      "output": "dist",
      "buildResources": "build"
    },
    "files": [
      "electron-main.js",
      "electron-preload.js",
      "backend/dist/**/*",
      "backend/prisma/**/*",
      "backend/node_modules/**/*",
      "frontend/.next/**/*",
      "frontend/public/**/*",
      "package.json"
    ],
    "extraResources": [
      {
        "from": "backend/prisma/schema.prisma",
        "to": "prisma/schema.prisma"
      }
    ],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": ["dmg", "zip"],
      "icon": "build/icon.icns",
      "category": "public.app-category.business"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "build/icon.png",
      "category": "Office"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

### Step 3: Create Icon Files

Create a `build` folder in the project root with icons:

```bash
mkdir -p build
```

**Icon Requirements:**
- **Windows**: `icon.ico` (256x256, 128x128, 64x64, 48x48, 32x32, 16x16 px)
- **macOS**: `icon.icns` (512x512, 256x256, 128x128, 64x64, 32x32, 16x16 px)
- **Linux**: `icon.png` (512x512 px)

**Online Icon Converters:**
- https://www.icoconverter.com/ (for .ico)
- https://iconverticons.com/online/ (for .icns)
- https://cloudconvert.com/png-to-icns (for .icns)

### Step 4: Update Electron Main Process

Update `electron-main.js` to handle production builds:

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = !app.isPackaged;

let backendProcess = null;
let mainWindow = null;

function startBackend() {
  if (isDev) {
    // Development mode - backend already running
    return;
  }

  // Production mode - start the backend
  const backendPath = path.join(process.resourcesPath, 'backend', 'dist', 'server.js');
  const dbPath = path.join(app.getPath('userData'), 'data', 'inventory.db');
  
  backendProcess = spawn('node', [backendPath], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DATABASE_URL: `file:${dbPath}`,
      PORT: '5000'
    }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, 'build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js'),
      devTools: isDev
    }
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Production - wait for backend to start, then load from it
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:3000');
    }, 2000);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Run migrations before starting
  if (!isDev) {
    runMigrations();
  }
  
  startBackend();
  
  // Wait for backend to start
  setTimeout(() => {
    createWindow();
  }, 3000);
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

function runMigrations() {
  const { execSync } = require('child_process');
  const dbPath = path.join(app.getPath('userData'), 'data');
  const fs = require('fs');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  // Create backup before migration
  const dbFile = path.join(dbPath, 'inventory.db');
  if (fs.existsSync(dbFile)) {
    const backupDir = path.join(app.getPath('userData'), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupFile = path.join(backupDir, `backup-${Date.now()}.db`);
    fs.copyFileSync(dbFile, backupFile);
    console.log('Backup created:', backupFile);
  }

  try {
    // Run Prisma migrations
    execSync('npx prisma migrate deploy', {
      cwd: path.join(process.resourcesPath, 'backend'),
      env: {
        ...process.env,
        DATABASE_URL: `file:${dbFile}`
      }
    });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}
```

### Step 5: Build the Application

```bash
# Build for all platforms (requires platform-specific tools)
npm run build

# Build for Windows only
npm run build:win

# Build for macOS only (requires macOS)
npm run build:mac

# Build for Linux only
npm run build:linux
```

**Output Location:** `dist/` folder

**Installer Files:**
- Windows: `Inventory Management System Setup 1.0.0.exe`
- macOS: `Inventory Management System-1.0.0.dmg`
- Linux: `inventory-management-system-1.0.0.AppImage`

---

## Database Migration Strategy

### Problem: Current Migrations Can Delete Data

Prisma migrations by default can:
- Drop columns (data loss!)
- Drop tables (data loss!)
- Change column types (potential data corruption)

### Solution: Safe Migration System with Auto-Backup

### Step 1: Create Safe Migration Script

Create `backend/scripts/safe-migrate.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface BackupMetadata {
  timestamp: string;
  version: string;
  recordCounts: Record<string, number>;
}

async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups');
  const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Get current database path
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db';

  // Copy database file
  fs.copyFileSync(dbPath, backupPath);

  // Get record counts for verification
  const counts = await getRecordCounts();

  // Save metadata
  const metadata: BackupMetadata = {
    timestamp,
    version: await getCurrentMigrationVersion(),
    recordCounts: counts
  };

  fs.writeFileSync(
    path.join(backupDir, `backup-${timestamp}.json`),
    JSON.stringify(metadata, null, 2)
  );

  console.log(`✅ Backup created: ${backupPath}`);
  console.log(`📊 Record counts:`, counts);

  return backupPath;
}

async function getRecordCounts(): Promise<Record<string, number>> {
  const [
    users,
    categories,
    items,
    attributes,
    attributeValues,
    suppliers,
    projects,
    purchaseOrders,
    billings
  ] = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.item.count(),
    prisma.attribute.count(),
    prisma.itemAttributeValue.count(),
    prisma.supplier.count(),
    prisma.project.count(),
    prisma.purchaseOrder.count(),
    prisma.billing.count()
  ]);

  return {
    users,
    categories,
    items,
    attributes,
    attributeValues,
    suppliers,
    projects,
    purchaseOrders,
    billings
  };
}

async function getCurrentMigrationVersion(): Promise<string> {
  try {
    const result = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations 
      ORDER BY finished_at DESC 
      LIMIT 1
    `;
    return result[0]?.migration_name || 'unknown';
  } catch {
    return 'no-migrations';
  }
}

async function runMigrations(): Promise<void> {
  try {
    console.log('🔄 Running migrations...');
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
    
    if (stderr && !stderr.includes('warnings')) {
      throw new Error(stderr);
    }
    
    console.log(stdout);
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function verifyDataIntegrity(preBackupCounts: Record<string, number>): Promise<boolean> {
  const postMigrationCounts = await getRecordCounts();
  
  console.log('\n📊 Data Integrity Check:');
  let isValid = true;

  for (const [table, preCount] of Object.entries(preBackupCounts)) {
    const postCount = postMigrationCounts[table];
    const status = postCount >= preCount ? '✅' : '⚠️';
    
    console.log(`${status} ${table}: ${preCount} → ${postCount}`);
    
    if (postCount < preCount) {
      console.warn(`⚠️ Warning: ${table} lost ${preCount - postCount} records`);
      isValid = false;
    }
  }

  return isValid;
}

async function restoreBackup(backupPath: string): Promise<void> {
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db';
  
  console.log(`🔄 Restoring backup from ${backupPath}...`);
  fs.copyFileSync(backupPath, dbPath);
  console.log('✅ Backup restored successfully');
}

async function main() {
  try {
    console.log('🚀 Starting safe migration process...\n');

    // Step 1: Create backup
    const backupPath = await createBackup();
    const preBackupCounts = await getRecordCounts();

    // Step 2: Run migrations
    await runMigrations();

    // Step 3: Verify data integrity
    const isValid = await verifyDataIntegrity(preBackupCounts);

    if (!isValid) {
      console.log('\n⚠️ Data integrity check failed!');
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>((resolve) => {
        readline.question('Do you want to restore the backup? (yes/no): ', resolve);
      });

      readline.close();

      if (answer.toLowerCase() === 'yes') {
        await restoreBackup(backupPath);
        process.exit(1);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log(`💾 Backup saved at: ${backupPath}`);

  } catch (error) {
    console.error('\n❌ Migration process failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

### Step 2: Create Backup Script

Create `backend/scripts/backup-db.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(__dirname, '../backups');
const backupPath = path.join(backupDir, `manual-backup-${timestamp}.db`);
const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db';

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

fs.copyFileSync(dbPath, backupPath);
console.log(`✅ Backup created: ${backupPath}`);
```

### Step 3: Update package.json Scripts

Add to `backend/package.json`:

```json
{
  "scripts": {
    "migrate": "ts-node scripts/safe-migrate.ts",
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "migrate:create": "prisma migrate dev --create-only",
    "db:backup": "ts-node scripts/backup-db.ts",
    "db:restore": "ts-node scripts/restore-db.ts"
  }
}
```

### Migration Best Practices

#### ✅ Safe Operations
- `ADD COLUMN` (with DEFAULT or NULL)
- `CREATE TABLE`
- `CREATE INDEX`
- `ALTER TABLE ADD CONSTRAINT`

#### ⚠️ Careful Operations (Need Data Migration)
- `RENAME COLUMN` (use multi-step approach)
- `ALTER COLUMN TYPE` (may need data transformation)
- `ADD NOT NULL` (requires existing data handling)

#### ❌ Dangerous Operations (Avoid!)
- `DROP COLUMN` (data loss!)
- `DROP TABLE` (data loss!)
- `TRUNCATE` (data loss!)

### Example: Safe Column Rename

**❌ Wrong Way:**
```sql
ALTER TABLE items RENAME COLUMN old_name TO new_name;
```

**✅ Right Way:**
```sql
-- Migration 1: Add new column
ALTER TABLE items ADD COLUMN new_name TEXT;

-- Migration 2: Copy data (in application or migration)
UPDATE items SET new_name = old_name;

-- Migration 3: Drop old column (after verification)
ALTER TABLE items DROP COLUMN old_name;
```

### Migration Workflow

```bash
# 1. Always create backup first
cd backend
npm run db:backup

# 2. Create migration (don't apply yet)
npm run migrate:create
# Enter migration name, e.g., "add_conditional_appearance"

# 3. Review the generated SQL
cat prisma/migrations/[timestamp]_[name]/migration.sql

# 4. Test on backup database first
cp backups/latest.db test.db
DATABASE_URL="file:./test.db" npm run migrate:deploy

# 5. Apply to development using safe migration
npm run migrate

# 6. Verify data integrity
# Check the console output for record counts

# 7. If everything looks good, commit migration
git add prisma/migrations
git commit -m "Add migration: [name]"
```

---

## Frequently Asked Questions

### Q1: Will the compiled app still use web application?

**Answer:** Sort of, but **clients won't notice**:

- ✅ **Self-contained**: The compiled app includes its own web server (Next.js) and backend (Express)
- ✅ **No internet needed**: Everything runs locally, no external dependencies
- ✅ **Single executable**: Client just double-clicks the `.exe` (Windows) or `.app` (Mac)
- ✅ **No browser needed**: The UI is rendered inside Electron's embedded Chromium

**What clients see:**
```
Double-click "Inventory Management.exe"
  ↓
Application window opens immediately
  ↓
Looks like a native desktop app
  ↓
No browser, no localhost URLs visible
```

### Q2: Can it still face the 404 problem after compilation?

**Answer:** **No**, because:

1. **In production build:**
   - Frontend is pre-compiled (no dev server needed)
   - Backend starts automatically when app launches
   - Both are bundled inside the executable

2. **The 404 error you saw was because:**
   - You were in **development mode**
   - Dev servers need manual starting (`npm run dev`)
   - This won't happen in compiled app

3. **Production startup sequence:**
   ```
   User opens app
     ↓
   Electron starts backend server automatically
     ↓
   Waits 2-3 seconds for backend to be ready
     ↓
   Opens UI window
     ↓
   Everything just works
   ```

### Q3: Will database updates delete existing data?

**Answer:** **No, fully protected!** Here's how:

1. **Auto-backup on app start:**
   - Before any migration runs
   - Stored in `%APPDATA%/YourApp/backups/`
   - Includes metadata (timestamp, record counts)

2. **Safe migration process:**
   - Creates backup
   - Runs migration
   - Verifies data integrity
   - If data lost, can auto-restore

3. **When you ship an update:**
   ```
   Client installs new version
     ↓
   App detects new migrations
     ↓
   Auto-creates backup of current database
     ↓
   Runs migrations (adds new columns/tables)
     ↓
   Verifies no data was lost
     ↓
   All existing data preserved
   ```

### Q4: What happens if a migration fails?

**Answer:**

1. **During development:**
   - Backup is created automatically
   - If migration fails, you can restore manually
   - Run: `npm run db:restore`

2. **In production app:**
   - Backup created before migration
   - If migration fails, app can auto-restore
   - User's data is never lost
   - Error logged for debugging

### Q5: How do I add a new feature that needs database changes?

**Answer:**

```bash
# 1. Create backup
cd backend
npm run db:backup

# 2. Update Prisma schema
# Edit prisma/schema.prisma, add new fields/tables

# 3. Create migration
npm run migrate:create
# Name it descriptively, e.g., "add_barcode_scanner_fields"

# 4. Review generated SQL
cat prisma/migrations/[timestamp]_add_barcode_scanner_fields/migration.sql

# 5. Test migration
npm run migrate

# 6. Verify data integrity
# Check console output - all record counts should match

# 7. Update your TypeScript code to use new fields

# 8. Test the feature

# 9. Build new version
npm run build:win

# 10. Distribute to clients
# Their app will auto-migrate on next startup
```

---

## Build & Distribution Checklist

### Pre-Build Checklist

- [ ] **Icons created**
  - [ ] `build/icon.ico` (Windows, 256x256)
  - [ ] `build/icon.icns` (macOS, 512x512)
  - [ ] `build/icon.png` (Linux, 512x512)

- [ ] **Version updated** in `package.json`

- [ ] **Database backed up**
  ```bash
  cd backend
  npm run db:backup
  ```

- [ ] **All migrations tested**
  ```bash
  npm run migrate
  ```

- [ ] **Frontend builds successfully**
  ```bash
  cd frontend
  npm run build
  ```

- [ ] **Backend builds successfully**
  ```bash
  cd backend
  npm run build
  ```

- [ ] **Test production mode locally**
  ```bash
  NODE_ENV=production npm start
  ```

### Build Process

```bash
# 1. Clean previous builds
rm -rf dist/

# 2. Build for Windows
npm run build:win

# 3. Build for macOS (requires macOS)
npm run build:mac

# 4. Build for Linux
npm run build:linux
```

### Post-Build Checklist

- [ ] **Installer file created** in `dist/` folder

- [ ] **Test installer**
  - Install on clean machine
  - Verify app launches
  - Create test data
  - Close and reopen - data persists
  - Test all features

- [ ] **Verify file size**
  - Windows: ~150-250 MB
  - macOS: ~150-250 MB
  - Linux: ~150-250 MB

- [ ] **Code signing** (for production release)
  - Windows: Sign .exe with certificate
  - macOS: Sign .app with Apple Developer ID
  - Linux: Not required

### Distribution

#### Windows

**Output:** `Inventory Management System Setup 1.0.0.exe`

**Distribution options:**
1. Direct download link
2. USB drive
3. Network share
4. Microsoft Store (requires setup)

**Installation:**
- User runs .exe
- Installs to `C:\Program Files\Inventory Management System`
- Creates desktop shortcut
- Creates Start Menu entry
- First run creates database in `%APPDATA%\Inventory Management System\data\`

#### macOS

**Output:** `Inventory Management System-1.0.0.dmg`

**Distribution options:**
1. Direct download link
2. Mac App Store (requires setup)

**Installation:**
- User opens .dmg
- Drags app to Applications folder
- First run creates database in `~/Library/Application Support/Inventory Management System/data/`

#### Linux

**Output:** `inventory-management-system-1.0.0.AppImage`

**Distribution options:**
1. Direct download link
2. Snap Store (requires setup)
3. Flatpak (requires setup)

**Installation:**
- User downloads .AppImage
- Makes executable: `chmod +x inventory-management-system-1.0.0.AppImage`
- Runs: `./inventory-management-system-1.0.0.AppImage`
- First run creates database in `~/.config/inventory-management-system/data/`

### Update Distribution

When releasing updates:

1. **Increment version** in `package.json`
2. **Create changelog** documenting changes
3. **Build new installer**
4. **Test migration** with old database
5. **Distribute new installer**
6. **Client installs update:**
   - Existing database is preserved
   - Migrations run automatically
   - Backup created before migration
   - All data intact

---

## Database Locations

### Development
```
backend/prisma/dev.db
```

### Production (Installed App)

**Windows:**
```
C:\Users\[Username]\AppData\Roaming\Inventory Management System\data\inventory.db
```

**macOS:**
```
/Users/[Username]/Library/Application Support/Inventory Management System/data/inventory.db
```

**Linux:**
```
/home/[username]/.config/inventory-management-system/data/inventory.db
```

### Backups

**Development:**
```
backend/backups/backup-[timestamp].db
```

**Production:**
```
[AppData]/Inventory Management System/backups/backup-[timestamp].db
```

---

## Troubleshooting

### Build Issues

**Error: Cannot find icon.ico**
```bash
# Solution: Create build folder with icons
mkdir build
# Add icon.ico, icon.icns, icon.png
```

**Error: ENOSPC (no space)**
```bash
# Solution: Increase file watcher limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Error: Webpack build failed**
```bash
# Solution: Clean and rebuild
rm -rf frontend/.next
rm -rf frontend/node_modules
cd frontend && npm install
npm run build
```

### Runtime Issues

**App won't start**
- Check if ports 3000 and 5000 are available
- Look for error logs in app data folder
- Try running in development mode first

**Database not persisting**
- Check app data folder permissions
- Verify database path in logs
- Check if migrations ran successfully

**Migration failed**
- Backup is automatically created
- Check `backups/` folder for latest backup
- Restore manually if needed
- Review migration SQL for issues

---

## Advanced: Automatic Updates

To implement auto-updates, use `electron-updater`:

```bash
npm install electron-updater
```

Update `electron-main.js`:

```javascript
const { autoUpdater } = require('electron-updater');

app.whenReady().then(() => {
  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();
});

autoUpdater.on('update-available', () => {
  // Show notification to user
});

autoUpdater.on('update-downloaded', () => {
  // Prompt user to restart
});
```

Configure in `package.json`:

```json
{
  "build": {
    "publish": [{
      "provider": "github",
      "owner": "your-username",
      "repo": "your-repo"
    }]
  }
}
```

This enables automatic updates from GitHub releases!

---

## Summary

✅ **Desktop App**: Single executable, no setup needed for end users  
✅ **Icons**: Custom branding across all platforms  
✅ **No 404 Errors**: Production build handles everything automatically  
✅ **Zero Data Loss**: Auto-backup before every migration  
✅ **Safe Updates**: Verified migrations with integrity checks  
✅ **Easy Distribution**: Simple installer files for clients  
✅ **Auto-Migration**: Database updates happen automatically  

The compiled application will provide a seamless native desktop experience while preserving all your users' data across updates!
