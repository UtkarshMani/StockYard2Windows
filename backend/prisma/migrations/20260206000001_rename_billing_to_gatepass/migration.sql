-- Rename billing table to gatepass
ALTER TABLE billing RENAME TO gatepass;

-- Rename billing_items table to gatepass_items
ALTER TABLE billing_items RENAME TO gatepass_items;

-- Rename columns in gatepass table
ALTER TABLE gatepass RENAME COLUMN bill_number TO gatepass_number;
ALTER TABLE gatepass RENAME COLUMN bill_date TO gatepass_date;

-- Rename column in gatepass_items table
ALTER TABLE gatepass_items RENAME COLUMN billing_id TO gatepass_id;

-- Update indexes (SQLite doesn't support renaming indexes, they are automatically recreated)
