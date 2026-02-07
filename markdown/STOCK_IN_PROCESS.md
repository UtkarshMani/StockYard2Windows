# Stock In Process Documentation

## Overview
This document details the complete workflow for adding inventory stock using the barcode scanning system. The stock-in process allows warehouse staff to quickly receive items into inventory by scanning barcodes with a physical USB/wired scanner or manual entry.

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
3. Mode selector defaults to "Stock In" (green button)

**Technical Details**:
```typescript
useEffect(() => {
  barcodeInputRef.current?.focus();
}, []);
```

**State Variables**:
- `mode`: 'in' | 'out' (set to 'in')
- `scannedItem`: null (no item scanned yet)
- `quantity`: 1 (default quantity)
- `barcodeInput`: '' (empty input field)

---

### **Step 2: Barcode Scanning**
**Location**: `frontend/src/app/dashboard/scan/page.tsx`

#### Physical Scanner Method:
1. Warehouse staff points scanner at barcode
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
      },
      // ... other fields
    }
  }
}
```

**Error Handling**:
- Item not found → 404: "Item not found"
- Invalid barcode format → 400: Validation error

---

### **Step 5: Display Item Details (Frontend)**
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
- ✓ Current Stock Quantity
- ✓ Unit of Measurement
- ✓ Description (if available)

**Auto-Reset**:
```typescript
setBarcodeInput(''); // Clear for next scan
barcodeInputRef.current?.focus(); // Ready for next item
```

---

### **Step 6: Quantity Confirmation**
**Location**: `frontend/src/app/dashboard/scan/page.tsx`

**User Actions**:
1. Review displayed item details
2. Adjust quantity if needed (default: 1)
3. Optionally add notes
4. Click "Process Stock In" button

**UI Elements**:
- Quantity input: Number field (min: 0.01)
- Notes textarea: Optional text field
- Submit button: Green "Process Stock In" button

---

### **Step 7: Submit Stock In Request (Frontend)**
**Location**: `frontend/src/app/dashboard/scan/page.tsx` - Line 61-68

**Process**:
1. `handleStockOperation()` called
2. Validates scannedItem exists
3. Sends POST request to backend

**API Request**:
```typescript
POST /api/v1/stock/in
```

**Request Body**:
```json
{
  "itemId": "uuid",
  "quantity": 5,
  "notes": "Scanned stock in"
}
```

**Optional Fields**:
- `unitCost`: number
- `referenceType`: string
- `referenceId`: string (UUID)
- `location`: string

---

### **Step 8: Backend Validation**
**Location**: `backend/src/controllers/stock.controller.ts` - Line 33-43

**Validation Schema** (Zod):
```typescript
const stockInSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().positive(),
  unitCost: z.number().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});
```

**Checks**:
1. ✓ itemId is valid UUID format
2. ✓ quantity is positive number
3. ✓ Item exists in database
4. ✓ Optional fields are valid formats

**Error Responses**:
- Invalid data → 400: Validation error message
- Item not found → 404: "Item not found"

---

### **Step 9: Database Transaction (CRITICAL)**
**Location**: `backend/src/controllers/stock.controller.ts` - Line 84-137

This is the **most critical part** - all operations succeed or all fail together.

#### **Transaction Phase 1: Create Stock Movement Record**
```typescript
const movement = await tx.stockMovement.create({
  data: {
    itemId: validatedData.itemId,
    movementType: 'stock_in',
    quantity: validatedData.quantity,
    unitCost: validatedData.unitCost,
    referenceType: validatedData.referenceType,
    referenceId: validatedData.referenceId,
    locationTo: validatedData.location,
    notes: validatedData.notes,
    performedBy: req.user!.id,
  },
  include: {
    item: true,
    performer: {
      select: { fullName: true, email: true },
    },
  },
});
```

**Purpose**: Creates audit trail record of stock movement

**Stored Data**:
- Movement type: 'stock_in'
- Item reference
- Quantity added
- User who performed action
- Timestamp (automatic)
- Optional: cost, reference, location, notes

---

#### **Transaction Phase 2: Update Item Quantity**
```typescript
const updatedItem = await tx.item.update({
  where: { id: validatedData.itemId },
  data: {
    currentQuantity: {
      increment: validatedData.quantity,
    },
  },
});
```

**Purpose**: Increases inventory count

**Key Feature - Atomic Increment**:
- Uses database-level increment operation
- Prevents race conditions
- Safe for concurrent users scanning simultaneously
- Locks row during update

**Example**:
- Current quantity: 50 pcs
- Scanned quantity: 5 pcs
- New quantity: 55 pcs

---

#### **Transaction Phase 3: Create Audit Log**
```typescript
await tx.auditLog.create({
  data: {
    userId: req.user!.id,
    action: 'STOCK_IN',
    entityType: 'StockMovement',
    entityId: movement.id,
    newValues: JSON.stringify({
      itemId: validatedData.itemId,
      quantity: validatedData.quantity,
      newQuantity: updatedItem.currentQuantity.toString(),
    }),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  },
});
```

**Purpose**: Complete audit trail for compliance

**Tracked Information**:
- Who: User ID and details
- When: Timestamp (automatic)
- What: Action type and entity
- How much: Old quantity → New quantity
- Where: IP address
- How: User agent (device/browser)

---

### **Step 10: Transaction Commit**

**If ALL operations succeed**:
- Transaction commits to database
- All changes are permanent
- Proceeds to Step 11

**If ANY operation fails**:
- Transaction rolls back
- No changes written to database
- Error returned to frontend
- User sees error toast
- Can retry the operation

**This ensures data integrity!**

---

### **Step 11: Real-time Notification**
**Location**: `backend/src/controllers/stock.controller.ts` - Line 139-144

**Process**:
```typescript
const io = req.app.get('io');
io.emit('stock:updated', {
  type: 'stock_in',
  itemId: validatedData.itemId,
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
- Dashboard charts refresh automatically
- Low stock alerts triggered if applicable
- Inventory page updates without refresh

---

### **Step 12: Success Response**
**Location**: `backend/src/controllers/stock.controller.ts` - Line 146-153

**Response Structure**:
```json
{
  "status": "success",
  "message": "Stock added successfully",
  "data": {
    "movement": {
      "id": "uuid",
      "movementType": "stock_in",
      "quantity": "5.00",
      "item": { /* item details */ },
      "performer": {
        "fullName": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2026-01-22T10:30:00Z"
    },
    "currentQuantity": "55.00"
  }
}
```

---

### **Step 13: Frontend Success Handling**
**Location**: `frontend/src/app/dashboard/scan/page.tsx` - Line 68-73

**Process**:
1. Success response received
2. Green toast shown: "Stock added successfully!"
3. Form reset:
   - `setScannedItem(null)` - clears item
   - `setQuantity(1)` - resets to default
   - `setProjectId('')` - clears project
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
│  (Name, Stock, etc.)    │
└───────────┬─────────────┘
            │ User confirms
            ▼
┌─────────────────────────┐
│  Frontend API Call      │
│  POST /stock/in         │
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
│  DATABASE TRANSACTION   │
│  ┌───────────────────┐  │
│  │ 1. Create Movement│  │
│  │ 2. Update Quantity│  │
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

### **1. Atomic Database Transaction**
- All 3 operations (movement, update, audit) succeed together or fail together
- No partial updates possible
- Database integrity guaranteed

### **2. Concurrent User Safety**
```typescript
currentQuantity: {
  increment: validatedData.quantity, // Database-level atomic operation
}
```
- If 2 users scan the same item simultaneously
- Both increments are processed correctly
- No lost updates
- No race conditions

### **3. Complete Audit Trail**
Every stock-in operation records:
- ✓ Who performed the action
- ✓ When it happened (timestamp)
- ✓ What item was affected
- ✓ How much was added
- ✓ Old quantity → New quantity
- ✓ IP address and user agent
- ✓ Optional notes and references

### **4. Input Validation**
- **Frontend**: React Hook Form + Zod
- **Backend**: Zod schema validation
- **Database**: Prisma type safety + constraints

### **5. Error Handling**
- Network errors: User sees toast, can retry
- Validation errors: Clear error messages
- Database errors: Transaction rollback, no data corruption
- Item not found: Clear "Item not found" message

### **6. Real-time Updates**
- WebSocket broadcasts keep all users synchronized
- Dashboard updates automatically
- Prevents working with stale data

---

## 🎯 Performance Optimizations

### **1. Auto-focus Input**
- Input field ready immediately on page load
- No clicking required
- Fast continuous scanning

### **2. Minimal API Calls**
- Only 2 API calls per stock-in:
  1. Lookup item by barcode
  2. Process stock-in
- No unnecessary data fetching

### **3. Optimistic Updates**
- Form clears immediately after submission
- Ready for next scan while API processes
- Better user experience

### **4. Database Indexing**
```prisma
@@index([barcode])  // Fast barcode lookups
@@index([categoryId])
```

---

## 📊 Database Tables Affected

### **1. stock_movements**
```sql
INSERT INTO stock_movements (
  id, item_id, movement_type, quantity, 
  performed_by, created_at, notes
)
```

### **2. items**
```sql
UPDATE items 
SET current_quantity = current_quantity + ?
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
| Invalid quantity | Negative or zero value | 400 + Validation error | Enter valid quantity |
| Network error | Connection lost | Toast error | Check connection, retry |
| Database error | System issue | 500 + Error message | Contact admin |
| Transaction failure | Race condition/lock | Rollback + Error | Retry operation |

---

## 👥 User Permissions

**Who can perform Stock In?**
- ✓ Admin users
- ✓ Warehouse staff
- ✗ Billing staff (view only)
- ✗ Project managers (view only)

**Route Protection**:
```typescript
router.post('/in', 
  authenticate, 
  authorize('admin', 'warehouse_staff'), 
  stockController.stockIn
);
```

---

## 📱 Supported Barcode Formats

The system supports all formats recognized by physical scanners:
- ✓ UPC-A, UPC-E
- ✓ EAN-8, EAN-13
- ✓ Code 39, Code 128
- ✓ QR Codes (if scanner supports)
- ✓ Custom numeric codes

**Note**: Barcode format is determined by your physical scanner device, not the software.

---

## 🔍 Monitoring & Reporting

All stock-in operations can be tracked via:
1. **Audit Logs** - Complete history with user details
2. **Stock Movement Reports** - Filter by date, item, user
3. **Analytics Dashboard** - Visual charts and trends
4. **Real-time Notifications** - WebSocket events for monitoring

---

## 📝 Best Practices

1. **Keep Input Focused**: Always return focus to barcode field after operations
2. **Verify Item**: Check item name/details before confirming
3. **Accurate Quantities**: Double-check quantity before submission
4. **Use Notes**: Add context (supplier, delivery note, etc.)
5. **Regular Audits**: Review stock movement logs periodically

---

## 🔗 Related Documentation

- [Stock Out Process](./STOCK_OUT_PROCESS.md)
- [Barcode Scanner Setup](./QUICKSTART.md)
- [Database Schema](./backend/prisma/schema.prisma)
- [API Documentation](http://localhost:5000/api/docs)

---

**Last Updated**: January 22, 2026  
**Version**: 1.0.0
