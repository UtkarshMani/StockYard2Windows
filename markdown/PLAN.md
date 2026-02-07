# Inventory Management System - Project Plan

## Project Overview
A comprehensive desktop inventory management system for construction and electrical companies, built with Next.js (frontend), Node.js/Express (backend), and SQLite database. The system runs as an Electron desktop application on Windows.

---

## System Architecture

### Technology Stack
- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS, Zustand (state management)
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM
- **Database**: SQLite (for desktop portability)
- **Desktop Framework**: Electron
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **Barcode Scanning**: ZXing library

---

## Database Schema

### Core Models

#### 1. User Model
```prisma
model User {
  id            String
  email         String (unique)
  passwordHash  String
  fullName      String
  role          UserRole (enum)
  phone         String?
  isActive      Boolean
  createdAt     DateTime
  updatedAt     DateTime
  lastLogin     DateTime?
}

enum UserRole {
  admin
  warehouse_staff
  billing_staff
  project_manager
}
```

#### 2. Category Model
```prisma
model Category {
  id          String
  name        String
  description String?
  parentId    String? (self-reference)
  items       Item[]
  createdAt   DateTime
  updatedAt   DateTime
}
```

#### 3. Item Model
```prisma
model Item {
  id                  String
  barcode             String (unique)
  name                String
  description         String?
  categoryId          String?
  itemType            String?
  size                String?
  brand               String?
  unitOfMeasurement   String
  currentStock        Decimal
  minStockLevel       Decimal
  maxStockLevel       Decimal?
  unitCost            Decimal?
  sellingPrice        Decimal?
  location            String?
  imageUrl            String?
  isActive            Boolean
  createdAt           DateTime
  updatedAt           DateTime
}
```

#### 4. Project Model
```prisma
model Project {
  id               String
  name             String
  description      String?
  siteAddress      String
  startDate        DateTime
  endDate          DateTime?
  budget           Decimal?
  status           ProjectStatus (enum)
  projectManagerId String
  createdAt        DateTime
  updatedAt        DateTime
}

enum ProjectStatus {
  planning
  active
  on_hold
  completed
  cancelled
}
```

#### 5. Supplier Model
```prisma
model Supplier {
  id            String
  name          String
  contactPerson String?
  email         String?
  phone         String
  address       String?
  city          String?
  state         String?
  postalCode    String?
  country       String?
  taxId         String?
  paymentTerms  String?
  notes         String?
  isActive      Boolean
  createdAt     DateTime
  updatedAt     DateTime
}
```

#### 6. Purchase Order Model
```prisma
model PurchaseOrder {
  id                   String
  orderNumber          String (unique)
  supplierId           String
  projectId            String?
  orderDate            DateTime
  expectedDeliveryDate DateTime?
  deliveryDate         DateTime?
  totalAmount          Decimal
  status               POStatus (enum)
  notes                String?
  createdById          String
  createdAt            DateTime
  updatedAt            DateTime
}

enum POStatus {
  pending
  approved
  ordered
  received
  cancelled
}
```

#### 7. PurchaseOrderItem Model
```prisma
model PurchaseOrderItem {
  id               String
  purchaseOrderId  String
  itemId           String
  quantity         Decimal
  unitPrice        Decimal
  receivedQuantity Decimal
}
```

#### 8. StockMovement Model
```prisma
model StockMovement {
  id            String
  itemId        String
  movementType  MovementType (enum)
  quantity      Decimal
  projectId     String?
  performedById String
  notes         String?
  createdAt     DateTime
}

enum MovementType {
  in
  out
  adjustment
}
```

#### 9. Billing Model
```prisma
model Billing {
  id          String
  projectId   String
  itemId      String
  quantity    Decimal
  size        String?
  unitPrice   Decimal
  totalAmount Decimal
  description String?
  billingDate DateTime
  createdById String
  createdAt   DateTime
  updatedAt   DateTime
}
```

#### 10. AuditLog Model
```prisma
model AuditLog {
  id         String
  userId     String
  action     String
  entity     String
  entityId   String?
  changes    Json
  createdAt  DateTime
}
```

---

## Feature Modules

### Module 1: Authentication & Authorization ✅
**Status**: Fully Implemented

**Features**:
- User registration with password hashing (bcrypt)
- JWT-based login with access and refresh tokens
- Token refresh mechanism
- Role-based access control (RBAC)
- Protected routes with middleware

**Endpoints**:
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout

---

### Module 2: Category Management ✅
**Status**: Fully Implemented

**Features**:
- Create, read, update, delete categories
- Hierarchical category structure (parent/child)
- Item count per category
- Duplicate prevention

**Endpoints**:
- `GET /api/v1/categories` - Get all categories
- `GET /api/v1/categories/:id` - Get category by ID
- `POST /api/v1/categories` - Create category (admin/warehouse_staff)
- `PUT /api/v1/categories/:id` - Update category (admin/warehouse_staff)
- `DELETE /api/v1/categories/:id` - Delete category (admin)

**Authorization**:
- Read: All authenticated users
- Create/Update: admin, warehouse_staff
- Delete: admin only

---

### Module 3: User Management ✅
**Status**: Fully Implemented

**Features**:
- CRUD operations for users
- Role assignment (admin, warehouse_staff, billing_staff, project_manager)
- User activation/deactivation (soft delete)
- Password change functionality
- User activity tracking

**Endpoints**:
- `GET /api/v1/users` - Get all users (admin)
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create user (admin)
- `PUT /api/v1/users/:id` - Update user (admin)
- `DELETE /api/v1/users/:id` - Deactivate user (admin)
- `POST /api/v1/users/:id/change-password` - Change password

**Authorization**:
- Admin: Full access
- Other roles: Read own profile, change own password

---

### Module 4: Item Management ✅
**Status**: Fully Implemented

**Features**:
- CRUD operations for inventory items
- Barcode scanning and lookup
- Stock level tracking
- Item categorization
- Image upload support
- Min/max stock level alerts

**Endpoints**:
- `GET /api/v1/items` - Get all items (with pagination, search, filters)
- `GET /api/v1/items/:id` - Get item by ID
- `GET /api/v1/items/barcode/:barcode` - Get item by barcode
- `POST /api/v1/items` - Create item (admin/warehouse_staff)
- `PUT /api/v1/items/:id` - Update item (admin/warehouse_staff)
- `DELETE /api/v1/items/:id` - Delete item (admin)

---

### Module 5: Project Management ✅
**Status**: Fully Implemented

**Features**:
- CRUD operations for projects
- Project status tracking (planning, active, on_hold, completed, cancelled)
- Budget management
- Project manager assignment
- Item linkage to projects
- Project statistics (stock usage, billing, costs)

**Endpoints**:
- `GET /api/v1/projects` - Get all projects
- `GET /api/v1/projects/:id` - Get project by ID
- `GET /api/v1/projects/:id/stats` - Get project statistics
- `POST /api/v1/projects` - Create project (admin/project_manager)
- `PUT /api/v1/projects/:id` - Update project (admin/project_manager)
- `DELETE /api/v1/projects/:id` - Delete project (admin)

**Authorization**:
- Create/Update: admin, project_manager
- Read: All authenticated users
- Delete: admin only

---

### Module 6: Supplier Management ✅
**Status**: Fully Implemented

**Features**:
- CRUD operations for suppliers
- Contact information management
- Supplier activation/deactivation
- Purchase order history
- Performance tracking

**Endpoints**:
- `GET /api/v1/suppliers` - Get all suppliers
- `GET /api/v1/suppliers/:id` - Get supplier by ID
- `GET /api/v1/suppliers/:id/stats` - Get supplier statistics
- `POST /api/v1/suppliers` - Create supplier (admin/warehouse_staff)
- `PUT /api/v1/suppliers/:id` - Update supplier (admin/warehouse_staff)
- `DELETE /api/v1/suppliers/:id` - Delete supplier (admin)

---

### Module 7: Purchase Order Management ✅
**Status**: Fully Implemented

**Features**:
- Create purchase orders with multiple items
- Order tracking (pending, approved, ordered, received, cancelled)
- Partial/full receiving of items
- Automatic stock updates on receiving
- Link to projects
- Audit trail for all actions

**Endpoints**:
- `GET /api/v1/purchase-orders` - Get all purchase orders
- `GET /api/v1/purchase-orders/:id` - Get PO by ID
- `POST /api/v1/purchase-orders` - Create PO (admin/warehouse_staff)
- `PUT /api/v1/purchase-orders/:id` - Update PO (admin/warehouse_staff)
- `PUT /api/v1/purchase-orders/:id/receive` - Receive items (admin/warehouse_staff)
- `DELETE /api/v1/purchase-orders/:id` - Delete PO (admin, pending only)

**Workflow**:
1. Create PO with supplier and items
2. Auto-generate order number (PO-YYYY-XXXXX)
3. Calculate total amount
4. Approve/Order PO
5. Receive items (partial or full)
6. Update stock levels automatically
7. Create stock movement records
8. Create audit logs

---

### Module 8: Stock Movement ✅
**Status**: Fully Implemented

**Features**:
- Stock in/out operations
- Stock adjustments
- Link movements to projects
- Real-time stock updates
- Automatic audit logging
- Movement history tracking

**Endpoints**:
- `GET /api/v1/stock` - Get all stock movements
- `POST /api/v1/stock/in` - Add stock (admin/warehouse_staff)
- `POST /api/v1/stock/out` - Remove stock (admin/warehouse_staff)
- `POST /api/v1/stock/adjustment` - Adjust stock (admin)

---

### Module 9: Billing Management ✅
**Status**: Fully Implemented

**Features**:
- Create billing entries for projects
- Link items with quantity and pricing
- Size specifications
- Total amount calculation
- Project billing summary
- Date-based filtering

**Endpoints**:
- `GET /api/v1/billing` - Get all billings
- `GET /api/v1/billing/:id` - Get billing by ID
- `GET /api/v1/billing/project/:projectId` - Get billings by project
- `POST /api/v1/billing` - Create billing (admin/billing_staff)
- `PUT /api/v1/billing/:id` - Update billing (admin/billing_staff)
- `DELETE /api/v1/billing/:id` - Delete billing (admin)

---

### Module 10: Analytics & Reporting ✅
**Status**: Fully Implemented

**Features**:
- Dashboard overview statistics
- Stock usage analytics
- Project consumption reports
- Supplier performance metrics
- Cost breakdown by project
- Low stock alerts

**Endpoints**:
- `GET /api/v1/analytics/dashboard` - Dashboard overview
- `GET /api/v1/analytics/stock-usage` - Stock usage report
- `GET /api/v1/analytics/project-consumption` - Project consumption
- `GET /api/v1/analytics/supplier-performance` - Supplier metrics
- `GET /api/v1/analytics/cost-breakdown` - Cost analysis
- `GET /api/v1/analytics/low-stock` - Low stock items

**Dashboard Metrics**:
- Total active items
- Active projects count
- Total suppliers
- Pending purchase orders
- Low stock alerts
- Last 30 days billing summary

---

### Module 11: Audit Logging ✅
**Status**: Fully Implemented

**Features**:
- Automatic logging of all CRUD operations
- User action tracking
- Entity-specific audit trails
- Time-based filtering
- Statistics and summaries

**Endpoints**:
- `GET /api/v1/audit` - Get all audit logs (admin)
- `GET /api/v1/audit/:id` - Get specific log (admin)
- `GET /api/v1/audit/stats` - Get audit statistics (admin)
- `GET /api/v1/audit/entity/:entity/:entityId` - Entity history (admin)
- `GET /api/v1/audit/user/:userId` - User activity (admin)

**Tracked Actions**:
- CREATE, UPDATE, DELETE operations
- Stock movements (IN, OUT, ADJUSTMENT)
- Purchase order receiving
- Login/logout events

---

### Module 12: Barcode Scanning ✅
**Status**: Fully Implemented

**Features**:
- Real-time camera-based scanning
- ZXing library integration
- Mobile device support (back camera preference)
- Item lookup by barcode
- Stock operations via scanning

**Frontend Component**: `barcode-scanner.tsx`
**Page**: `/dashboard/scan`

---

## Development Milestones

### Phase 1: Foundation (Completed ✅)
- [x] Project setup (Electron + Next.js + Express)
- [x] Database schema design
- [x] SQLite migration from PostgreSQL
- [x] Authentication system
- [x] User management
- [x] Role-based authorization

### Phase 2: Core Inventory (Completed ✅)
- [x] Category management
- [x] Item CRUD operations
- [x] Stock movement system
- [x] Barcode scanning integration
- [x] Audit logging system

### Phase 3: Extended Features (Completed ✅)
- [x] Project management
- [x] Supplier management
- [x] Purchase order system
- [x] Billing management
- [x] Analytics dashboard

### Phase 4: Desktop Integration (Completed ✅)
- [x] Electron main process
- [x] Backend lifecycle management
- [x] IPC bridge (preload script)
- [x] Windows installer configuration
- [x] Build scripts

### Phase 5: Testing & Deployment (Current)
- [x] Remove notification system
- [x] Update all controllers
- [x] Update documentation
- [ ] Integration testing
- [ ] Build Windows installer
- [ ] User acceptance testing
- [ ] Production deployment

---

## API Structure

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication
All endpoints (except auth endpoints) require JWT Bearer token:
```
Authorization: Bearer <access_token>
```

### Response Format
```json
{
  "status": "success",
  "data": { ... },
  "message": "Optional message"
}
```

### Error Format
```json
{
  "status": "error",
  "message": "Error description"
}
```

---

## Security Features

1. **Password Security**
   - Bcrypt hashing (12 rounds)
   - Strong password requirements (8+ characters)

2. **JWT Authentication**
   - Access tokens (1 hour expiry)
   - Refresh tokens (7 days expiry)
   - Secure token storage

3. **Authorization**
   - Role-based access control
   - Endpoint-level permissions
   - Resource ownership validation

4. **Data Protection**
   - Soft delete for users
   - Audit logging for all operations
   - Input validation with Zod

5. **Desktop Security**
   - Contextbridge isolation
   - No Node.js in renderer
   - Secure IPC communication

---

## Frontend Architecture

### Pages
- `/login` - Authentication page
- `/dashboard` - Main dashboard
- `/dashboard/inventory` - Item management
- `/dashboard/scan` - Barcode scanning
- `/dashboard/stock` - Stock movements
- `/dashboard/projects` - Project management
- `/dashboard/billing` - Billing management
- `/dashboard/purchase-orders` - PO management
- `/dashboard/suppliers` - Supplier management
- `/dashboard/settings` - User settings

### State Management
- **Zustand** for global state
- **Persist middleware** for localStorage sync
- **React Query** for server state

### Components
- `barcode-scanner.tsx` - Camera-based scanner
- `providers.tsx` - Query client wrapper
- Protected route layouts

---

## Build & Deployment

### Development
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev

# Electron (from root)
npm run dev
```

### Production Build
```bash
# Windows
npm run build:win

# Output: dist/Inventory Management Setup.exe
```

### Database Setup
```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

---

## Environment Variables

### Backend (.env)
```
DATABASE_URL="file:./inventory.db"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
EMBEDDED_MODE=true
API_VERSION=v1
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

---

## Future Enhancements

1. **Reports**
   - PDF export for billing
   - Excel export for analytics
   - Custom report builder

2. **Advanced Features**
   - Multi-warehouse support
   - Batch operations
   - Import/export functionality
   - Email notifications

3. **Mobile App**
   - React Native mobile app
   - Offline mode support
   - Push notifications

4. **Cloud Sync** (Optional)
   - Backup to cloud
   - Multi-device sync
   - Remote access

---

## System Requirements

### Minimum
- OS: Windows 10 (64-bit)
- RAM: 4GB
- Disk: 500MB free space
- Screen: 1280x720

### Recommended
- OS: Windows 11 (64-bit)
- RAM: 8GB
- Disk: 1GB free space
- Screen: 1920x1080
- Webcam: For barcode scanning

---

## Support & Maintenance

### Database Backup
SQLite database location:
```
%APPDATA%/inventory-management/inventory.db
```

Regular backups recommended for production use.

### Logging
- Application logs in: `%APPDATA%/inventory-management/logs`
- Backend logger uses Winston
- Frontend errors logged to console

---

**Last Updated**: January 2026
**Version**: 2.0.0
**Status**: Production Ready 🚀
