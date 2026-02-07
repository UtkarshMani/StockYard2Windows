# Building Inventory Management System

## Quick Start

### For Linux (Ubuntu/Debian)

```bash
# Option 1: Use the build script
./build-linux.sh

# Option 2: Use npm command
npm run build:linux
```

The built application will be in the `dist/` folder as:
- `Inventory Management System-1.0.0.AppImage` (Portable)
- `inventory-management-system_1.0.0_amd64.deb` (Debian Package)

---

## Installation

### AppImage (Recommended for Linux)

1. Make it executable:
```bash
chmod +x "dist/Inventory Management System-1.0.0.AppImage"
```

2. Run it:
```bash
./dist/Inventory\ Management\ System-1.0.0.AppImage
```

3. (Optional) Install system-wide:
```bash
# Move to applications folder
sudo mv "dist/Inventory Management System-1.0.0.AppImage" /opt/inventory-management.AppImage

# Create desktop entry
cat > ~/.local/share/applications/inventory-management.desktop <<EOF
[Desktop Entry]
Name=Inventory Management System
Comment=Manage your inventory efficiently
Exec=/opt/inventory-management.AppImage
Icon=inventory-management
Terminal=false
Type=Application
Categories=Office;Business;
EOF

# Update desktop database
update-desktop-database ~/.local/share/applications/
```

### DEB Package (Ubuntu/Debian)

```bash
sudo dpkg -i dist/inventory-management-system_1.0.0_amd64.deb
```

Launch from applications menu or run:
```bash
inventory-management-system
```

---

## Building for Other Platforms

### Windows

```bash
npm run build:win
```

Creates:
- `Inventory Management System-1.0.0-Setup.exe` (Installer)
- `Inventory Management System-1.0.0-Portable.exe` (Portable)

### All Platforms

```bash
npm run build:all
```

---

## Development Mode

To run in development mode:

```bash
npm run dev
```

This starts:
- Backend server on http://localhost:5000
- Frontend on http://localhost:3000
- Electron app window

---

## Build Requirements

### System Requirements
- Node.js >= 18.0.0
- npm >= 9.0.0
- At least 2GB free disk space

### For Linux Builds
```bash
sudo apt-get install -y rpm
```

### For Windows Builds (from Linux)
```bash
sudo apt-get install -y wine64
```

---

## Troubleshooting

### Build fails with "electron-builder not found"
```bash
npm install
```

### AppImage won't run
```bash
# Install FUSE (required for AppImage)
sudo apt-get install -y libfuse2
```

### Permission denied
```bash
chmod +x build-linux.sh
chmod +x "dist/Inventory Management System-1.0.0.AppImage"
```

### Backend not starting in built app
The built app includes a standalone backend. Ensure:
- Port 5000 is not in use
- No firewall blocking localhost:5000

---

## File Structure After Build

```
dist/
├── Inventory Management System-1.0.0.AppImage    # Linux portable app
├── inventory-management-system_1.0.0_amd64.deb   # Debian package
├── linux-unpacked/                               # Unpacked files
└── builder-effective-config.yaml                 # Build config used
```

---

## Creating Desktop Shortcut (Manual)

Create `~/.local/share/applications/inventory-management.desktop`:

```ini
[Desktop Entry]
Version=1.0
Type=Application
Name=Inventory Management
Comment=Inventory Management System
Exec=/path/to/Inventory Management System-1.0.0.AppImage
Icon=inventory-management
Terminal=false
Categories=Office;Business;Finance;
```

---

## Distribution

### For Team Distribution
1. Share the AppImage file - it's portable and doesn't require installation
2. Users just need to make it executable and run

### For Official Distribution
1. Use the .deb package for Ubuntu/Debian users
2. Consider signing the packages for security

---

## Auto-Updates

The app is configured for auto-updates. To enable:

1. Set up a GitHub repository
2. Update `electron-builder.json` with your repo details
3. Release new versions as GitHub releases
4. App will auto-check and update

---

## Support

For issues during build:
1. Check Node.js version: `node --version`
2. Clear caches: `rm -rf node_modules dist && npm install`
3. Check logs in terminal output
