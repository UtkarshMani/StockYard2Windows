# Production Preparation Guide

## Overview
This guide will help you prepare the Inventory Management System for production deployment and conversion into an installable software package.

## Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- All dependencies installed

## Step 1: Database Cleanup

### Automated Cleanup (Recommended)

Run the automated cleanup script:

```bash
./production-cleanup.sh
```

This will:
- ✅ Backup current database to `backend/prisma/backups/`
- ✅ Remove all test/development data
- ✅ Create fresh database with production schema
- ✅ Setup admin user with default permissions
- ✅ Add default categories

### Manual Cleanup (Alternative)

If you prefer manual control:

```bash
cd backend

# 1. Backup current database
npm run db:backup

# 2. Run production cleanup
npm run db:cleanup

# 3. Verify database
npm run db:seed:production
```

## Step 2: Default Admin Credentials

After cleanup, the system will have one admin user:

```
Email: admin@build.com
Password: admin123
```

**⚠️ IMPORTANT:** 
- Change this password immediately after first login
- The password is weak and only for initial setup
- Never deploy to production with default credentials

## Step 3: Verify Application

### Test Backend
```bash
cd backend
npm run dev
```
- Backend should start on http://localhost:5000
- Verify API health: http://localhost:5000/api/health

### Test Frontend
```bash
cd frontend
npm run dev
```
- Frontend should start on http://localhost:3000
- Login with admin credentials
- Verify all features work correctly

## Step 4: Build for Production

### Build Backend
```bash
cd backend
npm run build
```

This will:
- Compile TypeScript to JavaScript
- Generate Prisma client
- Output to `backend/dist/`

### Build Frontend
```bash
cd frontend
npm run build
```

This will:
- Create optimized production build
- Output to `frontend/.next/`

## Step 5: Create Desktop Application

### Linux
```bash
chmod +x build-linux.sh
./build-linux.sh
```

Output: `dist/inventory-management-*.AppImage` or `.deb`

### Windows
```bash
# On Windows (PowerShell):
.\build-windows.bat

# On Linux/Mac with Wine:
./build-windows.sh
```

Output: `dist/inventory-management-*.exe`

## Step 6: Test Desktop Application

1. Install the generated package
2. Run the application
3. Verify all features:
   - ✅ User authentication
   - ✅ Inventory management
   - ✅ Projects
   - ✅ Purchase orders
   - ✅ Gate passes
   - ✅ Reports

## Database Structure (Production)

The clean database includes:

### Default Data
- 1 Admin user (admin@build.com)
- 6 Default categories:
  - General
  - Electrical
  - Plumbing
  - Construction
  - Tools
  - Safety

### Empty Tables Ready for Data
- Users (1 admin)
- Projects
- Inventory Items
- Purchase Orders
- Gate Passes
- Suppliers
- Stock Movements
- Audit Logs

## Security Checklist

Before deployment, verify:

- [ ] Default admin password has been changed
- [ ] JWT_SECRET is set to a strong random value
- [ ] Database file permissions are restricted
- [ ] CORS settings are configured for production
- [ ] Rate limiting is enabled
- [ ] Input validation is working
- [ ] Audit logging is functional

## File Locations (Production)

### Linux
```
Application: /usr/share/inventory-management/
Database: ~/.local/share/inventory-management/dev.db
Logs: ~/.local/share/inventory-management/logs/
```

### Windows
```
Application: C:\Program Files\Inventory Management\
Database: %APPDATA%\inventory-management\dev.db
Logs: %APPDATA%\inventory-management\logs\
```

## Backup Strategy

### Before Distribution
1. Current backup: `backend/prisma/backups/pre-cleanup-*.db`
2. Keep this backup for rollback if needed

### For End Users
Recommend setting up automatic backups:
```bash
# Daily backup (add to crontab)
0 2 * * * cd /path/to/app && npm run db:backup
```

## Troubleshooting

### Database Issues
```bash
# Reset database
cd backend
npm run db:cleanup

# Restore from backup
npm run db:restore
```

### Build Issues
```bash
# Clean and rebuild
cd backend
rm -rf dist node_modules
npm install
npm run build

cd ../frontend
rm -rf .next node_modules
npm install
npm run build
```

### Permission Issues (Linux)
```bash
chmod +x production-cleanup.sh
chmod +x build-linux.sh
chmod +x start-desktop.sh
```

## Version Information

Document the version being deployed:
```bash
# Backend version
cd backend
npm version

# Frontend version
cd frontend
npm version
```

## Distribution Checklist

Before distributing to end users:

- [ ] Database is cleaned and production-ready
- [ ] Default credentials documented in user manual
- [ ] Application builds successfully
- [ ] All features tested and working
- [ ] Security checklist completed
- [ ] User documentation created
- [ ] Installation instructions included
- [ ] Backup/restore procedures documented
- [ ] Support contact information added
- [ ] License information included

## Post-Installation Steps (For End Users)

1. Install the application
2. Start the application
3. Login with default credentials:
   - Email: admin@build.com
   - Password: admin123
4. **Immediately change the admin password**
5. Create additional users as needed
6. Configure organization settings
7. Start adding inventory data

## Support

For issues or questions:
- Check logs in the logs directory
- Review error messages in the UI
- Consult the user documentation
- Contact technical support

## Build Versions

Keep track of releases:
```
Version: 1.0.0
Build Date: [Current Date]
Database Schema: Latest migration
Node.js: v18+
Electron: Latest stable
```

---

**Last Updated:** 2026-02-06
**Status:** Ready for Production
