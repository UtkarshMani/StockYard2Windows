-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" TEXT,
    "item_type" TEXT,
    "size" TEXT,
    "brand" TEXT,
    "unit_of_measurement" TEXT NOT NULL,
    "current_quantity" DECIMAL NOT NULL DEFAULT 0,
    "reserved_quantity" DECIMAL NOT NULL DEFAULT 0,
    "min_stock_level" DECIMAL NOT NULL DEFAULT 0,
    "max_stock_level" DECIMAL,
    "reorder_level" DECIMAL NOT NULL DEFAULT 0,
    "reorder_quantity" DECIMAL NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL,
    "selling_price" DECIMAL,
    "location" TEXT,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_items" ("barcode", "brand", "category_id", "created_at", "current_quantity", "description", "id", "image_url", "is_active", "item_type", "location", "max_stock_level", "min_stock_level", "name", "selling_price", "size", "unit_cost", "unit_of_measurement", "updated_at") SELECT "barcode", "brand", "category_id", "created_at", "current_quantity", "description", "id", "image_url", "is_active", "item_type", "location", "max_stock_level", "min_stock_level", "name", "selling_price", "size", "unit_cost", "unit_of_measurement", "updated_at" FROM "items";
DROP TABLE "items";
ALTER TABLE "new_items" RENAME TO "items";
CREATE UNIQUE INDEX "items_barcode_key" ON "items"("barcode");
CREATE INDEX "items_barcode_idx" ON "items"("barcode");
CREATE INDEX "items_category_id_idx" ON "items"("category_id");
CREATE INDEX "items_name_idx" ON "items"("name");
CREATE TABLE "new_requirements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "requested_by" TEXT NOT NULL,
    "week_number" INTEGER,
    "year" INTEGER,
    "billed_at" DATETIME,
    "billing_id" TEXT,
    "reserved_quantity" DECIMAL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "requirements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "requirements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "requirements_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "requirements_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "billing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_requirements" ("created_at", "id", "item_id", "priority", "project_id", "quantity", "reason", "requested_by", "status", "updated_at", "week_number", "year") SELECT "created_at", "id", "item_id", "priority", "project_id", "quantity", "reason", "requested_by", "status", "updated_at", "week_number", "year" FROM "requirements";
DROP TABLE "requirements";
ALTER TABLE "new_requirements" RENAME TO "requirements";
CREATE INDEX "requirements_project_id_idx" ON "requirements"("project_id");
CREATE INDEX "requirements_item_id_idx" ON "requirements"("item_id");
CREATE INDEX "requirements_requested_by_idx" ON "requirements"("requested_by");
CREATE INDEX "requirements_status_idx" ON "requirements"("status");
CREATE INDEX "requirements_week_number_year_idx" ON "requirements"("week_number", "year");
CREATE INDEX "requirements_billing_id_idx" ON "requirements"("billing_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
