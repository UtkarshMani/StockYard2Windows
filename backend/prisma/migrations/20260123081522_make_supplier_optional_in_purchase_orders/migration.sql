-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "purchase_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_purchase_orders" ("actual_delivery_date", "created_at", "created_by", "expected_delivery_date", "id", "notes", "order_date", "po_number", "status", "supplier_id", "tax_amount", "total_amount", "updated_at") SELECT "actual_delivery_date", "created_at", "created_by", "expected_delivery_date", "id", "notes", "order_date", "po_number", "status", "supplier_id", "tax_amount", "total_amount", "updated_at" FROM "purchase_orders";
DROP TABLE "purchase_orders";
ALTER TABLE "new_purchase_orders" RENAME TO "purchase_orders";
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");
CREATE INDEX "purchase_orders_po_number_idx" ON "purchase_orders"("po_number");
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");
CREATE INDEX "purchase_orders_project_id_idx" ON "purchase_orders"("project_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
