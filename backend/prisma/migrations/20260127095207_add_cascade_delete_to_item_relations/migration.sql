-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_billing_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billing_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit_price" DECIMAL NOT NULL,
    "size" TEXT,
    "total_price" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billing_items_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "billing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "billing_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_billing_items" ("billing_id", "created_at", "id", "item_id", "quantity", "size", "total_price", "unit_price") SELECT "billing_id", "created_at", "id", "item_id", "quantity", "size", "total_price", "unit_price" FROM "billing_items";
DROP TABLE "billing_items";
ALTER TABLE "new_billing_items" RENAME TO "billing_items";
CREATE INDEX "billing_items_billing_id_idx" ON "billing_items"("billing_id");
CREATE INDEX "billing_items_item_id_idx" ON "billing_items"("item_id");
CREATE TABLE "new_purchase_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchase_order_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit_price" DECIMAL NOT NULL,
    "total_price" DECIMAL NOT NULL,
    "received_quantity" DECIMAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_purchase_order_items" ("created_at", "id", "item_id", "purchase_order_id", "quantity", "received_quantity", "total_price", "unit_price") SELECT "created_at", "id", "item_id", "purchase_order_id", "quantity", "received_quantity", "total_price", "unit_price" FROM "purchase_order_items";
DROP TABLE "purchase_order_items";
ALTER TABLE "new_purchase_order_items" RENAME TO "purchase_order_items";
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");
CREATE INDEX "purchase_order_items_item_id_idx" ON "purchase_order_items"("item_id");
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
    CONSTRAINT "stock_movements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
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
