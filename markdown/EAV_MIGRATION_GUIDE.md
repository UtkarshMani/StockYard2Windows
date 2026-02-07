# EAV Model Migration Guide

## ⚠️ CRITICAL: This is a Major Architecture Change

Converting from a rigid schema to EAV (Entity-Attribute-Value) model is a **fundamental database redesign** that requires extensive code changes.

## What is EAV Model?

**Traditional (Rigid) Schema:**
```
items table: id, name, barcode, voltage, material, pressure_rating, size, etc.
```
- Fixed columns
- Adding new fields requires schema changes
- Wastes space (electrical items have voltage, mechanical don't)

**EAV (Flexible) Schema:**
```
items: id, name, barcode
attributes: id, name, category_id, input_type
item_attribute_values: item_id, attribute_id, value
```
- Dynamic fields per category
- Admin can add new fields without code changes
- Each item only stores relevant attributes

## Benefits of EAV

✅ **Dynamic Fields**: Add new attributes via admin UI without schema changes  
✅ **Category-Specific**: Electrical items get voltage, mechanical get pressure rating  
✅ **Scalable**: Support unlimited product types  
✅ **Flexible**: Different categories have different attributes  
✅ **User-Friendly**: Non-technical admins can customize fields  

## Drawbacks of EAV

❌ **Complex Queries**: Joining multiple tables for simple queries  
❌ **Performance**: Slower than rigid schema for large datasets  
❌ **Type Safety**: All values stored as TEXT (need validation layer)  
❌ **Reporting**: Harder to generate reports and aggregations  
❌ **Learning Curve**: Team needs to understand EAV patterns  

## Migration Steps

### 1. Database Schema Migration

```bash
# Backup existing database FIRST!
cp ~/.config/inventory-management-desktop/data/inventory.db ~/inventory_backup_$(date +%Y%m%d).db

# Apply EAV schema
cd /home/utkarsh-mani/Documents/PIE/Inventory\ Management/backend
sqlite3 prisma/dev.db < prisma/migrations/EAV_SCHEMA.sql
```

### 2. Update Prisma Schema

**File**: `backend/prisma/schema.prisma`

Replace items model with:

```prisma
model Category {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  description String?
  parentId    Int?     @map("parent_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  parent     Category?   @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children   Category[]  @relation("CategoryHierarchy")
  items      Item[]
  attributes Attribute[]

  @@map("categories")
}

model Item {
  id          Int      @id @default(autoincrement())
  name        String
  categoryId  Int?     @map("category_id")
  description String?
  barcode     String?  @unique
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  category       Category?           @relation(fields: [categoryId], references: [id])
  attributeValues ItemAttributeValue[]
  stockMovements  StockMovement[]

  @@map("items")
}

model Attribute {
  id             Int     @id @default(autoincrement())
  categoryId     Int     @map("category_id")
  name           String
  label          String
  inputType      String  @map("input_type")
  required       Boolean @default(false)
  options        String? // JSON array
  validationRules String? @map("validation_rules") // JSON object
  helpText       String? @map("help_text")
  displayOrder   Int     @default(0) @map("display_order")
  createdAt      DateTime @default(now()) @map("created_at")

  category Category              @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  values   ItemAttributeValue[]

  @@unique([categoryId, name])
  @@map("attributes")
}

model ItemAttributeValue {
  id          Int      @id @default(autoincrement())
  itemId      Int      @map("item_id")
  attributeId Int      @map("attribute_id")
  value       String
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  item      Item      @relation(fields: [itemId], references: [id], onDelete: Cascade)
  attribute Attribute @relation(fields: [attributeId], references: [id], onDelete: Cascade)

  @@unique([itemId, attributeId])
  @@map("item_attribute_values")
}
```

### 3. Generate New Prisma Client

```bash
cd backend
npx prisma generate
npm run build
```

### 4. Update Backend Controllers

**Create**: `backend/src/controllers/attribute.controller.ts`

```typescript
export class AttributeController {
  // Get attributes for a category
  async getAttributesByCategory(req: Request, res: Response) {
    const { categoryId } = req.params;
    const attributes = await prisma.attribute.findMany({
      where: { categoryId: parseInt(categoryId) },
      orderBy: { displayOrder: 'asc' }
    });
    res.json({ status: 'success', data: attributes });
  }

  // Create new attribute (admin only)
  async createAttribute(req: Request, res: Response) {
    const { categoryId, name, label, inputType, required, options } = req.body;
    const attribute = await prisma.attribute.create({
      data: { categoryId, name, label, inputType, required, options }
    });
    res.json({ status: 'success', data: attribute });
  }
}
```

**Update**: `backend/src/controllers/item.controller.ts`

```typescript
async createItem(req: Request, res: Response) {
  const { name, categoryId, barcode, attributes } = req.body;
  
  const item = await prisma.$transaction(async (tx) => {
    // Create item
    const newItem = await tx.item.create({
      data: { name, categoryId, barcode }
    });

    // Insert attribute values
    if (attributes && Array.isArray(attributes)) {
      await tx.itemAttributeValue.createMany({
        data: attributes.map(attr => ({
          itemId: newItem.id,
          attributeId: attr.attributeId,
          value: attr.value
        }))
      });
    }

    return newItem;
  });

  res.json({ status: 'success', data: item });
}

async getItemById(req: Request, res: Response) {
  const { id } = req.params;
  
  const item = await prisma.item.findUnique({
    where: { id: parseInt(id) },
    include: {
      category: true,
      attributeValues: {
        include: {
          attribute: true
        }
      }
    }
  });

  // Transform to flat structure
  const itemData = {
    ...item,
    attributes: item.attributeValues.reduce((acc, av) => {
      acc[av.attribute.name] = {
        label: av.attribute.label,
        value: av.value,
        type: av.attribute.inputType
      };
      return acc;
    }, {})
  };

  res.json({ status: 'success', data: itemData });
}
```

### 5. Update Frontend Forms

**Create**: `frontend/src/components/DynamicItemForm.tsx`

```typescript
export function DynamicItemForm({ categoryId, onSubmit }) {
  const [attributes, setAttributes] = useState([]);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // Fetch attributes for category
    api.get(`/attributes/category/${categoryId}`).then(res => {
      setAttributes(res.data.data);
    });
  }, [categoryId]);

  const renderField = (attr) => {
    switch (attr.inputType) {
      case 'text':
      case 'number':
        return (
          <input
            type={attr.inputType}
            required={attr.required}
            onChange={(e) => setFormData({
              ...formData,
              [attr.id]: e.target.value
            })}
          />
        );
      case 'dropdown':
        const options = JSON.parse(attr.options || '[]');
        return (
          <select
            required={attr.required}
            onChange={(e) => setFormData({
              ...formData,
              [attr.id]: e.target.value
            })}
          >
            {options.map(opt => <option key={opt}>{opt}</option>)}
          </select>
        );
      case 'checkbox':
        const checkOptions = JSON.parse(attr.options || '[]');
        return checkOptions.map(opt => (
          <label key={opt}>
            <input type="checkbox" value={opt} />
            {opt}
          </label>
        ));
      // ... more types
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {attributes.map(attr => (
        <div key={attr.id}>
          <label>{attr.label}</label>
          {renderField(attr)}
          {attr.helpText && <small>{attr.helpText}</small>}
        </div>
      ))}
      <button type="submit">Save Item</button>
    </form>
  );
}
```

### 6. Create Admin Attribute Management UI

**File**: `frontend/src/app/dashboard/settings/attributes/page.tsx`

Allow admins to:
- View attributes per category
- Add new attributes with input type, options, validation
- Reorder attributes (drag & drop)
- Delete unused attributes

## Data Migration Script

```typescript
// migrate-to-eav.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToEAV() {
  const oldItems = await prisma.$queryRaw`
    SELECT * FROM old_items_table
  `;

  for (const oldItem of oldItems) {
    // Create new item
    const newItem = await prisma.item.create({
      data: {
        name: oldItem.name,
        categoryId: oldItem.categoryId,
        barcode: oldItem.barcode
      }
    });

    // Migrate fixed columns to EAV
    const attributeMap = {
      'voltage': 6,  // attribute_id for voltage
      'material': 1, // attribute_id for material
      // ... map all fields
    };

    for (const [field, attrId] of Object.entries(attributeMap)) {
      if (oldItem[field]) {
        await prisma.itemAttributeValue.create({
          data: {
            itemId: newItem.id,
            attributeId: attrId,
            value: String(oldItem[field])
          }
        });
      }
    }
  }
}
```

## Testing Checklist

- [ ] All items display correctly with dynamic attributes
- [ ] Adding new items works with category-specific fields
- [ ] Editing items updates attribute values
- [ ] Admin can add new attributes without code changes
- [ ] Dropdown/checkbox options work correctly
- [ ] Required field validation works
- [ ] Search/filter works across attribute values
- [ ] Reports and exports include dynamic attributes
- [ ] Stock movements still work correctly
- [ ] Billing references items correctly
- [ ] Performance is acceptable (< 500ms query time)

## Rollback Plan

If migration fails:

```bash
# Stop application
pkill -f "electron|next|node"

# Restore backup
cp ~/inventory_backup_YYYYMMDD.db ~/.config/inventory-management-desktop/data/inventory.db

# Restart application
./start-desktop.sh
```

## Timeline Estimate

- **Schema Migration**: 1-2 hours
- **Backend Updates**: 8-12 hours
- **Frontend Updates**: 12-16 hours
- **Admin UI for Attributes**: 6-8 hours
- **Testing**: 8-12 hours
- **Total**: **5-7 business days**

## Recommendation

⚠️ **Consider hybrid approach**:
- Keep core fields (name, barcode, quantity) in rigid schema
- Use EAV only for category-specific attributes
- Best of both worlds: Performance + Flexibility

## Questions to Answer Before Migration

1. Do you need to add new item types frequently?
2. Do different categories have vastly different attributes?
3. Is your team comfortable with EAV complexity?
4. Do you have < 10,000 items? (EAV works better at smaller scale)
5. Are your queries mostly by item name/barcode or by attributes?

If answers are mostly "no", stick with current rigid schema and add fields as needed.
