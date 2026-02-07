# Inventory Management System

A comprehensive inventory management **Windows Desktop Application** for construction and electrical companies, built with Electron, Next.js, Node.js, and SQLite.

## 💻 Application Type

**Native Windows Desktop Software** - Runs locally on Windows 10/11 without internet connection required.

## 🚀 Features

- ✅ **Windows Desktop App** - Native application with installer
- ✅ **Fully Offline** - No internet required, all data stored locally
- ✅ **Barcode Scanning** - Webcam or USB barcode scanner support
- ✅ **Real-time Updates** - Instant synchronization across application
- ✅ **Role-Based Access** - Admin, Warehouse Staff, Billing Staff, Project Manager
- ✅ **Stock Management** - Track quantities with complete audit trails
- ✅ **Low Stock Alerts** - Automatic notifications when stock is low
- ✅ **Project Tracking** - Link stock movements to project sites
- ✅ **Audit Logs** - Complete history of all operations
- ✅ **Local Database** - Fast SQLite database in your AppData folder
- ✅ **Auto-Updates** - Automatic update notifications and installation
- 🚧 **Billing System** - Create and manage invoices
- 🚧 **Analytics Dashboard** - Stock levels, costs, and usage reports
- 🚧 **Supplier Management** - Manage suppliers and purchase orders
- 🚧 **Database Backup** - Export/import database for backup

## 📋 System Requirements

### Minimum Requirements
- **OS**: Windows 10 (64-bit) or Windows 11
- **RAM**: 4 GB
- **Storage**: 500 MB free space
- **CPU**: Dual-core processor
- **Optional**: Webcam or USB barcode scanner for scanning features

### Recommended
- **OS**: Windows 11
- **RAM**: 8 GB or more
- **Storage**: 2 GB free space
- **CPU**: Quad-core processor
- **Display**: 1920x1080 resolution
- **Peripherals**: USB barcode scanner for best scanning experience

## 🛠️ Installation for End Users

### Download and Install

1. **Download** the installer:
   - `Inventory Management System-1.0.0-Setup.exe` (Installer with auto-update)
   - OR `Inventory Management System-1.0.0-Portable.exe` (Portable, no installation)

2. **Run** the installer:
   - Double-click the Setup.exe file
   - Follow the installation wizard
   - Choose installation directory
   - Create desktop shortcut (recommended)

3. **Launch** the application:
   - Click the desktop icon or Start Menu shortcut
   - The application will start with embedded database

4. **First-Time Setup**:
   - Create admin account on first launch
   - Database will be created automatically in:
     - `C:\Users\YourName\AppData\Roaming\inventory-management-desktop\`

### Portable Version

If you prefer not to install:
1. Download the portable .exe file
2. Run it from any location (USB drive, external hard drive, etc.)
3. All data will be stored relative to the executable location

## 🔧 Development Setup

### Prerequisites for Development

- Node.js 18+ 
- npm 9+
- Git

### Building from Source

```bash
# Clone the repository
git clone <repository-url>
cd "Inventory Management"

# Install all dependencies (root, backend, frontend)
npm install

# Development mode (with hot reload)
npm run dev

# Build for Windows
npm run build:win

# The installer will be created in:
# dist/Inventory Management System-1.0.0-Setup.exe
```

### Quick Build Scripts

#### Windows Users:
```bash
# Double-click or run:
build-windows.bat
```

#### Linux/Mac Users (cross-compile for Windows):
```bash
chmod +x build-windows.sh
./build-windows.sh
```

## 🗂️ Application Structure

```
Inventory Management/
├── electron-main.js              # Electron main process
├── electron-preload.js           # Preload script (security)
├── electron-builder.json         # Build configuration
├── package.json                  # Root dependencies
├── build-windows.bat             # Windows build script
├── build-windows.sh              # Linux/Mac build script
├── backend/                      # Embedded Node.js API
│   ├── src/
│   │   ├── server.ts             # Express server (embedded)
│   │   ├── controllers/          # API controllers
│   │   ├── routes/               # API routes
│   │   ├── middleware/           # Auth, error handling
│   │   └── utils/                # Utilities
│   ├── prisma/
│   │   └── schema.prisma         # SQLite database schema
│   └── package.json
├── frontend/                     # Next.js UI (static build)
│   ├── src/
│   │   ├── app/                  # Next.js pages
│   │   ├── components/           # React components
│   │   ├── lib/                  # API client
│   │   └── store/                # State management
│   └── package.json
└── build/                        # Application icons
    ├── icon.ico                  # Windows icon
    ├── icon.png                  # PNG icon
    └── installerSidebar.bmp      # Installer graphics
```

## 🎯 Configuration

### Database Location

By default, the database is stored in:
```
C:\Users\<YourName>\AppData\Roaming\inventory-management-desktop\database.db
```

### Log Files

Application logs are stored in:
```
C:\Users\<YourName>\AppData\Roaming\inventory-management-desktop\logs\
```

### Changing Database Location

You can move the database file manually, but you'll need to update the application configuration or use the built-in backup/restore feature (coming soon).

## 🔐 Security

- ✅ All data stored locally on your machine
- ✅ JWT authentication with bcrypt password hashing
- ✅ Role-based access control
- ✅ Audit trails for all operations
- ✅ No external data transmission (fully offline)
- ✅ Windows User Account Control (UAC) integration

## 📱 Barcode Scanner Support

### Webcam Scanning
- Built-in support for webcam-based scanning
- Works with any camera (laptop, USB webcam)
- Supports: EAN-13, UPC-A, Code 128, QR codes

### USB Barcode Scanners
- Compatible with any HID USB barcode scanner
- Scanner acts as keyboard input
- No additional drivers needed
- Recommended for high-volume scanning

### Supported Barcode Types
- EAN-13 (European Article Number)
- UPC-A (Universal Product Code)
- Code 128
- Code 39
- QR Codes
- And more...

## ⚙️ Configuration

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

## 📚 Project Structure

```
Inventory Management/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js 14 app directory
│   │   │   ├── dashboard/   # Protected dashboard pages
│   │   │   ├── login/       # Authentication pages
│   │   │   └── layout.tsx   # Root layout
│   │   ├── components/      # React components
│   │   │   ├── barcode-scanner.tsx
│   │   │   └── providers.tsx
│   │   ├── lib/             # Utilities and API client
│   │   │   └── api.ts
│   │   └── store/           # Zustand state management
│   │       └── auth.ts
│   ├── package.json
│   └── tailwind.config.js
│
├── backend/                  # Node.js Express backend
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   │   ├── auth.controller.ts
│   │   │   ├── item.controller.ts
│   │   │   └── stock.controller.ts
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Express middleware
│   │   │   ├── auth.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── config/          # Configuration files
│   │   │   ├── database.ts
│   │   │   └── swagger.ts
│   │   ├── utils/           # Utility functions
│   │   │   └── logger.ts
│   │   └── server.ts        # Express app entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── package.json
│
├── docker-compose.yml        # Docker orchestration
├── PLAN.md                   # System architecture document
├── ASSIGNMENTS.md            # Implementation documentation
└── README.md                 # This file
```

## 🎯 Usage

### 1. Create Admin User

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "fullName": "Admin User",
    "role": "admin"
  }'
```

### 2. Login

Visit `http://localhost:3000/login` and use:
- Email: admin@example.com
- Password: admin123

### 3. Add Items

Navigate to Dashboard → Inventory → Add New Item

### 4. Scan Barcodes

Navigate to Dashboard → Scan Items
- Click "Start Scanning"
- Point camera at barcode
- Select Stock In/Out
- Enter quantity and confirm

## 🔐 User Roles

| Role | Permissions |
|------|------------|
| **Admin** | Full access to all features |
| **Warehouse Staff** | Stock management, barcode scanning, inventory |
| **Billing Staff** | Create bills, view project costs, reports |
| **Project Manager** | View project data, approve requisitions |

## 📡 API Documentation

API documentation is available at: `http://localhost:5000/api-docs`

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

#### Items
- `GET /api/v1/items` - List all items
- `GET /api/v1/items/:id` - Get item details
- `GET /api/v1/items/barcode/:barcode` - Search by barcode
- `POST /api/v1/items` - Create item
- `PUT /api/v1/items/:id` - Update item
- `GET /api/v1/items/low-stock` - Get low stock items

#### Stock Management
- `POST /api/v1/stock/in` - Stock in items
- `POST /api/v1/stock/out` - Stock out items
- `POST /api/v1/stock/adjust` - Adjust stock
- `GET /api/v1/stock/movements` - Get stock movements

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
```

### API Testing with cURL

**Stock In**:
```bash
curl -X POST http://localhost:5000/api/v1/stock/in \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "item-uuid",
    "quantity": 100,
    "unitCost": 10.50
  }'
```

**Stock Out**:
```bash
curl -X POST http://localhost:5000/api/v1/stock/out \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "item-uuid",
    "quantity": 50,
    "projectId": "project-uuid"
  }'
```

## 🔥 Real-time Features

The system uses Socket.IO for real-time updates:

### Events

- `stock:updated` - Fired when stock quantities change
- `notification:low_stock` - Fired when item reaches minimum level
- `item:created` - Fired when new item is added
- `item:updated` - Fired when item is modified

### Client Connection

```typescript
import io from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_WS_URL);

socket.on('stock:updated', (data) => {
  console.log('Stock updated:', data);
});
```

## 📱 Mobile Support

The application is a Progressive Web App (PWA) and can be installed on mobile devices:

1. Open the app in mobile browser
2. Tap "Add to Home Screen"
3. Access like a native app

### Camera Permissions

For barcode scanning:
- **iOS**: Requires HTTPS or localhost
- **Android**: Works on HTTP in development

## 🚀 Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel
```

### Backend (Railway/Render)

```bash
cd backend
railway up
# or
render deploy
```

### Database (Production)

Use managed PostgreSQL:
- AWS RDS
- Supabase
- Railway
- Render

Update `DATABASE_URL` in production environment.

## 📊 Database Schema

The system uses PostgreSQL with the following main tables:

- **users** - User accounts with roles
- **items** - Inventory items with barcodes
- **categories** - Item categories (hierarchical)
- **stock_movements** - Complete stock history
- **projects** - Construction project sites
- **billing** - Invoices and bills
- **suppliers** - Supplier information
- **purchase_orders** - Purchase order tracking
- **audit_logs** - System audit trail
- **notifications** - User notifications

See [PLAN.md](PLAN.md) for detailed schema.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Prisma for the excellent ORM
- ZXing for barcode scanning library
- Tailwind CSS for styling utilities

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Email: support@example.com

## 🗺️ Roadmap

- [x] Authentication & Authorization
- [x] Barcode Scanning
- [x] Stock Management
- [x] Real-time Updates
- [x] Audit Trails
- [ ] Billing System
- [ ] Analytics Dashboard
- [ ] Supplier Management
- [ ] Purchase Orders
- [ ] Offline Sync
- [ ] Mobile App (React Native)
- [ ] Integration APIs
- [ ] Advanced Analytics (ML-based forecasting)

## 📸 Screenshots

### Login Page
![Login](docs/screenshots/login.png)

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Barcode Scanner
![Scanner](docs/screenshots/scanner.png)

### Stock Management
![Stock](docs/screenshots/stock.png)

---

**Built with ❤️ for Construction & Electrical Companies**
