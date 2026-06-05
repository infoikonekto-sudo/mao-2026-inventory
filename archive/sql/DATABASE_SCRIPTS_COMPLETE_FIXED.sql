-- ============================================
-- MAO 2026 - SCRIPTS SQL COMPLETOS PARA SUPABASE
-- Incluye: Licencias, Usuarios, Inventario, Requisiciones, Órdenes
-- VERSIÓN: Corregida para Supabase PostgreSQL
-- ============================================

-- ============================================
-- PASO 1: INSERTAR LICENCIA
-- ============================================

INSERT INTO licenses (school_code, license_key, expiration_date, max_users, is_active)
VALUES ('MAO-2026', 'LICENSE-MAO-2026-001', '2027-12-31', 50, true)
ON CONFLICT (school_code) DO NOTHING;

-- ============================================
-- PASO 2: INSERTAR USUARIOS (7 de prueba)
-- ============================================

INSERT INTO users (license_id, auth_code, full_name, email, role, department, is_active)
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'SADMIN-K9X2-7M4L', 'Director General', 'director@colegio.com', 'super_admin', 'Dirección', true
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'ADMIN-5C1P-9Q3R', 'Administrador del Sistema', 'admin@colegio.com', 'admin', 'Administración', true
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'COMPRA-8N6T-2Y5W', 'Jefe de Compras', 'jefe.compras@colegio.com', 'jefe_compras', 'Compras', true
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'FINAN-4D7B-1S9Z', 'Analista de Finanzas', 'finanzas@colegio.com', 'finanzas', 'Contabilidad', true
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'GEREN-3H8K-6F2V', 'Gerente', 'gerente@colegio.com', 'gerente', 'Dirección', true
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'PROFE-2L5G-9C4X', 'María López', 'maria@colegio.com', 'profesor', 'Educación', true
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'AUDIT-7P1T-8B6E', 'Auditor del Sistema', 'auditor@colegio.com', 'auditor', 'Auditoría', true
ON CONFLICT (auth_code) DO NOTHING;

-- ============================================
-- PASO 3: INSERTAR INVENTARIO INICIAL (15 items)
-- ============================================

INSERT INTO inventory_items (license_id, item_code, name, category, current_stock, minimum_stock, unit_cost, location)
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'LAP-001', 'Lapiceros azules (paquete x12)', 'Papelería', 25, 10, 45.00, 'Bodega A'
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'LAP-002', 'Lapiceros rojos (paquete x12)', 'Papelería', 18, 10, 45.00, 'Bodega A'
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'HOJ-001', 'Papel Bond A4 (resma)', 'Papelería', 50, 20, 35.00, 'Bodega A'
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'HOJ-002', 'Papel Lustre (paquete)', 'Papelería', 30, 15, 28.00, 'Bodega A'
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'ESC-001', 'Escritorios de madera', 'Mobiliario', 15, 5, 450.00, 'Bodega B'
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'ESC-002', 'Escritorios metálicos', 'Mobiliario', 12, 5, 380.00, 'Bodega B'
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'SIL-001', 'Sillas de clase plásticas', 'Mobiliario', 30, 10, 180.00, 'Bodega B'
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'SIL-002', 'Sillas ejecutivas', 'Mobiliario', 8, 3, 420.00, 'Bodega B'
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'MAR-001', 'Martillos (acero)', 'Herramientas', 8, 3, 85.00, 'Bodega C'
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'DES-001', 'Destornilladores set x10', 'Herramientas', 6, 2, 95.00, 'Bodega C'
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'PER-001', 'Perforadora de papel', 'Oficina', 4, 1, 125.00, 'Oficina'
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'GRA-001', 'Grapadora de escritorio', 'Oficina', 10, 3, 65.00, 'Oficina'
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'CAR-001', 'Caretas de laboratorio', 'Seguridad', 50, 20, 15.00, 'Bodega C'
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'GUA-001', 'Guantes nitrilo (caja x100)', 'Seguridad', 25, 10, 55.00, 'Bodega C'
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'LIM-001', 'Desinfectante (galón)', 'Limpieza', 20, 5, 45.00, 'Bodega A'
ON CONFLICT (item_code) DO NOTHING;

-- ============================================
-- PASO 4: INSERTAR PROVEEDORES (5)
-- ============================================

INSERT INTO suppliers (license_id, name, email, phone, city, contact_name, rating, order_count, is_active)
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'Distribuidora ABC', 'ventas@abcdist.com', '+502 7XXX-1111', 'Ciudad de Guatemala', 'Juan Rodríguez', 4.8, 12, true
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'Papelería Nacional', 'info@papelnacional.com', '+502 7XXX-2222', 'Ciudad de Guatemala', 'María García', 4.5, 8, true
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'Muebles Express', 'pedidos@muebles.com', '+502 7XXX-3333', 'Mixco', 'Carlos López', 4.2, 5, true
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'Ferretería Central', 'compras@ferrecentral.com', '+502 7XXX-4444', 'Zona 3', 'Pedro Ruiz', 4.6, 15, true
UNION ALL
SELECT (SELECT id FROM licenses WHERE school_code = 'MAO-2026'), 'Importadora Global', 'export@global.com', '+502 7XXX-5555', 'Amatitlán', 'Ana Martínez', 4.9, 20, true
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PASO 5: INSERTAR REQUISICIONES DE PRUEBA (5)
-- ============================================

INSERT INTO requisitions (license_id, requisition_number, user_id, status, priority, justification, estimated_amount)
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'REQ-2026-0001',
  (SELECT id FROM users WHERE auth_code = 'PROFE-2L5G-9C4X'),
  'pendiente',
  'alta',
  'Se necesitan materiales para laboratorio de biología',
  1250.00
UNION ALL
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'REQ-2026-0002',
  (SELECT id FROM users WHERE auth_code = 'PROFE-2L5G-9C4X'),
  'aprobada',
  'media',
  'Reponer papelería de oficina',
  450.00
UNION ALL
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'REQ-2026-0003',
  (SELECT id FROM users WHERE auth_code = 'PROFE-2L5G-9C4X'),
  'en_revision',
  'baja',
  'Herramientas para mantenimiento',
  320.00
UNION ALL
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'REQ-2026-0004',
  (SELECT id FROM users WHERE auth_code = 'PROFE-2L5G-9C4X'),
  'rechazada',
  'urgente',
  'Equipos para educación física',
  890.00
UNION ALL
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'REQ-2026-0005',
  (SELECT id FROM users WHERE auth_code = 'PROFE-2L5G-9C4X'),
  'pendiente',
  'alta',
  'Material para salón de clases',
  1100.00
ON CONFLICT (requisition_number) DO NOTHING;

-- ============================================
-- PASO 6: INSERTAR SOLICITUDES DE COMPRA (5)
-- ============================================

INSERT INTO purchase_requests (license_id, request_number, user_id, justification, estimated_amount, status)
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'SOL-2026-0089',
  (SELECT id FROM users WHERE auth_code = 'PROFE-2L5G-9C4X'),
  'Proyectores para salones de clase',
  5250.00,
  'en_revision'
UNION ALL
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'SOL-2026-0088',
  (SELECT id FROM users WHERE auth_code = 'PROFE-2L5G-9C4X'),
  'Material deportivo y equipos',
  1450.00,
  'aprobada'
UNION ALL
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'SOL-2026-0087',
  (SELECT id FROM users WHERE auth_code = 'PROFE-2L5G-9C4X'),
  'Equipos de laboratorio científico',
  3200.00,
  'aprobada'
UNION ALL
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'SOL-2026-0086',
  (SELECT id FROM users WHERE auth_code = 'PROFE-2L5G-9C4X'),
  'Cafetera para oficina administrativa',
  890.00,
  'rechazada'
UNION ALL
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'SOL-2026-0085',
  (SELECT id FROM users WHERE auth_code = 'PROFE-2L5G-9C4X'),
  'Materiales de reparación y mantenimiento',
  2100.00,
  'pendiente'
ON CONFLICT (request_number) DO NOTHING;

-- ============================================
-- PASO 7: INSERTAR ÓRDENES DE COMPRA (5)
-- ============================================

INSERT INTO purchase_orders (license_id, order_number, supplier_id, status, total_amount, delivery_date)
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'ORD-2026-001',
  (SELECT id FROM suppliers WHERE name = 'Papelería Nacional' LIMIT 1),
  'completada',
  5250.00,
  '2026-01-28'
UNION ALL
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'ORD-2026-002',
  (SELECT id FROM suppliers WHERE name = 'Muebles Express' LIMIT 1),
  'en_transito',
  3200.00,
  '2026-02-01'
UNION ALL
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'ORD-2026-003',
  (SELECT id FROM suppliers WHERE name = 'Ferretería Central' LIMIT 1),
  'en_transito',
  1450.00,
  '2026-02-02'
UNION ALL
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'ORD-2026-004',
  (SELECT id FROM suppliers WHERE name = 'Distribuidora ABC' LIMIT 1),
  'pendiente',
  2100.00,
  '2026-02-05'
UNION ALL
SELECT 
  (SELECT id FROM licenses WHERE school_code = 'MAO-2026'),
  'ORD-2026-005',
  (SELECT id FROM suppliers WHERE name = 'Importadora Global' LIMIT 1),
  'en_revision',
  4800.00,
  '2026-02-10'
ON CONFLICT (order_number) DO NOTHING;

-- ============================================
-- PASO 8: CREAR ÍNDICES (OPTIMIZACIÓN)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_license_id ON users(license_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_code ON users(auth_code);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_inventory_license_id ON inventory_items(license_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_requisitions_license_id ON requisitions(license_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_user_id ON requisitions(user_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON requisitions(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_license_id ON purchase_requests(license_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_user_id ON purchase_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_license_id ON purchase_orders(license_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_license_id ON suppliers(license_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_license_id ON audit_logs(license_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_license_id ON activity_feed(license_id);

-- ============================================
-- FIN DE SCRIPTS - ¡EXITOSO!
-- ============================================
-- 
-- Lo que se creó:
-- ✅ 1 Licencia (MAO-2026)
-- ✅ 7 Usuarios con roles diferentes
-- ✅ 15 Items de inventario
-- ✅ 5 Proveedores
-- ✅ 5 Requisiciones
-- ✅ 5 Solicitudes de Compra
-- ✅ 5 Órdenes de Compra
-- ✅ 15 Índices para optimización
--
-- USUARIOS DE PRUEBA (Usa cualquiera para login):
-- - SADMIN-K9X2-7M4L (Super Admin)
-- - ADMIN-5C1P-9Q3R (Admin)
-- - COMPRA-8N6T-2Y5W (Jefe de Compras)
-- - FINAN-4D7B-1S9Z (Finanzas)
-- - GEREN-3H8K-6F2V (Gerente)
-- - PROFE-2L5G-9C4X (Profesor) ← Recomendado para empezar
-- - AUDIT-7P1T-8B6E (Auditor)
--
-- ============================================
