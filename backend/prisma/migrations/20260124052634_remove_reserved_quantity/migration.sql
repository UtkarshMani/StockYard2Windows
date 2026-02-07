/*
  Warnings:

  - You are about to drop the `requirements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `reserved_quantity` on the `items` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "requirements_billing_id_idx";

-- DropIndex
DROP INDEX "requirements_week_number_year_idx";

-- DropIndex
DROP INDEX "requirements_status_idx";

-- DropIndex
DROP INDEX "requirements_requested_by_idx";

-- DropIndex
DROP INDEX "requirements_item_id_idx";

-- DropIndex
DROP INDEX "requirements_project_id_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "requirements";
PRAGMA foreign_keys=on;

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
INSERT INTO "new_items" ("barcode", "brand", "category_id", "created_at", "current_quantity", "description", "id", "image_url", "is_active", "item_type", "location", "max_stock_level", "min_stock_level", "name", "reorder_level", "reorder_quantity", "selling_price", "size", "unit_cost", "unit_of_measurement", "updated_at") SELECT "barcode", "brand", "category_id", "created_at", "current_quantity", "description", "id", "image_url", "is_active", "item_type", "location", "max_stock_level", "min_stock_level", "name", "reorder_level", "reorder_quantity", "selling_price", "size", "unit_cost", "unit_of_measurement", "updated_at" FROM "items";
DROP TABLE "items";
ALTER TABLE "new_items" RENAME TO "items";
CREATE UNIQUE INDEX "items_barcode_key" ON "items"("barcode");
CREATE INDEX "items_barcode_idx" ON "items"("barcode");
CREATE INDEX "items_category_id_idx" ON "items"("category_id");
CREATE INDEX "items_name_idx" ON "items"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
