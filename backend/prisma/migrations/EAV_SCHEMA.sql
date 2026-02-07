-- ============================================
-- EAV (Entity-Attribute-Value) Model Migration
-- Flexible Inventory Management System
-- ============================================

-- Drop existing rigid schema tables (if starting fresh)
-- WARNING: This will delete all data!
-- DROP TABLE IF EXISTS item_attribute_values;
-- DROP TABLE IF EXISTS attributes;
-- DROP TABLE IF EXISTS billing_items;
-- DROP TABLE IF EXISTS billing;
-- DROP TABLE IF EXISTS stock_movements;
-- DROP TABLE IF EXISTS purchase_order_items;
-- DROP TABLE IF EXISTS purchase_orders;
-- DROP TABLE IF EXISTS items;
-- DROP TABLE IF EXISTS categories;

-- ============================================
-- CORE TABLES
-- ============================================

-- Categories table (master list)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Base items table (minimal core fields)
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    barcode TEXT UNIQUE,
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0,1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EAV TABLES
-- ============================================

-- Attributes table (admin-defined fields per category)
CREATE TABLE IF NOT EXISTS attributes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    label TEXT NOT NULL, -- Display name
    input_type TEXT NOT NULL CHECK(input_type IN ('text','number','dropdown','checkbox','file','date','email','url','textarea')),
    required INTEGER DEFAULT 0 CHECK(required IN (0,1)),
    options TEXT, -- JSON array for dropdown/checkbox options: ["Option1","Option2"]
    validation_rules TEXT, -- JSON object for validation: {"min":0,"max":100,"pattern":"regex"}
    help_text TEXT, -- Helper text for form fields
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, name)
);

-- Item attribute values (actual data storage)
CREATE TABLE IF NOT EXISTS item_attribute_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    attribute_id INTEGER NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, attribute_id)
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_items_active ON items(is_active);
CREATE INDEX IF NOT EXISTS idx_attributes_category ON attributes(category_id);
CREATE INDEX IF NOT EXISTS idx_item_attr_item ON item_attribute_values(item_id);
CREATE INDEX IF NOT EXISTS idx_item_attr_attr ON item_attribute_values(attribute_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- ============================================
-- SUPPORTING TABLES (Keep from existing schema)
-- ============================================

-- Users table (unchanged)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','warehouse_staff','billing_staff','project_manager','viewer')),
    phone TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects table (unchanged)
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    project_code TEXT UNIQUE NOT NULL,
    site_address TEXT,
    start_date DATETIME,
    end_date DATETIME,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','on_hold','cancelled')),
    project_manager_id TEXT REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Stock movements (references items)
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id),
    movement_type TEXT NOT NULL CHECK(movement_type IN ('in','out','adjustment','transfer')),
    quantity REAL NOT NULL,
    unit_cost REAL,
    reference_type TEXT,
    reference_id TEXT,
    project_id TEXT REFERENCES projects(id),
    notes TEXT,
    performed_by TEXT REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_project ON stock_movements(project_id);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert categories
INSERT OR IGNORE INTO categories (id, name, description) VALUES
(1, 'Mechanical', 'Mechanical parts and components'),
(2, 'Electrical', 'Electrical equipment and supplies'),
(3, 'Construction', 'Building and construction materials'),
(4, 'Safety Equipment', 'Personal protective equipment and safety gear'),
(5, 'Tools', 'Hand tools and power tools');

-- Insert attributes for Mechanical category
INSERT OR IGNORE INTO attributes (category_id, name, label, input_type, required, options, display_order) VALUES
(1, 'material', 'Material', 'dropdown', 1, '["Steel","Aluminum","Brass","Plastic","Rubber"]', 1),
(1, 'pressure_rating', 'Pressure Rating (PSI)', 'number', 1, NULL, 2),
(1, 'thread_size', 'Thread Size', 'text', 0, NULL, 3),
(1, 'operating_temp', 'Operating Temperature (°C)', 'text', 0, NULL, 4),
(1, 'weight', 'Weight (kg)', 'number', 0, NULL, 5);

-- Insert attributes for Electrical category
INSERT OR IGNORE INTO attributes (category_id, name, label, input_type, required, options, display_order) VALUES
(2, 'voltage', 'Voltage (V)', 'dropdown', 1, '["12V","24V","110V","220V","240V","380V"]', 1),
(2, 'current_rating', 'Current Rating (A)', 'number', 1, NULL, 2),
(2, 'power_rating', 'Power Rating (W)', 'number', 0, NULL, 3),
(2, 'cable_length', 'Cable Length (m)', 'number', 0, NULL, 4),
(2, 'ip_rating', 'IP Rating', 'dropdown', 0, '["IP20","IP44","IP54","IP65","IP67","IP68"]', 5),
(2, 'certification', 'Certification', 'checkbox', 0, '["CE","UL","CSA","RoHS"]', 6);

-- Insert attributes for Construction category
INSERT OR IGNORE INTO attributes (category_id, name, label, input_type, required, options, display_order) VALUES
(3, 'material', 'Material', 'dropdown', 1, '["Concrete","Wood","Steel","Aluminum","PVC","Fiber"]', 1),
(3, 'dimensions', 'Dimensions (L×W×H)', 'text', 1, NULL, 2),
(3, 'load_capacity', 'Load Capacity (kg)', 'number', 0, NULL, 3),
(3, 'finish', 'Finish', 'dropdown', 0, '["Raw","Painted","Galvanized","Powder Coated","Polished"]', 4),
(3, 'weather_resistant', 'Weather Resistant', 'checkbox', 0, '["Yes"]', 5);

-- Insert attributes for Safety Equipment
INSERT OR IGNORE INTO attributes (category_id, name, label, input_type, required, options, display_order) VALUES
(4, 'size', 'Size', 'dropdown', 1, '["XS","S","M","L","XL","XXL","One Size"]', 1),
(4, 'color', 'Color', 'dropdown', 0, '["Yellow","Orange","Red","Blue","Green","White","Black"]', 2),
(4, 'compliance_standard', 'Compliance Standard', 'text', 1, NULL, 3),
(4, 'expiry_date', 'Expiry Date', 'date', 0, NULL, 4),
(4, 'reusable', 'Reusable', 'checkbox', 0, '["Yes"]', 5);

-- Insert sample items with EAV data
INSERT OR IGNORE INTO items (id, name, category_id, description, barcode) VALUES
(1, 'Ball Valve 1/2 inch', 1, 'Brass ball valve with threaded connections', 'MEC001'),
(2, 'Circuit Breaker 20A', 2, 'Single pole circuit breaker', 'ELE001'),
(3, 'Cement Bag 50kg', 3, 'Portland cement for general construction', 'CON001'),
(4, 'Safety Helmet', 4, 'Hard hat with adjustable suspension', 'SAF001');

-- Insert attribute values for Ball Valve (Mechanical)
INSERT OR IGNORE INTO item_attribute_values (item_id, attribute_id, value) VALUES
(1, 1, 'Brass'),
(1, 2, '150'),
(1, 3, '1/2" NPT'),
(1, 4, '-20 to 120'),
(1, 5, '0.25');

-- Insert attribute values for Circuit Breaker (Electrical)
INSERT OR IGNORE INTO item_attribute_values (item_id, attribute_id, value) VALUES
(2, 6, '220V'),
(2, 7, '20'),
(2, 8, '4400'),
(2, 10, 'IP20'),
(2, 11, 'CE,UL');

-- Insert attribute values for Cement (Construction)
INSERT OR IGNORE INTO item_attribute_values (item_id, attribute_id, value) VALUES
(3, 12, 'Concrete'),
(3, 13, '80×40×15 cm'),
(3, 14, '50'),
(3, 15, 'Raw'),
(3, 16, 'Yes');

-- Insert attribute values for Safety Helmet (Safety Equipment)
INSERT OR IGNORE INTO item_attribute_values (item_id, attribute_id, value) VALUES
(4, 17, 'L'),
(4, 18, 'Yellow'),
(4, 19, 'EN 397'),
(4, 21, 'Yes');

-- ============================================
-- VIEWS FOR EASY QUERYING
-- ============================================

-- View to get all items with their attributes in a readable format
CREATE VIEW IF NOT EXISTS v_items_with_attributes AS
SELECT 
    i.id AS item_id,
    i.name AS item_name,
    i.barcode,
    c.name AS category_name,
    a.name AS attribute_name,
    a.label AS attribute_label,
    a.input_type,
    iav.value AS attribute_value
FROM items i
LEFT JOIN categories c ON i.category_id = c.id
LEFT JOIN item_attribute_values iav ON i.item_id = iav.item_id
LEFT JOIN attributes a ON iav.attribute_id = a.id
WHERE i.is_active = 1
ORDER BY i.id, a.display_order;

-- ============================================
-- UTILITY QUERIES
-- ============================================

-- Query to get all attributes for a specific category
-- SELECT * FROM attributes WHERE category_id = 1 ORDER BY display_order;

-- Query to get an item with all its attributes (JSON format)
-- SELECT 
--     i.id, i.name, i.barcode, c.name as category,
--     json_group_array(
--         json_object(
--             'attribute', a.name,
--             'label', a.label,
--             'value', iav.value,
--             'type', a.input_type
--         )
--     ) as attributes
-- FROM items i
-- LEFT JOIN categories c ON i.category_id = c.id
-- LEFT JOIN item_attribute_values iav ON i.id = iav.item_id
-- LEFT JOIN attributes a ON iav.attribute_id = a.id
-- WHERE i.id = 1
-- GROUP BY i.id;
