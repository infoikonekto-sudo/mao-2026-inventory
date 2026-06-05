-- ============================================================
-- DIAGNÓSTICO ULTRA SIMPLE - UNA SOLA QUERY
-- ============================================================

-- EJECUTA ESTO Y CAPTURA LOS RESULTADOS
SELECT 
  'Tablas que existen' as categoria,
  string_agg(table_name, ', ') as resultado
FROM information_schema.tables 
WHERE table_schema = 'public'

UNION ALL

SELECT 
  'Columnas de inventory_items',
  string_agg(column_name, ', ')
FROM information_schema.columns
WHERE table_name = 'inventory_items'

UNION ALL

SELECT 
  'Columnas de requisitions',
  string_agg(column_name, ', ')
FROM information_schema.columns
WHERE table_name = 'requisitions'

UNION ALL

SELECT 
  'Columnas de purchase_orders',
  string_agg(column_name, ', ')
FROM information_schema.columns
WHERE table_name = 'purchase_orders'

UNION ALL

SELECT 
  'Registros en inventory_items',
  COUNT(*)::text
FROM inventory_items

UNION ALL

SELECT 
  'Registros en requisitions',
  COUNT(*)::text
FROM requisitions

UNION ALL

SELECT 
  'Registros en purchase_orders',
  COUNT(*)::text
FROM purchase_orders

UNION ALL

SELECT 
  'Status valores en requisitions',
  string_agg(DISTINCT status::text, ', ')
FROM requisitions

UNION ALL

SELECT 
  'Status valores en purchase_orders',
  string_agg(DISTINCT status::text, ', ')
FROM purchase_orders;
