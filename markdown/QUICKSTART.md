# Quick Start Guide - Windows Desktop Application

Get the Inventory Management System running on your Windows PC in 5-10 minutes.

---

## 🚀 For End Users (Non-Developers)

### Step 1: Download and Install

1. **Get the Installer**
   - Download `Inventory Management System-1.0.0-Setup.exe`
   - Or use portable version: `Inventory Management System-1.0.0-Portable.exe`

2. **Install the Application**
   - Double-click the Setup.exe
   - Choose installation directory (default: C:\Program Files\Inventory Management)
   - Check "Create Desktop Shortcut"
   - Click Install
   - Wait for installation to complete

3. **Launch the App**
   - Double-click desktop icon
   - Or find in Start Menu: "Inventory Management System"

### Step 2: First-Time Setup

1. **Application Starts Automatically**
   - The app will create a local database on first launch
   - Database location: `C:\Users\YourName\AppData\Roaming\inventory-management-desktop\`

2. **Create Admin Account**
   - The login page will appear
   - Click "Register" for first-time setup
   - Fill in:
     - Email: `admin@company.com`
     - Password: Choose a strong password (min 8 characters)
     - Full Name: Your name
     - Role: Select "Admin"
   - Click Register

3. **Login**
   - Use the credentials you just created
   - You're now in the Dashboard!

### Step 3: Start Managing Inventory

✅ **You're ready to use the system!**

---

## 👨‍💻 For Developers

### Quick Development Setup

```bash
# 1. Clone repository and install dependencies
git clone <repository-url>
cd "Inventory Management"
npm install

# 2. Start development mode (with hot reload)
npm run dev

# This will:
# - Start backend on http://localhost:5000
# - Start frontend on http://localhost:3000  
# - Launch Electron desktop app with DevTools
```

### Build Windows Installer

**On Windows:**
```bash
# Run build script
build-windows.bat

# Or manually:
npm run build:win
```

**On Linux/Mac (cross-compile for Windows):**
```bash
# Make script executable
chmod +x build-windows.sh

# Run build
./build-windows.sh

# Or manually:
npm run build:win
```

**Output:**
```
dist/
├── Inventory Management System-1.0.0-Setup.exe     (Installer with auto-update)
└── Inventory Management System-1.0.0-Portable.exe  (Portable version)
```

---

## 📦 Installation Types

### Regular Installer (Recommended)
- Installs to Program Files
- Creates Start Menu shortcuts
- Enables auto-updates
- Requires admin privileges

### Portable Version
- No installation required
- Run from any location (USB drive, etc.)
- Data stored next to executable
- No admin privileges needed

---

## ✅ First Steps After Installation

### 1. Create Admin User (First Launch Only)

The app will show registration form on first launch:
- **Email**: admin@company.com
- **Password**: SecurePassword123!
- **Full Name**: Admin User
- **Role**: Admin

### 2. Add Your First Item

1. Click **"Dashboard"** → **"Items"**
2. Click **"Add New Item"**
3. Fill in details:
   ```
   Barcode: 1234567890123
   Name: Portland Cement 50kg
   Category: Building Materials
   Type: Cement
   Size: 50kg
   Brand: ABC Cement
   Unit: Bags
   Min Stock: 50
   Max Stock: 500
   Unit Cost: $12.50
   Selling Price: $18.00
   Location: Warehouse A-1
   ```
4. Click **Save**
5. ✅ Item created!

### 3. Stock In Operation

1. Go to **"Scan"** page (or press Ctrl+S)
2. Select **"Stock In"** mode
3. **Scan barcode** with webcam/USB scanner
   - Or enter manually: `1234567890123`
4. Enter **Quantity**: 100
5. Optional: Add **Notes**: "Delivery from supplier XYZ"
6. Click **"Stock In"**
7. ✅ **Success!** Current quantity now shows 100 bags

### 4. Stock Out with Project Link

1. Go to **"Scan"** page
2. Select **"Stock Out"** mode
3. Scan barcode: `1234567890123`
4. Enter **Quantity**: 20
5. **Select Project**: "Downtown Office Building"
   - This links the stock movement to the project
6. Optional: Add **Notes**: "For foundation work"
7. Click **"Stock Out"**
8. ✅ **Success!** 
   - Current quantity now 80 bags
   - Movement recorded in audit log
   - Linked to project for cost tracking

### 5. Create a Project

1. Go to **"Projects"** page
2. Click **"Add New Project"**
3. Fill in:
   ```
   Project Name: Downtown Office Building
   Code: DOB-2026-001
   Location: 123 Main St, Downtown
   Status: Active
   Start Date: 01/15/2026
   Expected End: 12/31/2026
   Budget: $2,500,000
   Project Manager: Select user from dropdown
   Description: 10-story office building construction
   ```
4. Click **Save**
5. ✅ Project created and ready to track stock usage!

---

## 🔍 Key Features

### Dashboard
- **Quick Stats**: Total items, low stock alerts, recent activities
- **Navigation Cards**: Quick access to all features
- **Low Stock Notifications**: Real-time alerts

### Barcode Scanner
- **Webcam Support**: Use laptop/desktop camera
- **USB Scanner Support**: Professional barcode scanners
- **Supported Formats**: EAN-13, UPC-A, Code 128, Code 39, QR
- **Quick Mode Switch**: Toggle between Stock In/Out
- **Project Linking**: Associate movements with projects

### Items Management
- **Full CRUD**: Create, Read, Update, Delete items
- **Search**: Find by barcode, name, category
- **Filter**: By category, brand, low stock
- **Export**: Export inventory to Excel (coming soon)

### Audit Trail
- **Complete History**: Every stock movement logged
- **User Tracking**: Who performed each action
- **Before/After**: See exact changes
- **Search**: Filter by date, user, item, action type

---

## 📱 Barcode Scanner Setup

### Option 1: Webcam (Built-in)

**No setup needed!**
1. Go to Scan page
2. Click "Start Scanner"
3. Allow camera access when prompted
4. Point camera at barcode
5. ✅ Automatic detection and scan

**Tips for Better Scanning:**
- Ensure good lighting
- Hold barcode steady
- Keep barcode flat
- Distance: 6-12 inches from camera

### Option 2: USB Barcode Scanner (Recommended for Heavy Use)

**Setup:**
1. Plug USB scanner into any USB port
2. Windows installs drivers automatically (2-3 seconds)
3. Scanner is ready!

**Usage:**
- No need to click in input field
- Just scan - scanner acts as keyboard
- Works anywhere in the app
- Much faster than webcam

**Recommended Scanners:**
- Zebra DS2208
- Honeywell Voyager 1200g
- Any HID-compatible USB scanner

### Supported Barcode Types
- ✅ EAN-13 (European Article Number)
- ✅ UPC-A (Universal Product Code)
- ✅ Code 128 (High-density)
- ✅ Code 39 (Alphanumeric)
- ✅ QR Codes
- ✅ ITF (Interleaved 2 of 5)

---

## 🗂️ Data Storage

### Database Location
```
Windows:
C:\Users\YourName\AppData\Roaming\inventory-management-desktop\database.db

Portable:
[Executable Directory]\data\database.db
```

### Log Files
```
Windows:
C:\Users\YourName\AppData\Roaming\inventory-management-desktop\logs\

Files:
- combined.log (all logs)
- error.log (errors only)
```

### Backup Your Data

**Method 1: Manual Backup**
1. Close the application
2. Navigate to database location
3. Copy `database.db` to backup location:
   - External drive
   - Cloud storage (OneDrive, Dropbox)
   - Network drive
4. **Recommendation**: Weekly backups

**Method 2: Scheduled Backup (Future Feature)**
- Automatic daily backups
- Configure backup location
- Keep last 30 backups

### Restore from Backup
1. Close the application
2. Replace `database.db` with your backup file
3. Restart the application
4. ✅ Data restored!

---

## 🔐 User Roles & Permissions

| Role | Permissions | Use Case |
|------|-------------|----------|
| **Admin** | Everything | Company owner, IT manager |
| **Warehouse Staff** | Stock in/out, view items, scan | Warehouse workers |
| **Billing Staff** | Create invoices, view stock | Accounting team |
| **Project Manager** | View project stock, request items | Site managers |

### Creating Users

**Admin can create users:**
1. Go to **"Settings"** → **"Users"**
2. Click **"Add User"**
3. Fill in details and select role
4. Send credentials to user
5. User can change password on first login

---

## 🆘 Troubleshooting

### Application Won't Start

**Issue**: Double-clicking does nothing
```
Solution:
1. Check if already running (look in system tray)
2. Check Task Manager for "Inventory Management"
3. Restart Windows
4. Reinstall application
```

**Issue**: "Failed to start backend" error
```
Solution:
1. Port 5000 might be in use
2. Check Windows Firewall
3. Run as Administrator (right-click → Run as admin)
4. Check logs: AppData\Roaming\inventory-management-desktop\logs\error.log
```

### Database Errors

**Issue**: "Database locked" error
```
Solution:
1. Close all instances of the app
2. Check Task Manager
3. Restart the application
```

**Issue**: "Database corrupted" error
```
Solution:
1. Close application
2. Restore from backup
3. If no backup, delete database.db (will lose data)
4. Restart app to create fresh database
```

### Barcode Scanner Not Working

**Webcam:**
```
Solution:
1. Check camera permissions in Windows Settings
2. Close other apps using camera (Zoom, Teams, etc.)
3. Try a different browser
4. Check Windows Privacy Settings → Camera
```

**USB Scanner:**
```
Solution:
1. Unplug and replug scanner
2. Try different USB port
3. Check Device Manager for errors
4. Update USB drivers
```

### Slow Performance

**Issue**: App is slow or laggy
```
Solution:
1. Close other applications
2. Check available disk space (need 2GB+ free)
3. Check RAM usage (need 2GB+ available)
4. Compact database (Settings → Database → Compact)
5. Clear old logs
```

---

## 🔄 Updates

### Auto-Update (Installer Version)
- App checks for updates on startup
- Notification appears when update available
- Click "Download and Install"
- App restarts automatically
- ✅ Updated!

### Manual Update (Portable Version)
1. Download new portable .exe
2. Close current version
3. Replace old .exe with new one
4. Database remains intact
5. Start new version

---

## 📞 Support & Help

### Getting Help

**Check Documentation:**
- README.md - Full documentation
- PLAN.md - Architecture details
- ASSIGNMENTS.md - Implementation guide

**Log Files:**
- Location: `AppData\Roaming\inventory-management-desktop\logs\`
- Include in support requests

**System Info:**
- Windows Version: Press Win+R, type `winver`
- App Version: Help → About in app

---

## 🎯 Common Workflows

### Daily Warehouse Operations

1. **Morning**: Check dashboard for low stock alerts
2. **Receiving**: Stock in new deliveries with scanner
3. **Issuing**: Stock out items to projects
4. **Evening**: Review day's movements in audit log

### End of Month

1. **Reports**: Generate stock level reports
2. **Reconciliation**: Physical count vs system count
3. **Adjustments**: Adjust stock for discrepancies
4. **Backup**: Create database backup

### Project Completion

1. **Review**: Check all stock movements for project
2. **Costs**: Calculate total material costs
3. **Billing**: Generate final invoice
4. **Archive**: Mark project as completed

---

## 💡 Tips & Best Practices

✅ **Do:**
- Backup database weekly
- Use USB scanner for high volume
- Link stock movements to projects
- Check low stock alerts daily
- Use descriptive item names
- Set accurate min/max stock levels

❌ **Don't:**
- Close app during stock operations
- Delete database file
- Skip backups
- Use same barcode for multiple items
- Forget to link movements to projects

---

## 🚀 Next Steps

Now that you're set up:

1. ✅ **Add all inventory items**
2. ✅ **Create user accounts for staff**
3. ✅ **Set up projects**
4. ✅ **Start tracking stock movements**
5. ✅ **Configure low stock thresholds**
6. ✅ **Set up backup schedule**

**Happy Inventory Managing! 📦**
