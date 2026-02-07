-- CreateTable
CREATE TABLE "requirements" (
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "requirements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "requirements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "requirements_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "requirements_project_id_idx" ON "requirements"("project_id");

-- CreateIndex
CREATE INDEX "requirements_item_id_idx" ON "requirements"("item_id");

-- CreateIndex
CREATE INDEX "requirements_requested_by_idx" ON "requirements"("requested_by");

-- CreateIndex
CREATE INDEX "requirements_status_idx" ON "requirements"("status");

-- CreateIndex
CREATE INDEX "requirements_week_number_year_idx" ON "requirements"("week_number", "year");
