-- =============================================================================
-- WMS: SISTEM MANAJEMEN GUDANG - POSTGRESQL SCHEMA & SEED DATA
-- Studi Kasus: Distributor Jakarta & Bekasi
-- =============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'STAFF', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "GoodsReceiptStatus" AS ENUM ('DRAFT', 'RECEIVED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "DeliveryOrderStatus" AS ENUM ('DRAFT', 'SHIPPED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "StockOpnameStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'ADJUST_IN', 'ADJUST_OUT', 'TRANSFER_IN', 'TRANSFER_OUT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role "Role" NOT NULL DEFAULT 'STAFF',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category_id VARCHAR(36) NOT NULL REFERENCES categories(id),
  sku VARCHAR(100) UNIQUE NOT NULL,
  barcode VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  uom VARCHAR(20) NOT NULL DEFAULT 'PCS',
  min_stock INT NOT NULL DEFAULT 0,
  cost_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  track_expiry BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. WAREHOUSES
CREATE TABLE IF NOT EXISTS warehouses (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. LOCATIONS (Format: Zona-Rak-Level e.g. A-01-02)
CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  warehouse_id VARCHAR(36) NOT NULL REFERENCES warehouses(id),
  code VARCHAR(50) NOT NULL,
  zone VARCHAR(10) NOT NULL,
  rack VARCHAR(10) NOT NULL,
  level VARCHAR(10) NOT NULL,
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT locations_warehouse_code_unique UNIQUE (warehouse_id, code)
);

-- 9. BATCHES (Nomor batch & kedaluwarsa)
CREATE TABLE IF NOT EXISTS batches (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id VARCHAR(36) NOT NULL REFERENCES products(id),
  batch_no VARCHAR(100) NOT NULL,
  expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT batches_product_batch_unique UNIQUE (product_id, batch_no)
);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON batches(expiry_date);

-- 10. STOCK (Stok per produk + lokasi + batch)
CREATE TABLE IF NOT EXISTS stock (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id VARCHAR(36) NOT NULL REFERENCES products(id),
  location_id VARCHAR(36) NOT NULL REFERENCES locations(id),
  batch_id VARCHAR(36) NOT NULL REFERENCES batches(id),
  quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT stock_unique_row UNIQUE (product_id, location_id, batch_id),
  CONSTRAINT stock_qty_non_negative CHECK (quantity >= 0)
);
CREATE INDEX IF NOT EXISTS idx_stock_product ON stock(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_location ON stock(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_batch ON stock(batch_id);

-- 11. STOCK MOVEMENTS (Kartu stok - Append Only)
CREATE TABLE IF NOT EXISTS stock_movements (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id VARCHAR(36) NOT NULL REFERENCES products(id),
  location_id VARCHAR(36) NOT NULL REFERENCES locations(id),
  batch_id VARCHAR(36) NOT NULL REFERENCES batches(id),
  movement_type "MovementType" NOT NULL,
  quantity INT NOT NULL,
  balance_after INT NOT NULL,
  ref_type VARCHAR(50) NOT NULL,
  ref_id VARCHAR(36) NOT NULL,
  ref_no VARCHAR(50) NOT NULL,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT movement_qty_positive CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref_no ON stock_movements(ref_no);

-- 12. GOODS RECEIPTS (Penerimaan Barang)
CREATE TABLE IF NOT EXISTS goods_receipts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  receipt_no VARCHAR(50) UNIQUE NOT NULL,
  supplier_id VARCHAR(36) NOT NULL REFERENCES suppliers(id),
  warehouse_id VARCHAR(36) NOT NULL REFERENCES warehouses(id),
  status "GoodsReceiptStatus" NOT NULL DEFAULT 'DRAFT',
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_by_id VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_status ON goods_receipts(status, created_at);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  goods_receipt_id VARCHAR(36) NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  product_id VARCHAR(36) NOT NULL REFERENCES products(id),
  location_id VARCHAR(36) NOT NULL REFERENCES locations(id),
  batch_no VARCHAR(100) NOT NULL DEFAULT 'DEFAULT',
  expiry_date TIMESTAMPTZ,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. DELIVERY ORDERS (Pengiriman Barang)
CREATE TABLE IF NOT EXISTS delivery_orders (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  customer_id VARCHAR(36) NOT NULL REFERENCES customers(id),
  warehouse_id VARCHAR(36) NOT NULL REFERENCES warehouses(id),
  status "DeliveryOrderStatus" NOT NULL DEFAULT 'DRAFT',
  shipped_at TIMESTAMPTZ,
  notes TEXT,
  created_by_id VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status, created_at);

CREATE TABLE IF NOT EXISTS delivery_order_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  delivery_order_id VARCHAR(36) NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_id VARCHAR(36) NOT NULL REFERENCES products(id),
  location_id VARCHAR(36) NOT NULL REFERENCES locations(id),
  batch_id VARCHAR(36) REFERENCES batches(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. STOCK OPNAMES (Pemeriksaan Fisik Stok)
CREATE TABLE IF NOT EXISTS stock_opnames (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  opname_no VARCHAR(50) UNIQUE NOT NULL,
  warehouse_id VARCHAR(36) NOT NULL REFERENCES warehouses(id),
  status "StockOpnameStatus" NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  rejection_reason TEXT,
  created_by_id VARCHAR(36) NOT NULL REFERENCES users(id),
  approved_by_id VARCHAR(36) REFERENCES users(id),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_opname_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stock_opname_id VARCHAR(36) NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
  product_id VARCHAR(36) NOT NULL REFERENCES products(id),
  location_id VARCHAR(36) NOT NULL REFERENCES locations(id),
  batch_id VARCHAR(36) NOT NULL REFERENCES batches(id),
  system_qty INT NOT NULL,
  physical_qty INT,
  difference INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. DOCUMENT COUNTERS (Penomoran Dokumen Bebas Tabrakan)
CREATE TABLE IF NOT EXISTS document_counters (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(50) UNIQUE NOT NULL,
  current_value INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SEED DATA AWAL (Contoh Distributor: Makanan, Minuman, Elektronik, ATK)
-- =============================================================================

-- Akun Demo (Password: Juntak12345! di-hash dengan bcrypt cost 10)
-- Hash: $2a$10$wO3lQpA5h.oZq6n.43H14u3u2yM0lTfZl55s1O96u80U7Q93eI9u2
INSERT INTO users (id, name, email, password_hash, role) VALUES
  ('usr-admin-01', 'Administrator WMS', 'admin@demo.test', '$2a$10$wO3lQpA5h.oZq6n.43H14u3u2yM0lTfZl55s1O96u80U7Q93eI9u2', 'ADMIN'),
  ('usr-mgr-01', 'Budi Santoso (Manager)', 'manager@demo.test', '$2a$10$wO3lQpA5h.oZq6n.43H14u3u2yM0lTfZl55s1O96u80U7Q93eI9u2', 'MANAGER'),
  ('usr-stf-01', 'Siti Rahma (Staff Gudang)', 'staff@demo.test', '$2a$10$wO3lQpA5h.oZq6n.43H14u3u2yM0lTfZl55s1O96u80U7Q93eI9u2', 'STAFF'),
  ('usr-viw-01', 'Andi Pratama (Viewer)', 'viewer@demo.test', '$2a$10$wO3lQpA5h.oZq6n.43H14u3u2yM0lTfZl55s1O96u80U7Q93eI9u2', 'VIEWER')
ON CONFLICT (email) DO NOTHING;

-- Gudang Jakarta & Bekasi
INSERT INTO warehouses (id, code, name, address) VALUES
  ('wh-jkt', 'WH-JKT', 'Gudang Utama Jakarta', 'Kawasan Industri Pulogadung, Jakarta Timur'),
  ('wh-bks', 'WH-BKS', 'Gudang Distribusi Bekasi', 'Kawasan Industri MM2100, Cikarang Barat, Bekasi')
ON CONFLICT (code) DO NOTHING;

-- Lokasi Rak (Format: Zona-Rak-Level e.g. A-01-01)
INSERT INTO locations (id, warehouse_id, code, zone, rack, level) VALUES
  ('loc-jkt-a0101', 'wh-jkt', 'A-01-01', 'A', '01', '01'),
  ('loc-jkt-a0102', 'wh-jkt', 'A-01-02', 'A', '01', '02'),
  ('loc-jkt-a0103', 'wh-jkt', 'A-01-03', 'A', '01', '03'),
  ('loc-jkt-b0101', 'wh-jkt', 'B-01-01', 'B', '01', '01'),
  ('loc-jkt-b0102', 'wh-jkt', 'B-01-02', 'B', '01', '02'),
  ('loc-bks-a0101', 'wh-bks', 'A-01-01', 'A', '01', '01'),
  ('loc-bks-a0102', 'wh-bks', 'A-01-02', 'A', '01', '02'),
  ('loc-bks-b0101', 'wh-bks', 'B-01-01', 'B', '01', '01')
ON CONFLICT (warehouse_id, code) DO NOTHING;

-- Kategori
INSERT INTO categories (id, code, name, description) VALUES
  ('cat-fnb', 'FNB', 'Makanan & Minuman', 'Produk konsumsi, susu, kopi, biskuit dengan batch & expired'),
  ('cat-elc', 'ELC', 'Elektronik Kecil', 'Aksesoris komputer, kabel, charger, mouse'),
  ('cat-atk', 'ATK', 'Alat Tulis Kantor', 'Kertas, pulpen, map, binder'),
  ('cat-hld', 'HLD', 'Perlengkapan Rumah', 'Sabun, pembersih lantai, tisu')
ON CONFLICT (code) DO NOTHING;

-- Produk
INSERT INTO products (id, category_id, sku, barcode, name, description, uom, min_stock, cost_price, track_expiry) VALUES
  ('prd-susu-uht', 'cat-fnb', 'SKU-FNB-001', '8992345678901', 'Susu UHT Cokelat 1L', 'Susu steril siap minum rasa cokelat', 'KARTON', 20, 180000.00, true),
  ('prd-kopi-inst', 'cat-fnb', 'SKU-FNB-002', '8992345678902', 'Kopi Arabika Sachet 20g (Pack 30)', 'Kopi bubuk premium dalam sachet', 'PACK', 15, 65000.00, true),
  ('prd-mouse-wrl', 'cat-elc', 'SKU-ELC-001', '8993456789012', 'Wireless Optical Mouse 2.4GHz', 'Mouse wireless hemat daya tombol senyap', 'PCS', 10, 85000.00, false),
  ('prd-kabel-typec', 'cat-elc', 'SKU-ELC-002', '8993456789029', 'Kabel Data USB-C to USB-C 100W 1.2m', 'Braided cable fast charging', 'PCS', 25, 45000.00, false),
  ('prd-kertas-a4', 'cat-atk', 'SKU-ATK-001', '8994567890234', 'Kertas HVS A4 80gsm (Dus 5 Rim)', 'Kertas fotokopi putih bersih', 'DUS', 30, 210000.00, false),
  ('prd-sabun-cair', 'cat-hld', 'SKU-HLD-001', '8995678903456', 'Sabun Cuci Piring Ekstrak Jeruk Nipis 800ml', 'Pembersih lemak wangi segar', 'KARTON', 12, 115000.00, true)
ON CONFLICT (sku) DO NOTHING;

-- Suppliers
INSERT INTO suppliers (id, code, name, contact_name, phone, email, address) VALUES
  ('sup-indofood', 'SUP-001', 'PT Sumber Pangan Sejahtera', 'Hendro Wijaya', '021-5551234', 'sales@sumberpangan.co.id', 'Jl. Industri Raya No. 45, Jakarta'),
  ('sup-gadget', 'SUP-002', 'PT Global Solusi Digital', 'Denny Kurniawan', '021-8884321', 'order@globalsolusi.id', 'Komp. Ruko Mangga Dua Mall Blok B-12, Jakarta'),
  ('sup-atk', 'SUP-003', 'PT Paperindo Nusantara', 'Rian Hidayat', '021-7776543', 'info@paperindo.com', 'Kawasan Pergudangan Marunda Center Blok C-3, Bekasi')
ON CONFLICT (code) DO NOTHING;

-- Customers
INSERT INTO customers (id, code, name, contact_name, phone, email, address) VALUES
  ('cst-mart-01', 'CST-001', 'Toko Berkah Mart Kelapa Gading', 'Haji Syamsul', '0812-9988-7766', 'berkahmart@gmail.com', 'Jl. Boulevard Raya Blok TA-2 No. 10, Jakarta Utara'),
  ('cst-tech-01', 'CST-002', 'Cybertech Store Bekasi Cyber Park', 'Agus Salim', '0813-8877-6655', 'cybertech.bcp@gmail.com', 'BCP Lt. 1 No. 45, Jl. KH Noer Ali, Bekasi Selatan'),
  ('cst-grosir-01', 'CST-003', 'Sentosa Grosir Kranji', 'Ibu Mariana', '0815-7766-5544', 'sentosakranji@yahoo.com', 'Jl. Jenderal Sudirman No. 88, Kranji, Bekasi Barat')
ON CONFLICT (code) DO NOTHING;

-- Document Counters
INSERT INTO document_counters (id, name, current_value) VALUES
  ('cnt-gr-2026', 'GR-2026', 10),
  ('cnt-do-2026', 'DO-2026', 8),
  ('cnt-op-2026', 'OP-2026', 2)
ON CONFLICT (name) DO NOTHING;
