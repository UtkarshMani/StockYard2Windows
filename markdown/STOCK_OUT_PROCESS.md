# Stock Out Process Documentation

## Overview
This document details the complete workflow for removing inventory stock and allocating it to projects using the barcode scanning system. The stock-out process allows warehouse staff to track material usage across projects by scanning barcodes with a physical USB/wired scanner or manual entry.

---

## 🔧 Hardware Requirements
- **Physical Barcode Scanner**: USB/wired scanner connected to the system
  - Acts as a keyboard input device
  - Automatically types barcode and sends Enter key
  - No special drivers required
- **Alternative**: Manual barcode entry via keyboard

---

## 📋 Complete Workflow

### **Step 1: Initialize Scan Page**
**Location**: `frontend/src/app/dashboard/scan/page.tsx`

**Action**:
1. User navigates to Dashboard → Scan
2. Page loads with barcode input field auto-focused
3. User selects "Stock Out" mode (red button)

**Technical Details**:
```typescript
const [mode, setMode] = useState<'in' | 'out'>('in');

<button onClick={() => setMode('out')}>
  Stock Out
</button>
```

**State Variables**:
- `mode`: 'out' (stock out mode selected)
- `scannedItem`: null (no item scanned yet)
- `quantity`: 1 (default quantity)
- `projectId`: '' (must be selected by user)
- `barcodeInput`: '' (empty input field)

---

### **Step 2: Barcode Scanning**
**Location**: `frontend/src/app/dashboard/scan/page.tsx`

#### Physical Scanner Method:
1. Warehouse staff points scanner at item barcode
2. Scanner reads barcode optically
3. Scanner types barcode digits into focused input field
4. Scanner sends Enter key automatically
5. Form submits → `handleBarcodeSubmit()` triggered

#### Manual Entry Method:
1. Staff types barcode manually
2. Clicks "Search" button or presses Enter
3. Form submits → `handleBarcodeSubmit()` triggered

**Code Flow**:
```typescript
const handleBarcodeSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (barcodeInput.trim()) {
    handleScan(barcodeInput.trim());
  }
};
```

---

### **Step 3: Item Lookup (Frontend)**
**Location**: `frontend/src/app/dashboard/scan/page.tsx` - Line 26-40

**Process**:
1. `handleScan(barcode)` called with scanned barcode
2. Loading state activated
3. API request sent to backend

**API Request**:
```typescript
GET /api/v1/items/barcode/{barcode}
```

**Request Details**:
- Method: GET
- Endpoint: `/items/barcode/${barcode}`
- Headers: Authorization Bearer token
- Example: `/items/barcode/123456789012`

---

### **Step 4: Item Lookup (Backend)**
**Location**: `backend/src/controllers/item.controller.ts` - Line 109-129

**Process**:
1. Receives barcode parameter from route
2. Queries database for matching item
3. Includes category information in response
4. Returns item data or 404 error

**Database Query**:
```typescript
const item = await prisma.item.findUnique({
  where: { barcode },
  include: {
    category: true,
  },
});
```

**Response Structure**:
```json
{
  "status": "success",
  "data": {
    "item": {
      "id": "uuid",
      "barcode": "123456789012",
      "name": "Item Name",
      "currentQuantity": "50.00",
      "unitOfMeasurement": "pcs",
      "category": {
        "id": "uuid",
        "name": "Category Name"
      }
    }
  }
}
```

---

### **Step 5: Display Item Details**
**Location**: `frontend/src/app/dashboard/scan/page.tsx`

**Process**:
1. Item data received from API
2. `setScannedItem(item)` - stores in React state
3. Success toast displayed: "Item found!"
4. Item card rendered with details
5. Input field cleared and re-focused

**Displayed Information**:
- ✓ Item Name
- ✓ Barcode (monospace font)
- ✓ **Current Stock Quantity** (important for stock-out validation)
- ✓ Unit of Measurement
- ✓ Description (if available)

---

### **Step 6: Project Selection & Quantity Confirmation**
**Location**: `frontend/src/app/dashboard/scan/page.tsx`

**Required User Actions**:
1. **Select Project** (mandatory for stock-out)
   - Dropdown list of active projects
   - Shows project name and code
   - Must be selected before submission
2. Review displayed item details
3. Adjust quantity if needed (default: 1)
4. Optionally add notes
5. Click "Process Stock Out" button

**UI Elements**:
- Project dropdown: Required field
- Quantity input: Number field (min: 0.01)
- Notes textarea: Optional text field
- Submit button: Red "Process Stock Out" button

**Validation**:
```typescript
if (!projectId) {
  toast.error('Please select a project');
  return;
}
```

---

### **Step 7: Submit Stock Out Request (Frontend)**
**Location**: `frontend/src/app/dashboard/scan/page.tsx` - Line 69-79

**Process**:
1. `handleStockOperation()` called
2. Validates scannedItem exists
3. Validates projectId is selected
4. Sends POST request to backend

**API Request**:
```typescript
POST /api/v1/stock/out
```

**Request Body**:
```json
{
  "itemId": "uuid",
  "quantity": 5,
  "projectId": "uuid",
  "notes": "Scanned stock out"
}
```

**Optional Fields**:
- `locationFrom`: string (warehouse location)

---

### **Step 8: Backend Validation**
**Location**: `backend/src/controllers/stock.controller.ts` - Line 163-186

**Validation Schema** (Zod):
```typescript
const stockOutSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().positive(),
  projectId: z.string().uuid(),
  locationFrom: z.string().optional(),
  notes: z.string().optional(),
});
```

**Checks Performed**:
1. ✓ itemId is valid UUID format
2. ✓ quantity is positive number
3. ✓ projectId is valid UUID format
4. ✓ Item exists in database
5. ✓ **Sufficient stock is available** ⚠️ CRITICAL
6. ✓ Project exists in database

---

### **Step 9: Stock Availability Check (CRITICAL)**
**Location**: `backend/src/controllers/stock.controller.ts` - Line 176-179

**Process**:
```typescript
// Check if sufficient stock is available
if (item.currentQuantity.lt(validatedData.quantity)) {
  throw new AppError('Insufficient stock available', 400);
}
```

**Validation**:
- Compares requested quantity with current stock
- Uses `.lt()` (less than) for Decimal comparison
- Prevents negative stock situations

**Example Scenarios**:

| Current Stock | Requested | Result |
|---------------|-----------|--------|
| 50 pcs | 10 pcs | ✅ Allowed |
| 50 pcs | 50 pcs | ✅ Allowed (brings to zero) |
| 50 pcs | 51 pcs | ❌ Error: "Insufficient stock available" |
| 0 pcs | 1 pc | ❌ Error: "Insufficient stock available" |

**Error Response**:
```json
{
  "status": "error",
  "message": "Insufficient stock available"
}
```

---

### **Step 10: Project Validation**
**Location**: `backend/src/controllers/stock.controller.ts` - Line 181-186

**Process**:
```typescript
const project = await prisma.project.findUnique({
  where: { id: validatedData.projectId },
});

if (!project) {
  throw new AppError('Project not found', 404);
}
```

**Purpose**: Ensures materials are allocated to valid, existing projects

---

### **Step 11: Database Transaction (CRITICAL)**
**Location**: `backend/src/controllers/stock.controller.ts` - Line 229-283

This is the **most critical part** - all operations succeed or all fail together.

#### **Transaction Phase 1: Create Stock Movement Record**
```typescript
const movement = await tx.stockMovement.create({
  data: {
    itemId: validatedData.itemId,
    movementType: 'stock_out',
    quantity: validatedData.quantity,
    unitCost: item.unitCost, // Records cost at time of allocation
    projectId: validatedData.projectId,
    locationFrom: validatedData.locationFrom,
    notes: validatedData.notes,
    performedBy: req.user!.id,
  },
  include: {
    item: true,
    project: true,
    performer: {
      select: { fullName: true, email: true },
    },
  },
});
```

**Purpose**: Creates complete audit trail of material allocation

**Stored Data**:
- Movement type: 'stock_out'
- Item reference
- Quantity removed
- **Project allocation** (where materials went)
- Unit cost (for project costing)
- User who performed action
- Timestamp (automatic)
- Optional: source location, notes

---

#### **Transaction Phase 2: Update Item Quantity**
```typescript
const updatedItem = await tx.item.update({
  where: { id: validatedData.itemId },
  data: {
    currentQuantity: {
      decrement: validatedData.quantity,
    },
  },
});
```

**Purpose**: Decreases inventory count

**Key Feature - Atomic Decrement**:
- Uses database-level decrement operation
- Prevents race conditions
- Safe for concurrent users
- Locks row during update

**Example**:
- Current quantity: 50 pcs
- Stock out quantity: 5 pcs
- New quantity: 45 pcs

**Important**: The sufficient stock check happens BEFORE the transaction, but the decrement is atomic within the transaction to prevent race conditions.

---

#### **Transaction Phase 3: Create Audit Log**
```typescript
await tx.auditLog.create({
  data: {
    userId: req.user!.id,
    action: 'STOCK_OUT',
    entityType: 'StockMovement',
    entityId: movement.id,
    newValues: JSON.stringify({
      itemId: validatedData.itemId,
      projectId: validatedData.projectId,
      quantity: validatedData.quantity,
      newQuantity: updatedItem.currentQuantity.toString(),
    }),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  },
});
```

**Purpose**: Complete audit trail for project accounting and compliance

**Tracked Information**:
- Who: User ID and details
- When: Timestamp (automatic)
- What: Action type and entity
- How much: Quantity removed
- Where to: Project ID
- New stock level: Updated quantity
- IP address and user agent

---

### **Step 12: Transaction Commit**

**If ALL operations succeed**:
- Transaction commits to database
- All changes are permanent
- Materials officially allocated to project
- Proceeds to Step 13

**If ANY operation fails**:
- Transaction rolls back completely
- No changes written to database
- Stock quantity unchanged
- Error returned to frontend
- User can retry the operation

**This ensures data integrity!**

---

### **Step 13: Real-time Notification**
**Location**: `backend/src/controllers/stock.controller.ts`

**Process**:
```typescript
const io = req.app.get('io');
io.emit('stock:updated', {
  type: 'stock_out',
  itemId: validatedData.itemId,
  projectId: validatedData.projectId,
  quantity: result.updatedItem.currentQuantity.toString(),
});
```

**Purpose**: Notify all connected clients of inventory change

**WebSocket Event**:
- Event name: `'stock:updated'`
- Broadcast to: All connected clients
- Effect: Real-time dashboard updates

**Use Cases**:
- Other users see updated stock immediately
- Project managers see material allocations
- Dashboard charts refresh automatically
- Low stock alerts triggered if threshold reached
- Inventory page updates without refresh

---

### **Step 14: Success Response**
**Location**: `backend/src/controllers/stock.controller.ts`

**Response Structure**:
```json
{
  "status": "success",
  "message": "Stock removed successfully",
  "data": {
    "movement": {
      "id": "uuid",
      "movementType": "stock_out",
      "quantity": "5.00",
      "item": {
        "name": "Item Name",
        "barcode": "123456789012"
      },
      "project": {
        "name": "Project Name",
        "projectCode": "PRJ-001"
      },
      "performer": {
        "fullName": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2026-01-22T10:30:00Z"
    },
    "currentQuantity": "45.00"
  }
}
```

---

### **Step 15: Frontend Success Handling**
**Location**: `frontend/src/app/dashboard/scan/page.tsx` - Line 79-85

**Process**:
1. Success response received
2. Green toast shown: "Stock removed successfully!"
3. Form reset:
   - `setScannedItem(null)` - clears item
   - `setQuantity(1)` - resets to default
   - `setProjectId('')` - clears project selection
4. Input field auto-focuses
5. **Ready for next scan immediately**

**User Experience**:
- Entire process takes 2-3 seconds
- No page reload required
- Continuous scanning workflow
- Visual feedback at every step

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────┐
│  Physical Scanner       │
│  (USB/Wired Device)     │
└───────────┬─────────────┘
            │ Scans barcode
            ▼
┌─────────────────────────┐
│  Input Field (Auto-     │
│  focused, captures      │
│  scanner keyboard input)│
└───────────┬─────────────┘
            │ Enter key
            ▼
┌─────────────────────────┐
│  Frontend API Call      │
│  GET /items/barcode/XXX │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Backend: Item Lookup   │
│  Prisma Query           │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Display Item Details   │
│  + Current Stock        │
└───────────┬─────────────┘
            │ User selects project
            │ and confirms quantity
            ▼
┌─────────────────────────┐
│  Validation Check       │
│  - Project selected?    │
│  - Quantity valid?      │
└───────────┬─────────────┘
            │ Valid
            ▼
┌─────────────────────────┐
│  Frontend API Call      │
│  POST /stock/out        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Backend: Validation    │
│  Zod Schema Check       │
└───────────┬─────────────┘
            │ Valid
            ▼
┌─────────────────────────┐
│  Stock Availability     │
│  Check (CRITICAL)       │
│  Current >= Requested?  │
└───────────┬─────────────┘
            │ Sufficient
            ▼
┌─────────────────────────┐
│  Project Exists Check   │
└───────────┬─────────────┘
            │ Exists
            ▼
┌─────────────────────────┐
│  DATABASE TRANSACTION   │
│  ┌───────────────────┐  │
│  │ 1. Create Movement│  │
│  │    (with project) │  │
│  │ 2. Decrement Qty  │  │
│  │ 3. Create Audit   │  │
│  └───────────────────┘  │
│  COMMIT or ROLLBACK     │
└───────────┬─────────────┘
            │ Success
            ├──────────────────┐
            │                  │
            ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│ WebSocket       │  │ HTTP Response   │
│ Broadcast       │  │ to Frontend     │
│ (All Clients)   │  │                 │
└─────────────────┘  └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ Success Toast   │
                     │ Form Reset      │
                     │ Ready for Next  │
                     └─────────────────┘
```

---

## 🛡️ Safety Features

### **1. Stock Availability Validation**
```typescript
if (item.currentQuantity.lt(validatedData.quantity)) {
  throw new AppError('Insufficient stock available', 400);
}
```
- **Prevents negative stock**
- Checked before transaction
- Clear error message to user
- Transaction never starts if insufficient

### **2. Atomic Database Transaction**
- All 3 operations (movement, update, audit) succeed together or fail together
- No partial updates possible
- Database integrity guaranteed
- Stock-to-project allocation always consistent

### **3. Project Allocation Tracking**
- Every stock-out MUST have a project
- Enforced at schema level
- Enables project costing
- Audit trail shows material usage per project

### **4. Concurrent User Safety**
```typescript
currentQuantity: {
  decrement: validatedData.quantity, // Database-level atomic operation
}
```
- Multiple users can process stock-out simultaneously
- Database handles locking
- No race conditions
- Atomic decrement operation

### **5. Complete Audit Trail**
Every stock-out operation records:
- ✓ Who performed the action
- ✓ When it happened (timestamp)
- ✓ What item was allocated
- ✓ How much was removed
- ✓ **Which project received it**
- ✓ Old quantity → New quantity
- ✓ Unit cost at time of allocation
- ✓ IP address and user agent
- ✓ Optional notes

### **6. Cost Tracking**
```typescript
unitCost: item.unitCost, // Captured at time of stock-out
```
- Records material cost when allocated
- Enables accurate project costing
- Historical cost data preserved
- Can calculate project material expenses

---

## 🎯 Key Differences from Stock In

| Feature | Stock In | Stock Out |
|---------|----------|-----------|
| **Project** | Optional | **Required** ⚠️ |
| **Quantity Check** | None | **Must check availability** ⚠️ |
| **Operation** | Increment stock | Decrement stock |
| **Purpose** | Receive inventory | Allocate to project |
| **Cost Tracking** | Optional | Captured for project costing |
| **Validation** | Item exists | Item exists + Project exists + Sufficient stock |

---

## 📊 Database Tables Affected

### **1. stock_movements**
```sql
INSERT INTO stock_movements (
  id, item_id, movement_type, quantity, 
  project_id, performed_by, unit_cost,
  created_at, notes
)
```

### **2. items**
```sql
UPDATE items 
SET current_quantity = current_quantity - ?
WHERE id = ?
```

### **3. audit_logs**
```sql
INSERT INTO audit_logs (
  id, user_id, action, entity_type, entity_id,
  new_values, ip_address, user_agent, created_at
)
```

---

## 🚨 Error Scenarios & Handling

| Error | Cause | Response | User Action |
|-------|-------|----------|-------------|
| Item not found | Invalid/unknown barcode | 404 + Toast error | Verify barcode, try again |
| Project not selected | User forgot to select | Toast: "Please select a project" | Select project from dropdown |
| Project not found | Invalid project ID | 404 + Toast error | Select valid project |
| Insufficient stock | Requested > Available | 400 + "Insufficient stock available" | Reduce quantity or check stock |
| Invalid quantity | Negative or zero | 400 + Validation error | Enter valid positive number |
| Network error | Connection lost | Toast error | Check connection, retry |
| Database error | System issue | 500 + Rollback | Contact admin, retry |

---

## 👥 User Permissions

**Who can perform Stock Out?**
- ✓ Admin users
- ✓ Warehouse staff
- ✗ Billing staff (view only)
- ✗ Project managers (view only)

**Route Protection**:
```typescript
router.post('/out', 
  authenticate, 
  authorize('admin', 'warehouse_staff'), 
  stockController.stockOut
);
```

---

## 📈 Project Costing & Reporting

### **Material Cost Tracking**
Every stock-out records:
- Item unit cost at time of allocation
- Quantity allocated
- Total material cost = unit_cost × quantity

### **Project Reports Can Show**:
1. Total materials consumed by project
2. Material costs per project
3. Which items were used
4. When materials were allocated
5. Who allocated them

### **Example Query Scenario**:
```typescript
// Get all materials allocated to a project
const projectMaterials = await prisma.stockMovement.findMany({
  where: {
    projectId: 'project-uuid',
    movementType: 'stock_out',
  },
  include: {
    item: true,
    performer: true,
  },
  orderBy: { createdAt: 'desc' },
});

// Calculate total material cost
const totalCost = projectMaterials.reduce((sum, movement) => {
  return sum + (movement.unitCost * movement.quantity);
}, 0);
```

---

## 🔍 Monitoring & Reporting

### **Real-time Monitoring**:
1. **Low Stock Alerts**: Triggered when stock drops below min level
2. **Project Material Usage**: Track consumption per project
3. **User Activity**: See who is allocating materials
4. **WebSocket Updates**: All dashboards update in real-time

### **Historical Reports**:
1. **Stock Movement History**: Filter by item, project, date, user
2. **Project Material Reports**: All materials used per project
3. **Audit Logs**: Complete compliance trail
4. **Cost Analysis**: Material costs per project

---

## 📝 Best Practices

1. **Always Select Project First**: Prevents forgetting to allocate
2. **Verify Stock Availability**: Check current quantity before large allocations
3. **Use Accurate Quantities**: Double-check before submission
4. **Add Context in Notes**: Reference work order, phase, or purpose
5. **Monitor Low Stock**: React to low stock alerts promptly
6. **Regular Audits**: Review stock movements and project allocations
7. **Project Closeout**: Verify all material allocations before project completion

---

## 🔗 Related Documentation

- [Stock In Process](./STOCK_IN_PROCESS.md)
- [Project Management Guide](./PROJECT_SUMMARY.md)
- [Barcode Scanner Setup](./QUICKSTART.md)
- [Database Schema](./backend/prisma/schema.prisma)
- [API Documentation](http://localhost:5000/api/docs)

---

## 💡 Tips for Warehouse Staff

### **Efficient Stock-Out Workflow**:
1. Pre-select the project for the day/shift
2. Scan multiple items continuously
3. Use default quantity (1) when appropriate
4. Batch similar items together
5. Clear notes help with project accounting

### **Handling Common Situations**:

**Scenario: "Insufficient stock available"**
- Check current inventory page for actual stock
- Verify if item is in another location
- Consider partial allocation
- Notify procurement if reorder needed

**Scenario: Multiple items for same project**
- Keep project selected
- Scan items sequentially
- System auto-clears for next item
- All allocations tracked to same project

**Scenario: Return materials to stock**
- Use Stock In function
- Add note: "Returned from Project X"
- Optional: Reference original stock-out

---

**Last Updated**: January 22, 2026  
**Version**: 1.0.0
