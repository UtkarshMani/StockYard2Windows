/*
  Warnings:

  - You are about to drop the column `item_type` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `items` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" TEXT,
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
INSERT INTO "new_items" ("barcode", "brand", "category_id", "created_at", "current_quantity", "description", "id", "image_url", "is_active", "location", "max_stock_level", "min_stock_level", "name", "reorder_level", "reorder_quantity", "selling_price", "unit_cost", "unit_of_measurement", "updated_at") SELECT "barcode", "brand", "category_id", "created_at", "current_quantity", "description", "id", "image_url", "is_active", "location", "max_stock_level", "min_stock_level", "name", "reorder_level", "reorder_quantity", "selling_price", "unit_cost", "unit_of_measurement", "updated_at" FROM "items";
DROP TABLE "items";
ALTER TABLE "new_items" RENAME TO "items";
CREATE UNIQUE INDEX "items_barcode_key" ON "items"("barcode");
CREATE INDEX "items_barcode_idx" ON "items"("barcode");
CREATE INDEX "items_category_id_idx" ON "items"("category_id");
CREATE INDEX "items_name_idx" ON "items"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
