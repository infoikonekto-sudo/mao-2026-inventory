-- ============================================
-- MAO 2026 - SCRIPTS SQL PARA SUPABASE
-- Copia y ejecuta en: SQL Editor de Supabase
-- ============================================

-- Tabla: licenses
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code VARCHAR(50) NOT NULL UNIQUE,
  license_key VARCHAR(100) NOT NULL UNIQUE,
  expiration_date DATE NOT NULL,
  max_users INT DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  auth_code VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'profesor',
  department VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: inventory_items
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  item_code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  current_stock INT DEFAULT 0,
  minimum_stock INT DEFAULT 5,
  unit_cost DECIMAL(10,2),
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: requisitions
CREATE TABLE requisitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  requisition_number VARCHAR(50) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  priority VARCHAR(50) DEFAULT 'normal',
  justification TEXT,
  estimated_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: purchase_requests
CREATE TABLE purchase_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  request_number VARCHAR(50) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  justification TEXT,
  estimated_amount DECIMAL(10,2),
  status VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: purchase_orders
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'borrador',
  total_amount DECIMAL(10,2),
  delivery_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  city VARCHAR(100),
  contact_name VARCHAR(100),
  rating DECIMAL(3,2) DEFAULT 5.0,
  order_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50),
  module VARCHAR(50),
  target VARCHAR(255),
  ip_address VARCHAR(45),
  status VARCHAR(50) DEFAULT 'exitoso',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla: activity_feed
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50),
  title VARCHAR(200),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INSERTAR DATOS INICIALES
-- ============================================

-- Insertar licencia
INSERT INTO licenses (school_code, license_key, expiration_date, max_users, is_active)
VALUES ('MAO-2026', 'LICENSE-MAO-2026-001', '2027-12-31', 50, true);

-- Insertar usuarios de prueba
INSERT INTO users (license_id, auth_code, full_name, email, role, department, is_active)
SELECT 
  id,
  'SADMIN-K9X2-7M4L',
  'Director General',
  'director@colegio.com',
  'super_admin',
  'Dirección',
  true
FROM licenses WHERE school_code = 'MAO-2026'
UNION ALL
SELECT 
  id,
  'ADMIN-5C1P-9Q3R',
  'Administrador del Sistema',
  'admin@colegio.com',
  'admin',
  'Administración',
  true
FROM licenses WHERE school_code = 'MAO-2026'
UNION ALL
SELECT 
  id,
  'COMPRA-8N6T-2Y5W',
  'Jefe de Compras',
  'jefe.compras@colegio.com',
  'jefe_compras',
  'Compras',
  true
FROM licenses WHERE school_code = 'MAO-2026'
UNION ALL
SELECT 
  id,
  'FINAN-4D7B-1S9Z',
  'Analista de Finanzas',
  'finanzas@colegio.com',
  'finanzas',
  'Contabilidad',
  true
FROM licenses WHERE school_code = 'MAO-2026'
UNION ALL
SELECT 
  id,
  'GEREN-3H8K-6F2V',
  'Gerente',
  'gerente@colegio.com',
  'gerente',
  'Dirección',
  true
FROM licenses WHERE school_code = 'MAO-2026'
UNION ALL
SELECT 
  id,
  'PROFE-2L5G-9C4X',
  'María López',
  'maria@colegio.com',
  'profesor',
  'Educación',
  true
FROM licenses WHERE school_code = 'MAO-2026'
UNION ALL
SELECT 
  id,
  'AUDIT-7P1T-8B6E',
  'Auditor del Sistema',
  'auditor@colegio.com',
  'auditor',
  'Auditoría',
  true
FROM licenses WHERE school_code = 'MAO-2026';

-- Insertar items de inventario de prueba
INSERT INTO inventory_items (license_id, item_code, name, category, current_stock, minimum_stock, unit_cost, location)
SELECT 
  id, 'LAP-001', 'Lapiceros (paquete x12)', 'Papelería', 25, 10, 45.00, 'Bodega A'
FROM licenses WHERE school_code = 'MAO-2026'
UNION ALL
SELECT 
  id, 'HOJ-001', 'Papel Bond (resma)', 'Papelería', 50, 20, 35.00, 'Bodega A'
FROM licenses WHERE school_code = 'MAO-2026'
UNION ALL
SELECT 
  id, 'ESC-001', 'Escritorios (madera)', 'Mobiliario', 15, 5, 450.00, 'Bodega B'
FROM licenses WHERE school_code = 'MAO-2026'
UNION ALL
SELECT 
  id, 'SIL-001', 'Sillas de clase', 'Mobiliario', 30, 10, 180.00, 'Bodega B'
FROM licenses WHERE school_code = 'MAO-2026'
UNION ALL
SELECT 
  id, 'MAR-001', 'Martillos (acero)', 'Herramientas', 8, 3, 85.00, 'Bodega C'
FROM licenses WHERE school_code = 'MAO-2026';

-- Insertar proveedores de prueba
INSERT INTO suppliers (license_id, name, email, phone, city, contact_name, rating, order_count, is_active)
SELECT 
  id, 'Distribuidora ABC', 'ventas@abcdist.com', '+502 7XXX-1111', 'Ciudad de Guatemala', 'Juan Rodríguez', 4.8, 12, true
FROM licenses WHERE school_code = 'MAO-2026'
UNION ALL
SELECT 
  id, 'Papelería Nacional', 'info@papelnacional.com', '+502 7XXX-2222', 'Ciudad de Guatemala', 'María García', 4.5, 8, true
FROM licenses WHERE school_code = 'MAO-2026'
UNION ALL
SELECT 
  id, 'Muebles Express', 'pedidos@muebles.com', '+502 7XXX-3333', 'Mixco', 'Carlos López', 4.2, 5, true
FROM licenses WHERE school_code = 'MAO-2026'
UNION ALL
SELECT 
  id, 'Ferretería Central', 'compras@ferrecentral.com', '+502 7XXX-4444', 'Zona 3', 'Pedro Ruiz', 4.6, 15, true
FROM licenses WHERE school_code = 'MAO-2026'
UNION ALL
SELECT 
  id, 'Importadora Global', 'export@global.com', '+502 7XXX-5555', 'Amatitlán', 'Ana Martínez', 4.9, 20, true
FROM licenses WHERE school_code = 'MAO-2026';

-- ============================================
-- CREAR ÍNDICES (OPTIMIZACIÓN)
-- ============================================

CREATE INDEX idx_users_license_id ON users(license_id);
CREATE INDEX idx_users_auth_code ON users(auth_code);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_inventory_license_id ON inventory_items(license_id);
CREATE INDEX idx_inventory_category ON inventory_items(category);
CREATE INDEX idx_requisitions_license_id ON requisitions(license_id);
CREATE INDEX idx_requisitions_user_id ON requisitions(user_id);
CREATE INDEX idx_requisitions_status ON requisitions(status);
CREATE INDEX idx_purchase_orders_license_id ON purchase_orders(license_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_suppliers_license_id ON suppliers(license_id);
CREATE INDEX idx_audit_logs_license_id ON audit_logs(license_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_activity_license_id ON activity_feed(license_id);
