-- CreateTable
CREATE TABLE "attributes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "input_type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT,
    "validation_rules" TEXT,
    "help_text" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "attributes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "item_attribute_values" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "item_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "item_attribute_values_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "item_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attributes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "attributes_category_id_idx" ON "attributes"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "attributes_category_id_name_key" ON "attributes"("category_id", "name");

-- CreateIndex
CREATE INDEX "item_attribute_values_item_id_idx" ON "item_attribute_values"("item_id");

-- CreateIndex
CREATE INDEX "item_attribute_values_attribute_id_idx" ON "item_attribute_values"("attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_attribute_values_item_id_attribute_id_key" ON "item_attribute_values"("item_id", "attribute_id");
