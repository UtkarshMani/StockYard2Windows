# Critical Bug Fixes - ATP System

**Date:** January 23, 2026  
**Files Modified:** 
- `backend/src/services/inventory.service.ts`
- `backend/src/controllers/requirement.controller.ts`

---

## 🔴 Critical Bug #1: Double-Counting in ATP Calculation

### **Problem:**
The ATP calculation was **double-counting reserved quantities**, causing incorrect available stock values.

**Original Formula:**
```typescript
// WRONG: Double-counting
unbilledRequirements = Requirements with status IN ['approved', 'reserved'] AND billingId = null
ATP = currentStock - reservedQuantity - unbilledDemand
```

**Issue:**
- Requirements with status `'reserved'` already have their quantities included in `item.reservedQuantity`
- The `unbilledDemand` calculation was adding these AGAIN
- Result: Same quantity subtracted twice!

**Example Scenario:**
```
Item: Portland Cement
currentStock: 1000 bags
reservedQuantity: 300 bags (from 3 reserved requirements)

Original Calculation (WRONG):
- unbilledDemand includes those 3 reserved requirements = 300 bags
- ATP = 1000 - 300 - 300 = 400 bags ❌ (WRONG!)

Actual Reality:
- We have 700 bags available (1000 - 300)
- But system shows 400 bags
- Result: 300 bags "lost" due to double-counting!
```

### **Fix:**
```typescript
// CORRECT: Only count approved (not yet reserved)
unbilledRequirements = Requirements with status = 'approved' AND billingId = null
ATP = currentStock - reservedQuantity - unbilledDemand
```

**Corrected Formula:**
- `reservedQuantity`: Tracks requirements with status = `'reserved'`
- `unbilledDemand`: Tracks requirements with status = `'approved'` (not yet reserved)
- No overlap = No double-counting!

**File:** `backend/src/services/inventory.service.ts` (Lines 27-49)

---

## 🔴 Critical Bug #2: Status Update Overwrite

### **Problem:**
Requirements were being updated TWICE with conflicting statuses, causing the final status to be incorrect.

**Flow:**
```typescript
// Step 1: Transfer decision processing (Line 839-860)
for (const reqId of decision.requirementIds) {
  await tx.requirement.update({
    where: { id: reqId },
    data: { status: 'reserved' }, // ✅ Correctly set to 'reserved'
  });
}

// Step 2: DUPLICATE update at end of loop (Line 869-876)
await tx.requirement.updateMany({
  where: { id: { in: decision.requirementIds } },
  data: { status: 'approved' }, // ❌ OVERWRITES 'reserved' back to 'approved'!
});
```

**Result:**
- Requirements that should be `'reserved'` were being reset to `'approved'`
- This broke the ATP calculation logic (which now excludes 'reserved' from unbilledDemand)
- Reservation tracking lost!

### **Fix:**
**Removed the duplicate status update** at lines 869-876. Now the flow is:

**Purchase Decision:**
- Requirements updated to `'approved'` inside purchase block (Line 749)
- Stay as `'approved'` until stock is reserved

**Transfer Decision:**
- Requirements updated to `'reserved'` inside transfer block (Line 850-858)
- Stay as `'reserved'` until billing paid

**File:** `backend/src/controllers/requirement.controller.ts` (Lines 869-878 deleted)

---

## ⚠️ Bug #3: Incorrect Reserved Quantity Distribution

### **Problem:**
Reserved quantity was being split **equally** among requirements, regardless of their actual quantities.

**Original Code:**
```typescript
for (const reqId of decision.requirementIds) {
  await tx.requirement.update({
    where: { id: reqId },
    data: {
      reservedQuantity: decision.transferQuantity / decision.requirementIds.length, // ❌ Equal split!
    },
  });
}
```

**Example Scenario:**
```
Transfer Decision: 100 bags total
Requirements:
- Req A: 60 bags
- Req B: 40 bags

Original (WRONG):
- Req A: reservedQuantity = 100 / 2 = 50 bags ❌
- Req B: reservedQuantity = 100 / 2 = 50 bags ❌
- Total reserved: 100 bags (correct total, wrong distribution)

Problem:
- Req A requested 60 but only got 50 reserved
- Req B requested 40 but got 50 reserved (more than requested!)
- Tracking per-requirement becomes meaningless
```

### **Fix:**
Calculate **proportional** reserved quantity based on each requirement's actual quantity:

```typescript
// Get requirement details first
const requirementsToUpdate = await tx.requirement.findMany({
  where: { id: { in: decision.requirementIds } },
  select: { id: true, quantity: true },
});

const totalReqQty = requirementsToUpdate.reduce((sum, r) => sum + Number(r.quantity), 0);

for (const req of requirementsToUpdate) {
  // Proportional calculation
  const proportionalReserved = (Number(req.quantity) / totalReqQty) * decision.transferQuantity;
  
  await tx.requirement.update({
    where: { id: req.id },
    data: { reservedQuantity: proportionalReserved },
  });
}
```

**Corrected Example:**
```
Transfer Decision: 100 bags total
Requirements:
- Req A: 60 bags (60% of total)
- Req B: 40 bags (40% of total)

Corrected:
- Req A: reservedQuantity = (60/100) * 100 = 60 bags ✅
- Req B: reservedQuantity = (40/100) * 100 = 40 bags ✅
- Total reserved: 100 bags
- Per-requirement tracking accurate!
```

**File:** `backend/src/controllers/requirement.controller.ts` (Lines 837-859)

---

## Impact Analysis

### Before Fixes (BROKEN):
```
Scenario: 
- Item has 1000 bags
- 3 requirements, 100 bags each
- All 3 approved and reserved

ATP Calculation (WRONG):
- reservedQuantity: 300
- unbilledDemand: 300 (double-counting!)
- ATP = 1000 - 300 - 300 = 400 ❌

Status Tracking (WRONG):
- Requirements set to 'reserved'
- Then immediately overwritten to 'approved'
- Final status: 'approved' (lost reservation!)

Reserved Qty Tracking (WRONG):
- Each requirement: reservedQuantity = 100/3 = 33.33
- Total: 99.99 (rounding errors)
```

### After Fixes (CORRECT):
```
Same Scenario:

ATP Calculation (CORRECT):
- reservedQuantity: 300
- unbilledDemand: 0 (only counts 'approved', not 'reserved')
- ATP = 1000 - 300 - 0 = 700 ✅

Status Tracking (CORRECT):
- Requirements set to 'reserved'
- Stay as 'reserved' until billing paid
- No overwrites!

Reserved Qty Tracking (CORRECT):
- Each requirement: reservedQuantity = 100 (proportional)
- Total: 300 (accurate)
```

---

## Testing Verification

### Test Case 1: ATP Double-Counting
```sql
-- Setup
UPDATE items SET currentQuantity = 1000, reservedQuantity = 300 WHERE id = 'item-1';
INSERT INTO requirements (itemId, quantity, status, billingId) 
VALUES ('item-1', 100, 'reserved', NULL);

-- Before fix: ATP would be 600 (1000 - 300 - 100)
-- After fix: ATP should be 700 (1000 - 300)
```

**Expected:** ATP = 700 bags ✅

### Test Case 2: Status Overwrite
```javascript
// Approve transfer decision
const decisions = [{
  itemId: 'item-1',
  action: 'transfer',
  transferQuantity: 100,
  requirementIds: ['req-1'],
  projectId: 'proj-1'
}];

await approvePurchaseOrder(decisions);

// Check requirement status
const req = await prisma.requirement.findUnique({ where: { id: 'req-1' }});

// Before fix: req.status = 'approved' ❌
// After fix: req.status = 'reserved' ✅
```

**Expected:** Status = 'reserved' ✅

### Test Case 3: Proportional Reservation
```javascript
// Requirements
// Req A: 60 bags
// Req B: 40 bags

const decisions = [{
  itemId: 'item-1',
  action: 'transfer',
  transferQuantity: 100,
  requirementIds: ['req-a', 'req-b']
}];

await approvePurchaseOrder(decisions);

// Before fix:
// req-a.reservedQuantity = 50 ❌
// req-b.reservedQuantity = 50 ❌

// After fix:
// req-a.reservedQuantity = 60 ✅
// req-b.reservedQuantity = 40 ✅
```

**Expected:** Proportional split based on actual quantities ✅

---

## Status Flow (Now Correct)

### Purchase Decision:
```
pending → approved → (wait for PO delivery) → fulfilled
```

### Transfer Decision:
```
pending → reserved → (billing created) → billed → fulfilled
                ↓
           (stock reserved,
            not reduced yet)
```

### Key Points:
1. **'approved'**: Decision made, but no reservation yet
2. **'reserved'**: Stock reserved, billing created, awaiting payment
3. **'billed'**: Billing paid, inventory actually reduced
4. **'fulfilled'**: Requirement completed

---

## Summary of Changes

| Issue | Impact | Fix | File |
|-------|--------|-----|------|
| **ATP Double-Counting** | 🔴 CRITICAL - ATP underreported by reserved quantity | Only include 'approved' in unbilledDemand | inventory.service.ts:27-49 |
| **Status Overwrite** | 🔴 CRITICAL - Lost reservation tracking | Removed duplicate status update | requirement.controller.ts:869-878 |
| **Equal Split Reservation** | ⚠️ HIGH - Incorrect per-requirement tracking | Proportional calculation | requirement.controller.ts:837-859 |

---

## Build Status

✅ **All fixes applied successfully**  
✅ **TypeScript compilation: No errors**  
✅ **Prisma Client regenerated: v5.22.0**

---

## Next Steps

1. **Deploy fixes** to development environment
2. **Run integration tests** for ATP calculation
3. **Verify** requirement status tracking
4. **Monitor** for any related issues
5. **Update** frontend if it displays reserved quantities

---

## Related Files Modified

- ✅ `backend/src/services/inventory.service.ts` - ATP calculation fix
- ✅ `backend/src/controllers/requirement.controller.ts` - Status & reservation fixes
- ℹ️ `ATP_IMPLEMENTATION_COMPLETE.md` - Documentation (may need update)
