-- ============================================================
-- VERIFICAR ESTRUCTURA DE ITEMS EN REQUISICIONES Y ÓRDENES
-- ============================================================

-- 1. Ver estructura completa de requisitions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'requisitions'
ORDER BY ordinal_position;

-- 2. Ver un ejemplo de requisition
SELECT * FROM requisitions LIMIT 1;

-- 3. Ver estructura completa de purchase_orders
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
ORDER BY ordinal_position;

-- 4. Ver un ejemplo de purchase_order
SELECT * FROM purchase_orders LIMIT 1;

-- 5. Buscar tablas que contengan "item" o "detail" o "line"
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (table_name LIKE '%item%' OR table_name LIKE '%detail%' OR table_name LIKE '%line%')
ORDER BY table_name;

-- 6. Ver todas las tablas y sus relaciones
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
