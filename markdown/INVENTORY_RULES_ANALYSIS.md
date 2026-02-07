# Inventory Management System - Rules Analysis & Implementation

## Current System Analysis

### ✅ **PARTIALLY IMPLEMENTED** Rules:

#### 1. Inventory Update Rules (⚠️ PARTIALLY IMPLEMENTED)
**Current Status:**
- ❌ Inventory updates happen BEFORE billing in transfer operations
- ❌ No billing-triggered inventory reduction mechanism
- ❌ Stock reduces when transfer is approved, not when billed

**Gap Identified:**
```typescript
// Current code in requirement.controller.ts (Lines 788-793)
// Updates item quantity IMMEDIATELY on transfer approval
await tx.item.update({
  where: { id: decision.itemId },
  data: {
    currentQuantity: {
      decrement: decision.transferQuantity, // ❌ WRONG: Updates before billing
    },
  },
});
```

**Required Fix:** Inventory should only update when billing status changes to 'paid' or 'fulfilled'.

---

#### 2. Internal Requests (Unbilled Requests) (⚠️ PARTIALLY IMPLEMENTED)
**Current Status:**
- ✅ Requirements table tracks requests
- ✅ Has status field: pending/approved/ordered/fulfilled
- ❌ No explicit "unbilled" tracking
- ❌ No dedicated UNBILLED_REQUESTS view/list

**Current Schema:**
```prisma
model Requirement {
  status String @default("pending") // pending, approved, ordered, fulfilled
  // Missing: billedAt, billingId reference
}
```

**Gap:** Status doesn't include "billed" state. Requirements can be "fulfilled" without actual billing completion.

---

#### 3. Demand Check Logic (❌ NOT IMPLEMENTED)
**Current Status:**
- ✅ Checks currentQuantity (current_stock)
- ❌ Does NOT calculate unbilled_demand
- ❌ Does NOT calculate available_stock = current_stock - unbilled_demand

**Current Logic (Lines 556-595):**
```typescript
// Only checks currentStock, ignores unbilled requests
const available = group.currentStock;
if (available >= totalNeeded) {
  suggestion = 'transfer';
  transferQuantity = totalNeeded;
} else if (available <= 0) {
  suggestion = 'purchase';
  purchaseQuantity = totalNeeded;
}
```

**Missing:**
- No calculation of pending unbilled requests for the same item
- No ATP (Available To Promise) logic
- No reservation system

---

#### 4. Decision Logic (⚠️ PARTIALLY IMPLEMENTED)

| Condition | Current Implementation | Status |
|-----------|----------------------|--------|
| **Condition 1:** available_stock ≥ request → TR | ✅ Implemented (but ATP wrong) | ⚠️ Partial |
| **Condition 2:** Deficit warning + TR | ❌ Not implemented | ❌ Missing |
| **Condition 3A:** current_stock < request → PO | ✅ Implemented | ✅ Done |
| **Condition 3B:** Inter-warehouse transfer | ❌ Not implemented | ❌ Missing |
| **Condition 3C:** Backorder creation | ❌ Not implemented | ❌ Missing |

**Current Code:**
```typescript
// Lines 586-609 - Simple 3-way split, missing complex conditions
if (available >= totalNeeded) {
  suggestion = 'transfer';
} else if (available <= 0) {
  suggestion = 'purchase';
} else {
  suggestion = 'split';
}
```

---

#### 5. Additional Conditions (❌ MOSTLY NOT IMPLEMENTED)

| Condition | Status | Notes |
|-----------|--------|-------|
| **Condition 4:** Partial Fulfillment | ✅ Implemented | Works via 'split' suggestion |
| **Condition 5:** FIFO Queueing | ⚠️ Partial | Orders by createdAt but no reservation |
| **Condition 6:** Auto Reorder Trigger | ❌ Missing | No minStockLevel check triggers PO |
| **Condition 7:** Billing-Triggered Updates | ❌ Missing | Critical gap |

---

## Implementation Plan

### Phase 1: Schema Changes (Required)

```prisma
model Requirement {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  itemId      String   @map("item_id")
  quantity    Decimal
  priority    String   @default("normal")
  status      String   @default("pending") // pending, approved, reserved, billed, fulfilled
  billedAt    DateTime? @map("billed_at")  // ✨ NEW
  billingId   String?   @map("billing_id") // ✨ NEW - Link to billing record
  reservedQuantity Decimal? @default(0) @map("reserved_quantity") // ✨ NEW
  reason      String?
  requestedBy String   @map("requested_by")
  weekNumber  Int?     @map("week_number")
  year        Int?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  item        Item    @relation(fields: [itemId], references: [id])
  requester   User    @relation("RequirementRequester", fields: [requestedBy], references: [id])
  billing     Billing? @relation(fields: [billingId], references: [id]) // ✨ NEW

  @@index([projectId])
  @@index([itemId])
  @@index([requestedBy])
  @@index([status])
  @@index([weekNumber, year])
  @@index([billingId]) // ✨ NEW
  @@map("requirements")
}

model Billing {
  // ... existing fields
  requirements Requirement[] // ✨ NEW - Reverse relation
}

model Item {
  id                String   @id @default(uuid())
  // ... existing fields
  currentQuantity   Decimal  @default(0) @map("current_quantity")
  reservedQuantity  Decimal  @default(0) @map("reserved_quantity") // ✨ NEW
  availableQuantity Decimal  @default(0) @map("available_quantity") // ✨ NEW (computed)
  minStockLevel     Decimal  @default(0) @map("min_stock_level")
  reorderLevel      Decimal  @default(0) @map("reorder_level") // ✨ NEW
  reorderQuantity   Decimal  @default(0) @map("reorder_quantity") // ✨ NEW
}

// ✨ NEW: Backorder tracking
model Backorder {
  id            String   @id @default(uuid())
  requirementId String   @map("requirement_id")
  itemId        String   @map("item_id")
  quantity      Decimal
  status        String   @default("pending") // pending, fulfilled, cancelled
  reason        String?
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  requirement Requirement @relation(fields: [requirementId], references: [id])
  item        Item        @relation(fields: [itemId], references: [id])

  @@index([requirementId])
  @@index([itemId])
  @@index([status])
  @@map("backorders")
}
```

### Phase 2: Core Business Logic Implementation

#### A. ATP (Available To Promise) Calculator
```typescript
// services/inventory.service.ts
export class InventoryService {
  
  /**
   * Calculate Available To Promise (ATP) for an item
   * ATP = current_stock - unbilled_demand
   */
  async calculateATP(itemId: string): Promise<{
    currentStock: number;
    unbilledDemand: number;
    availableStock: number;
    reservedQuantity: number;
  }> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        currentQuantity: true,
        reservedQuantity: true,
      },
    });

    if (!item) {
      throw new AppError('Item not found', 404);
    }

    // Get all unbilled requirements (approved but not yet billed)
    const unbilledRequirements = await prisma.requirement.findMany({
      where: {
        itemId,
        status: { in: ['approved', 'reserved'] },
        billingId: null, // Not yet billed
      },
      select: {
        quantity: true,
      },
    });

    const currentStock = Number(item.currentQuantity);
    const reserved = Number(item.reservedQuantity || 0);
    const unbilledDemand = unbilledRequirements.reduce(
      (sum, req) => sum + Number(req.quantity),
      0
    );

    const availableStock = currentStock - unbilledDemand - reserved;

    return {
      currentStock,
      unbilledDemand,
      availableStock,
      reservedQuantity: reserved,
    };
  }

  /**
   * Reserve stock for a requirement
   */
  async reserveStock(requirementId: string, quantity: number): Promise<void> {
    const requirement = await prisma.requirement.findUnique({
      where: { id: requirementId },
      include: { item: true },
    });

    if (!requirement) {
      throw new AppError('Requirement not found', 404);
    }

    const atp = await this.calculateATP(requirement.itemId);

    if (atp.availableStock < quantity) {
      throw new AppError(
        `Insufficient available stock. Available: ${atp.availableStock}, Requested: ${quantity}`,
        400
      );
    }

    await prisma.$transaction([
      // Update requirement status to 'reserved'
      prisma.requirement.update({
        where: { id: requirementId },
        data: {
          status: 'reserved',
          reservedQuantity: quantity,
        },
      }),
      // Update item reserved quantity
      prisma.item.update({
        where: { id: requirement.itemId },
        data: {
          reservedQuantity: {
            increment: quantity,
          },
        },
      }),
    ]);
  }

  /**
   * Release reserved stock (if requirement cancelled)
   */
  async releaseReservedStock(requirementId: string): Promise<void> {
    const requirement = await prisma.requirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement || !requirement.reservedQuantity) {
      return;
    }

    await prisma.$transaction([
      prisma.requirement.update({
        where: { id: requirementId },
        data: {
          status: 'cancelled',
          reservedQuantity: 0,
        },
      }),
      prisma.item.update({
        where: { id: requirement.itemId },
        data: {
          reservedQuantity: {
            decrement: Number(requirement.reservedQuantity),
          },
        },
      }),
    ]);
  }

  /**
   * Check if item needs reordering
   */
  async checkReorderLevel(itemId: string): Promise<boolean> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        currentQuantity: true,
        reservedQuantity: true,
        reorderLevel: true,
      },
    });

    if (!item || !item.reorderLevel) {
      return false;
    }

    const atp = await this.calculateATP(itemId);
    return atp.availableStock <= Number(item.reorderLevel);
  }
}
```

#### B. Enhanced Decision Logic
```typescript
// services/procurement.service.ts
export class ProcurementService {
  
  async analyzeDemand(itemId: string, requestedQuantity: number, requestId: string): Promise<{
    action: 'transfer' | 'purchase' | 'split' | 'backorder' | 'inter_warehouse';
    transferQuantity: number;
    purchaseQuantity: number;
    warning?: string;
    backorder?: boolean;
  }> {
    const inventoryService = new InventoryService();
    const atp = await this.calculateATP(itemId);
    
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new AppError('Item not found', 404);
    }

    // CONDITION 1: Sufficient available stock
    if (atp.availableStock >= requestedQuantity) {
      return {
        action: 'transfer',
        transferQuantity: requestedQuantity,
        purchaseQuantity: 0,
      };
    }

    // CONDITION 2: Deficit overall but physical stock OK
    if (atp.currentStock >= requestedQuantity && atp.availableStock < requestedQuantity) {
      return {
        action: 'transfer',
        transferQuantity: requestedQuantity,
        purchaseQuantity: 0,
        warning: `Reservation deficit exists (${Math.abs(atp.availableStock)} units). Procurement required for earlier requests.`,
      };
    }

    // CONDITION 3A: Not enough physical stock & purchase allowed
    if (atp.currentStock < requestedQuantity) {
      const shortfall = requestedQuantity - atp.currentStock;
      
      // Check if inter-warehouse transfer is possible
      const otherWarehouseStock = await this.checkOtherWarehouses(itemId, shortfall);
      
      // CONDITION 3B: Stock available in other warehouses
      if (otherWarehouseStock.available >= shortfall) {
        return {
          action: 'inter_warehouse',
          transferQuantity: requestedQuantity,
          purchaseQuantity: 0,
        };
      }

      // CONDITION 3C: No supply possible - create backorder
      if (!item.isActive) {
        return {
          action: 'backorder',
          transferQuantity: 0,
          purchaseQuantity: 0,
          backorder: true,
        };
      }

      // CONDITION 4: Partial fulfillment
      if (atp.currentStock > 0) {
        return {
          action: 'split',
          transferQuantity: atp.currentStock,
          purchaseQuantity: shortfall,
        };
      }

      // Default: Purchase all
      return {
        action: 'purchase',
        transferQuantity: 0,
        purchaseQuantity: requestedQuantity,
      };
    }

    // Fallback
    return {
      action: 'purchase',
      transferQuantity: 0,
      purchaseQuantity: requestedQuantity,
    };
  }

  private async checkOtherWarehouses(itemId: string, quantity: number): Promise<{
    available: number;
    warehouses: string[];
  }> {
    // Placeholder for multi-warehouse logic
    // In current system, only one warehouse, so return 0
    return { available: 0, warehouses: [] };
  }
}
```

#### C. Billing-Triggered Inventory Update
```typescript
// controllers/billing.controller.ts - UPDATE METHOD

async updateBillingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, paymentDate } = req.body;

    const billing = await prisma.billing.findUnique({
      where: { id },
      include: {
        items: true,
        requirements: true,
      },
    });

    if (!billing) {
      throw new AppError('Billing not found', 404);
    }

    // ✨ CRITICAL: Inventory updates ONLY when billing is paid/fulfilled
    if ((status === 'paid' || status === 'fulfilled') && billing.status === 'pending') {
      await prisma.$transaction(async (tx) => {
        // Update billing status
        await tx.billing.update({
          where: { id },
          data: {
            status,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          },
        });

        // NOW reduce inventory for each item
        for (const item of billing.items) {
          await tx.item.update({
            where: { id: item.itemId },
            data: {
              currentQuantity: {
                decrement: Number(item.quantity),
              },
              reservedQuantity: {
                decrement: Number(item.quantity), // Release reservation
              },
            },
          });

          // Update requirements to 'billed' status
          await tx.requirement.updateMany({
            where: {
              billingId: id,
            },
            data: {
              status: 'billed',
              billedAt: new Date(),
            },
          });
        }

        // Check if any items need reordering after this billing
        const inventoryService = new InventoryService();
        for (const item of billing.items) {
          const needsReorder = await inventoryService.checkReorderLevel(item.itemId);
          if (needsReorder) {
            // Trigger auto-reorder (Condition 6)
            await this.triggerAutoReorder(item.itemId, tx);
          }
        }
      });

      res.json({
        status: 'success',
        message: 'Billing status updated and inventory adjusted',
      });
    } else {
      // Regular status update without inventory changes
      await prisma.billing.update({
        where: { id },
        data: { status, paymentDate: paymentDate ? new Date(paymentDate) : undefined },
      });

      res.json({
        status: 'success',
        message: 'Billing status updated',
      });
    }
  } catch (error) {
    next(error);
  }
}

private async triggerAutoReorder(itemId: string, tx: any): Promise<void> {
  const item = await tx.item.findUnique({
    where: { id: itemId },
  });

  if (!item || !item.reorderQuantity) {
    return;
  }

  // Generate PO number
  const poNumber = `PO-AUTO-${Date.now()}`;

  // Create purchase order
  await tx.purchaseOrder.create({
    data: {
      poNumber,
      orderDate: new Date(),
      status: 'pending',
      notes: `Auto-generated reorder (stock below reorder level: ${item.reorderLevel})`,
      createdBy: 'system', // Or use an admin user ID
      items: {
        create: {
          itemId,
          quantity: item.reorderQuantity,
          unitPrice: item.unitCost || 0,
          totalPrice: Number(item.unitCost || 0) * Number(item.reorderQuantity),
        },
      },
    },
  });

  // TODO: Send notification to purchase team
}
```

#### D. FIFO Request Handling
```typescript
// services/requirement.service.ts

async processFIFORequests(itemId: string): Promise<void> {
  // Get all pending/approved requirements in FIFO order
  const requirements = await prisma.requirement.findMany({
    where: {
      itemId,
      status: { in: ['pending', 'approved'] },
      billingId: null,
    },
    orderBy: [
      { priority: 'desc' }, // Urgent first
      { createdAt: 'asc' }, // Then FIFO
    ],
  });

  const inventoryService = new InventoryService();
  const atp = await inventoryService.calculateATP(itemId);

  let remainingATP = atp.availableStock;

  for (const req of requirements) {
    const reqQty = Number(req.quantity);

    if (remainingATP >= reqQty) {
      // Can fulfill this request
      await inventoryService.reserveStock(req.id, reqQty);
      remainingATP -= reqQty;
    } else if (remainingATP > 0) {
      // Partial fulfillment
      await inventoryService.reserveStock(req.id, remainingATP);
      remainingATP = 0;
      break;
    } else {
      // No stock left
      break;
    }
  }
}
```

---

## Migration Script

```typescript
// migrations/add_inventory_atp_fields.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  console.log('Adding new fields to schema...');

  // Note: SQLite doesn't support adding columns with foreign keys in ALTER TABLE
  // You'll need to generate a Prisma migration instead:
  // npx prisma migrate dev --name add_inventory_atp_fields

  // After migration, initialize computed fields
  console.log('Initializing reserved quantities...');
  
  const items = await prisma.item.findMany();
  
  for (const item of items) {
    // Calculate current reserved quantity from approved requirements
    const reserved = await prisma.requirement.aggregate({
      where: {
        itemId: item.id,
        status: { in: ['approved', 'reserved'] },
        billingId: null,
      },
      _sum: {
        quantity: true,
      },
    });

    await prisma.item.update({
      where: { id: item.id },
      data: {
        reservedQuantity: reserved._sum.quantity || 0,
        reorderLevel: Number(item.minStockLevel) * 1.5, // Set reorder level 50% above min
        reorderQuantity: Number(item.minStockLevel) * 2, // Reorder double the min
      },
    });
  }

  console.log('Migration complete!');
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## Implementation Checklist

### ✅ Phase 1: Database Schema (Week 1)
- [ ] Add `billingId`, `billedAt`, `reservedQuantity` to Requirements
- [ ] Add `reservedQuantity`, `reorderLevel`, `reorderQuantity` to Items
- [ ] Create Backorder model
- [ ] Add relation between Billing and Requirements
- [ ] Run migration
- [ ] Initialize computed fields with script

### ⚠️ Phase 2: Core Services (Week 2)
- [ ] Implement InventoryService with ATP calculation
- [ ] Implement ProcurementService with enhanced decision logic
- [ ] Implement stock reservation system
- [ ] Implement FIFO request processing

### ❌ Phase 3: Controller Updates (Week 3)
- [ ] Update requirement.controller.ts - remove immediate inventory updates
- [ ] Update billing.controller.ts - add billing-triggered inventory reduction
- [ ] Add auto-reorder trigger logic
- [ ] Add backorder creation logic

### ❌ Phase 4: Frontend Updates (Week 4)
- [ ] Add ATP display in inventory views
- [ ] Show reserved vs available quantities
- [ ] Add backorder management UI
- [ ] Add deficit warnings in PO review
- [ ] Update requirement status to show 'reserved' and 'billed'

### ❌ Phase 5: Testing & Validation (Week 5)
- [ ] Unit tests for ATP calculation
- [ ] Integration tests for billing-triggered updates
- [ ] Test FIFO reservation logic
- [ ] Test auto-reorder triggers
- [ ] Load testing for concurrent requests

---

## Summary Table: Rule Implementation Status

| Rule | Current Status | Priority | Effort |
|------|---------------|----------|--------|
| **1. Inventory Updates After Billing** | ❌ Critical Gap | 🔴 P0 | High |
| **2. Unbilled Requests Tracking** | ⚠️ Partial | 🔴 P0 | Medium |
| **3. ATP Calculation** | ❌ Missing | 🔴 P0 | High |
| **4. Enhanced Decision Logic** | ⚠️ Partial | 🟡 P1 | High |
| **5. Condition 1: Sufficient Stock → TR** | ✅ Done (wrong ATP) | 🟡 P1 | Low |
| **6. Condition 2: Deficit Warning + TR** | ❌ Missing | 🟡 P1 | Medium |
| **7. Condition 3A: Purchase Order** | ✅ Done | ✅ P2 | - |
| **8. Condition 3B: Inter-warehouse** | ❌ Missing | 🟢 P3 | High |
| **9. Condition 3C: Backorder** | ❌ Missing | 🟡 P1 | Medium |
| **10. Condition 4: Partial Fulfillment** | ✅ Done | ✅ P2 | - |
| **11. Condition 5: FIFO Queueing** | ⚠️ Partial | 🔴 P0 | Medium |
| **12. Condition 6: Auto Reorder** | ❌ Missing | 🟡 P1 | Medium |
| **13. Condition 7: Billing-Triggered Updates** | ❌ Missing | 🔴 P0 | High |

**Legend:**
- 🔴 P0: Critical - Core business rule violation
- 🟡 P1: Important - Impacts accuracy
- 🟢 P2: Nice to have - Optimization
- ✅ Done, ⚠️ Partial, ❌ Missing

---

## Estimated Timeline: **5 weeks** (assuming 1 developer full-time)

## Critical Path:
1. Database schema changes (Week 1)
2. ATP calculation service (Week 2)
3. Billing-triggered inventory updates (Week 3)
4. FIFO reservation system (Week 3-4)
5. Testing and validation (Week 5)
