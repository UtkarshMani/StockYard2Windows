# Desktop Application Deployment Guide

## Overview

This guide covers building, testing, and deploying the Inventory Management System as a Windows desktop application.

---

## 📦 Build Process

### Prerequisites

- Node.js 18+ installed
- npm 9+ installed
- Windows 10/11 for testing (can build on Linux/Mac)
- 4 GB RAM minimum
- 2 GB free disk space

### Building on Windows

```batch
REM Install all dependencies
npm install

REM Build backend
cd backend
npm run build
npx prisma generate
cd ..

REM Build frontend
cd frontend
npm run build
cd ..

REM Create Windows installer
npm run build:win
```

Or simply run:
```batch
build-windows.bat
```

### Building on Linux/Mac (Cross-Platform)

```bash
# Install dependencies
npm install

# Build everything
npm run build

# Create Windows installer (cross-compile)
npm run build:win
```

Or use:
```bash
chmod +x build-windows.sh
./build-windows.sh
```

---

## 📂 Build Output

After successful build, find installers in `dist/` folder:

```
dist/
├── Inventory Management System-1.0.0-Setup.exe       # ~120 MB
│   ├── NSIS Installer
│   ├── Auto-update enabled
│   ├── Install to Program Files
│   └── Creates shortcuts
│
├── Inventory Management System-1.0.0-Portable.exe    # ~120 MB
│   ├── Single executable
│   ├── No installation needed
│   ├── Run from any location
│   └── Data stored in same folder
│
└── win-unpacked/                                      # Development test folder
    ├── Inventory Management System.exe
    ├── resources/
    └── ...
```

---

## 🔍 Testing Before Distribution

### Test Build Locally

```bash
# After building, test the unpacked version
cd dist/win-unpacked
"Inventory Management System.exe"
```

### Test Checklist

- [ ] Application launches without errors
- [ ] Database is created in AppData folder
- [ ] Can register admin user
- [ ] Can login successfully
- [ ] Can add items
- [ ] Can perform stock in/out
- [ ] Barcode scanner works (webcam)
- [ ] Audit logs are recorded
- [ ] Application closes cleanly
- [ ] Can restart and data persists
- [ ] Check logs for errors

### Test Database Location

**Regular Install:**
```
C:\Users\<Username>\AppData\Roaming\inventory-management-desktop\
├── database.db
├── logs/
│   ├── combined.log
│   └── error.log
```

**Portable:**
```
[ExecutableDirectory]\
├── Inventory Management System.exe
├── data\
│   └── database.db
└── logs\
```

---

## 🎯 Distribution Methods

### Method 1: Direct Download (Recommended for Internal Use)

1. **Upload installers** to:
   - Company file server
   - SharePoint
   - Google Drive / OneDrive
   - FTP server

2. **Share download link** with users

3. **Provide instructions**:
   ```
   1. Download "Inventory Management System-1.0.0-Setup.exe"
   2. Right-click → Run as Administrator
   3. Follow installation wizard
   4. Launch from desktop shortcut
   ```

### Method 2: USB Distribution

1. Copy installer to USB drives
2. Distribute to warehouses/sites
3. Install offline
4. No internet required

### Method 3: Network Installation

1. Place installer on network share
2. Users run from network location
3. Good for multiple installations

### Method 4: GitHub Releases (For Open Source)

```bash
# Create GitHub release
gh release create v1.0.0 \
  dist/Inventory\ Management\ System-1.0.0-Setup.exe \
  dist/Inventory\ Management\ System-1.0.0-Portable.exe \
  --title "Version 1.0.0" \
  --notes "Initial release"
```

---

## 🔄 Auto-Update Setup

### Configure Update Server

Edit `electron-builder.json`:

```json
{
  "publish": {
    "provider": "github",
    "owner": "your-organization",
    "repo": "inventory-management",
    "private": false
  }
}
```

Or use generic server:

```json
{
  "publish": {
    "provider": "generic",
    "url": "https://your-server.com/updates"
  }
}
```

### Publish Update

1. **Build new version**:
   ```bash
   # Update version in package.json first
   npm version patch  # 1.0.0 → 1.0.1
   npm run build:win
   ```

2. **Upload to update server**:
   - Upload new installer
   - Upload `latest.yml` file (auto-generated)

3. **Users get notification**:
   - App checks on startup
   - "Update available" dialog
   - Downloads and installs automatically

---

## 📝 Version Management

### Semantic Versioning

Follow semantic versioning: `MAJOR.MINOR.PATCH`

```bash
# Patch release (bug fixes)
npm version patch  # 1.0.0 → 1.0.1

# Minor release (new features)
npm version minor  # 1.0.1 → 1.1.0

# Major release (breaking changes)
npm version major  # 1.1.0 → 2.0.0
```

### Changelog

Keep `CHANGELOG.md` updated:

```markdown
## [1.0.1] - 2026-02-01

### Fixed
- Fixed barcode scanner camera permission issue
- Resolved database locking on concurrent operations

### Changed
- Improved startup performance

## [1.0.0] - 2026-01-22

### Added
- Initial release
- Barcode scanning with webcam/USB
- Stock in/out operations
- Project management
- Audit logging
```

---

## 🔐 Code Signing (Optional but Recommended)

### Why Code Sign?

- ✅ Windows SmartScreen won't block
- ✅ Users trust the software
- ✅ Proves authenticity
- ✅ Professional appearance

### How to Sign

1. **Get Code Signing Certificate**:
   - Purchase from DigiCert, Sectigo, etc.
   - Cost: ~$200-400/year
   - Requires business verification

2. **Configure electron-builder**:

   Edit `electron-builder.json`:
   ```json
   {
     "win": {
       "certificateFile": "path/to/certificate.pfx",
       "certificatePassword": "password",
       "signingHashAlgorithms": ["sha256"],
       "sign": "./sign.js"
     }
   }
   ```

3. **Build with signing**:
   ```bash
   npm run build:win
   ```

### Without Code Signing

Users will see "Unknown Publisher" warning:
- They need to click "More info" → "Run anyway"
- This is normal for unsigned apps
- Document this in installation guide

---

## 📊 Build Configuration

### Customize electron-builder.json

```json
{
  "appId": "com.yourcompany.inventorymanagement",
  "productName": "Your Company Inventory",
  "copyright": "Copyright © 2026 Your Company",
  "win": {
    "icon": "build/icon.ico",
    "target": ["nsis", "portable"],
    "publisherName": "Your Company Name"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Your Inventory System"
  }
}
```

### Custom Icons

Place in `build/` folder:
- `icon.ico` - Windows icon (256x256)
- `icon.png` - Fallback PNG
- `installerHeader.bmp` - Installer header (150x57)
- `installerSidebar.bmp` - Installer sidebar (164x314)

---

## 🌐 Multi-Language Support (Future)

```javascript
// In electron-main.js
const locale = app.getLocale(); // 'en-US', 'es-ES', etc.

// Load appropriate language file
const translations = require(`./locales/${locale}.json`);
```

---

## 📈 Analytics & Telemetry (Optional)

### Track Usage

```javascript
// Add to electron-main.js
const analytics = require('electron-google-analytics');

app.on('ready', () => {
  analytics.send('screenview', { cd: 'Dashboard' });
});
```

### Privacy Considerations

- Get user consent
- No personal data
- Only feature usage
- Opt-in, not opt-out

---

## 🐛 Debugging Production Builds

### Enable DevTools in Production

Edit `electron-main.js`:

```javascript
const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

if (isDev) {
  mainWindow.webContents.openDevTools();
}
```

Launch with debug:
```bash
set DEBUG=true && "Inventory Management System.exe"
```

### View Logs

**User logs location:**
```
C:\Users\<Username>\AppData\Roaming\inventory-management-desktop\logs\
```

**Enable verbose logging:**

Edit `backend/src/utils/logger.ts`:
```typescript
level: process.env.DEBUG ? 'debug' : 'info'
```

---

## 📦 Portable vs Installer

### When to Use Portable

✅ **Use Portable For:**
- USB stick installations
- Testing without installation
- Shared computers
- Quick demos
- No admin rights

❌ **Don't Use Portable For:**
- Production deployments
- Multi-user systems
- When auto-update needed
- When shortcuts required

### When to Use Installer

✅ **Use Installer For:**
- Production deployments
- Company-wide rollout
- Need auto-updates
- Multi-user systems
- Professional appearance

---

## 🔒 Security Checklist

### Before Distribution

- [ ] Remove debug code
- [ ] Change JWT secrets
- [ ] Remove development tools
- [ ] Test with antivirus
- [ ] Verify HTTPS only
- [ ] Check file permissions
- [ ] Test on clean Windows install
- [ ] Scan for vulnerabilities
- [ ] Review error messages (no sensitive data)
- [ ] Test database encryption (if applicable)

### Runtime Security

- [ ] Database in AppData (not Program Files)
- [ ] Encrypted JWT tokens
- [ ] HTTPS for any network calls
- [ ] No hardcoded passwords
- [ ] Sanitize all inputs
- [ ] Role-based access control

---

## 📤 Deployment Checklist

### Pre-Release

- [ ] Update version number
- [ ] Update changelog
- [ ] Test on clean machine
- [ ] Test install/uninstall
- [ ] Test upgrade from previous version
- [ ] Check database migrations
- [ ] Review all documentation
- [ ] Test barcode scanner
- [ ] Test all user roles
- [ ] Performance testing

### Release

- [ ] Build installers
- [ ] Test installers
- [ ] Create release notes
- [ ] Upload to distribution point
- [ ] Update download links
- [ ] Notify users
- [ ] Monitor for issues

### Post-Release

- [ ] Monitor error logs
- [ ] Collect user feedback
- [ ] Track installation success rate
- [ ] Check for crash reports
- [ ] Plan next release

---

## 🆘 Common Build Issues

### "Cannot find module" errors

```bash
# Clean and reinstall
rm -rf node_modules
rm -rf backend/node_modules
rm -rf frontend/node_modules
npm install
```

### "Prisma Client not generated"

```bash
cd backend
npx prisma generate
cd ..
npm run build:win
```

### "Build failed - out of memory"

```bash
# Increase Node.js memory
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run build:win
```

### "Windows Defender blocks installer"

- This is normal for unsigned apps
- Add exception to Windows Defender
- Or get code signing certificate

---

## 📞 Support

For build issues:
1. Check logs in `dist/`
2. Review error messages
3. Check GitHub issues
4. Contact development team

**Happy Deploying! 🚀**
