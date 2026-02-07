-- RedefineIndex
DROP INDEX "billing_bill_date_idx";
CREATE INDEX "gatepass_gatepass_date_idx" ON "gatepass"("gatepass_date");

-- RedefineIndex
DROP INDEX "billing_project_id_idx";
CREATE INDEX "gatepass_project_id_idx" ON "gatepass"("project_id");

-- RedefineIndex
DROP INDEX "billing_bill_number_idx";
CREATE INDEX "gatepass_gatepass_number_idx" ON "gatepass"("gatepass_number");

-- RedefineIndex
DROP INDEX "billing_bill_number_key";
CREATE UNIQUE INDEX "gatepass_gatepass_number_key" ON "gatepass"("gatepass_number");

-- RedefineIndex
DROP INDEX "billing_items_item_id_idx";
CREATE INDEX "gatepass_items_item_id_idx" ON "gatepass_items"("item_id");

-- RedefineIndex
DROP INDEX "billing_items_billing_id_idx";
CREATE INDEX "gatepass_items_gatepass_id_idx" ON "gatepass_items"("gatepass_id");
