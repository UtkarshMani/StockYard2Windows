# 🚀 Desktop Application Quick Start Guide

## For Ubuntu/Linux Users

### One-Command Launch
```bash
./start-desktop.sh
```

### What it does:
1. ✓ Cleans up any existing server processes
2. ✓ Starts backend server (port 5000)
3. ✓ Starts frontend server (port 3000)
4. ✓ Waits for both servers to be ready
5. ✓ Launches Electron desktop application
6. ✓ Automatically cleans up when you close the app

### First Time Setup
Make the script executable:
```bash
chmod +x start-desktop.sh
```

### Manual Launch (if needed)
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Desktop App (wait 10 seconds after starting servers)
npx electron .
```

---

## For Windows Users

### One-Command Launch
```cmd
start-desktop.bat
```

Double-click the `start-desktop.bat` file or run it from Command Prompt.

---

## Application Features

Once launched, you'll have a **native desktop application** with:

- 🔐 **Login System** - Secure authentication
- 📦 **Inventory Management** - Add, edit, track items
- 📊 **Dashboard** - Quick overview and statistics
- 📱 **Barcode Scanner** - Scan items using your webcam
- 🏗️ **Project Management** - Track construction projects
- 💰 **Billing System** - Generate and manage invoices
- 📋 **Purchase Orders** - Create and receive orders
- 👥 **Supplier Management** - Maintain supplier database
- 📈 **Analytics** - Stock usage and performance reports
- 🔍 **Audit Logs** - Complete change history

## Default Login Credentials

### Admin Account
- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Access**: Full system access

### Warehouse Staff
- **Email**: `warehouse@example.com`
- **Password**: `warehouse123`
- **Access**: Inventory, Stock, Purchase Orders

## Troubleshooting

### "Port already in use" error
```bash
# Kill processes on ports
lsof -ti:5000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### "Cannot find module" error
```bash
# Reinstall dependencies
cd backend && npm install
cd ../frontend && npm install
cd .. && npm install
```

### Electron window doesn't appear
1. Wait 10-15 seconds for servers to fully start
2. Check terminal output for errors
3. Ensure ports 3000 and 5000 are free
4. Try manually: `npx electron .`

### Styles not loading (white screen)
```bash
# Clear Next.js cache and restart
cd frontend
rm -rf .next
npm run dev
```

## Stopping the Application

**Proper way**: Close the Electron window - the launcher script will automatically stop all servers.

**Force stop** (if needed):
```bash
# Linux/Ubuntu
lsof -ti:5000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
pkill -f electron

# Windows
taskkill /F /IM node.exe
taskkill /F /IM electron.exe
```

## System Requirements

- **OS**: Ubuntu 20.04+, Windows 10+, macOS 10.15+
- **Node.js**: v18.0.0 or higher
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 500MB free space
- **Display**: 1024x768 minimum resolution

## Development Mode

The application runs in development mode with:
- Hot reload enabled for code changes
- DevTools accessible (Ctrl+Shift+I / Cmd+Option+I)
- Detailed console logging
- Source maps for debugging

## Production Build (Coming Soon)

To build a standalone executable:
```bash
npm run build:win     # Windows installer
npm run build:linux   # Linux AppImage
npm run build:all     # All platforms
```

## Support

For issues or questions:
1. Check terminal output for error messages
2. Review the logs in backend/logs/
3. Ensure all dependencies are installed
4. Verify Node.js version: `node --version`

---

**Enjoy your Inventory Management Desktop Application!** 🎉
