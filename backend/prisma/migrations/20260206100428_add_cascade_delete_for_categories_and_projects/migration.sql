-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_gatepass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gatepass_number" TEXT NOT NULL,
    "project_id" TEXT,
    "gatepass_date" DATETIME NOT NULL,
    "due_date" DATETIME,
    "subtotal" DECIMAL NOT NULL,
    "tax_amount" DECIMAL NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL NOT NULL DEFAULT 0,
    "total_amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_date" DATETIME,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "gatepass_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gatepass_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_gatepass" ("created_at", "created_by", "discount_amount", "due_date", "gatepass_date", "gatepass_number", "id", "notes", "payment_date", "project_id", "status", "subtotal", "tax_amount", "total_amount", "updated_at") SELECT "created_at", "created_by", "discount_amount", "due_date", "gatepass_date", "gatepass_number", "id", "notes", "payment_date", "project_id", "status", "subtotal", "tax_amount", "total_amount", "updated_at" FROM "gatepass";
DROP TABLE "gatepass";
ALTER TABLE "new_gatepass" RENAME TO "gatepass";
CREATE UNIQUE INDEX "gatepass_gatepass_number_key" ON "gatepass"("gatepass_number");
CREATE INDEX "gatepass_gatepass_number_idx" ON "gatepass"("gatepass_number");
CREATE INDEX "gatepass_project_id_idx" ON "gatepass"("project_id");
CREATE INDEX "gatepass_gatepass_date_idx" ON "gatepass"("gatepass_date");
CREATE TABLE "new_purchase_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "po_number" TEXT NOT NULL,
    "supplier_id" TEXT,
    "project_id" TEXT,
    "order_date" DATETIME NOT NULL,
    "expected_delivery_date" DATETIME,
    "actual_delivery_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_amount" DECIMAL,
    "tax_amount" DECIMAL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_purchase_orders" ("actual_delivery_date", "created_at", "created_by", "expected_delivery_date", "id", "notes", "order_date", "po_number", "project_id", "status", "supplier_id", "tax_amount", "total_amount", "updated_at") SELECT "actual_delivery_date", "created_at", "created_by", "expected_delivery_date", "id", "notes", "order_date", "po_number", "project_id", "status", "supplier_id", "tax_amount", "total_amount", "updated_at" FROM "purchase_orders";
DROP TABLE "purchase_orders";
ALTER TABLE "new_purchase_orders" RENAME TO "purchase_orders";
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");
CREATE INDEX "purchase_orders_po_number_idx" ON "purchase_orders"("po_number");
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");
CREATE INDEX "purchase_orders_project_id_idx" ON "purchase_orders"("project_id");
CREATE TABLE "new_stock_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "item_id" TEXT NOT NULL,
    "movement_type" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit_cost" DECIMAL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "project_id" TEXT,
    "location_from" TEXT,
    "location_to" TEXT,
    "notes" TEXT,
    "performed_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_stock_movements" ("created_at", "id", "item_id", "location_from", "location_to", "movement_type", "notes", "performed_by", "project_id", "quantity", "reference_id", "reference_type", "unit_cost") SELECT "created_at", "id", "item_id", "location_from", "location_to", "movement_type", "notes", "performed_by", "project_id", "quantity", "reference_id", "reference_type", "unit_cost" FROM "stock_movements";
DROP TABLE "stock_movements";
ALTER TABLE "new_stock_movements" RENAME TO "stock_movements";
CREATE INDEX "stock_movements_item_id_idx" ON "stock_movements"("item_id");
CREATE INDEX "stock_movements_project_id_idx" ON "stock_movements"("project_id");
CREATE INDEX "stock_movements_movement_type_idx" ON "stock_movements"("movement_type");
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements"("created_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
