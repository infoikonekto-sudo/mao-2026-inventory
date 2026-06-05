-- ============================================================
-- DIAGNÓSTICO MEJORADO Y SEGURO DE SUPABASE
-- Ejecuta esto en el SQL Editor de Supabase
-- ============================================================

-- 1. VER TODAS LAS TABLAS PÚBLICAS
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. VERIFICAR QUÉ TABLAS NECESARIAS EXISTEN
SELECT 
  'inventory_items' as tabla, 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items') THEN 'SÍ EXISTE' ELSE 'NO EXISTE' END as estado
UNION ALL
SELECT 'requisitions', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requisitions') THEN 'SÍ EXISTE' ELSE 'NO EXISTE' END
UNION ALL
SELECT 'purchase_orders', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN 'SÍ EXISTE' ELSE 'NO EXISTE' END
UNION ALL
SELECT 'requisition_items', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requisition_items') THEN 'SÍ EXISTE' ELSE 'NO EXISTE' END
UNION ALL
SELECT 'purchase_order_items', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_items') THEN 'SÍ EXISTE' ELSE 'NO EXISTE' END
UNION ALL
SELECT 'inventory_movements', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN 'SÍ EXISTE' ELSE 'NO EXISTE' END
UNION ALL
SELECT 'audit_logs', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN 'SÍ EXISTE' ELSE 'NO EXISTE' END;

-- 3. ESTRUCTURA DE inventory_items
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory_items'
ORDER BY ordinal_position;

-- 4. ESTRUCTURA DE requisitions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'requisitions'
ORDER BY ordinal_position;

-- 5. ESTRUCTURA DE purchase_orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
ORDER BY ordinal_position;

-- 6. CONTAR REGISTROS EN TABLAS PRINCIPALES
SELECT 'inventory_items' as tabla, COUNT(*)::integer as cantidad FROM inventory_items
UNION ALL
SELECT 'requisitions', COUNT(*)::integer FROM requisitions
UNION ALL
SELECT 'purchase_orders', COUNT(*)::integer FROM purchase_orders;

-- 7. VER MUESTRA DE inventory_items (primeros 3)
SELECT id, code, name, category, current_stock, minimum_stock 
FROM inventory_items 
LIMIT 3;

-- 8. VER MUESTRA DE requisitions (últimos 5)
SELECT id, status, created_at 
FROM requisitions 
ORDER BY created_at DESC 
LIMIT 5;

-- 9. VER MUESTRA DE purchase_orders (últimos 5)
SELECT id, status, total_amount, created_at 
FROM purchase_orders 
ORDER BY created_at DESC 
LIMIT 5;

-- 10. VERIFICAR SI REQUISITION ITEMS EXISTE Y SU ESTRUCTURA
SELECT column_name || ' (' || data_type || ')' as requisition_items_columns
FROM information_schema.columns
WHERE table_name = 'requisition_items'
ORDER BY ordinal_position;
