-- ============================================================
-- SCRIPT 2: CREAR VISTAS SQL
-- Ejecuta esto después de SCRIPT 1
-- ============================================================

-- VISTA 1: Stock actual calculado desde movimientos
CREATE OR REPLACE VIEW v_inventory_current_stock AS
SELECT 
  ii.id,
  ii.code,
  ii.name,
  ii.category,
  ii.unit_cost,
  ii.minimum_stock,
  ii.maximum_stock,
  ii.location,
  COALESCE(SUM(im.quantity), 0) as current_stock,
  ii.minimum_stock as minimum_stock_level,
  CASE 
    WHEN COALESCE(SUM(im.quantity), 0) <= ii.minimum_stock THEN true 
    ELSE false 
  END as is_low_stock,
  COALESCE(SUM(im.quantity) * ii.unit_cost, 0) as total_value,
  ii.created_at
FROM inventory_items ii
LEFT JOIN inventory_movements im ON ii.id = im.inventory_item_id
GROUP BY ii.id, ii.code, ii.name, ii.category, ii.unit_cost, 
         ii.minimum_stock, ii.maximum_stock, ii.location, ii.created_at;

-- VISTA 2: Resumen de requisiciones
CREATE OR REPLACE VIEW v_requisitions_summary AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) as total_count,
  NOW() as calculated_at
FROM requisitions;

-- VISTA 3: Resumen de órdenes de compra
CREATE OR REPLACE VIEW v_purchase_orders_summary AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
  COALESCE(SUM(total_amount) FILTER (WHERE status IN ('pending','active')), 0) as pending_amount,
  COUNT(*) as total_count,
  NOW() as calculated_at
FROM purchase_orders;

-- VISTA 4: Actividad reciente combinada
CREATE OR REPLACE VIEW v_recent_activity AS
SELECT 
  'inventory_movement' as activity_type,
  'Movimiento de inventario' as description,
  'Movimiento: ' || movement_type as detail,
  created_at,
  created_by
FROM inventory_movements
ORDER BY created_at DESC
LIMIT 50;

-- VISTA 5: Estadísticas de inventario
CREATE OR REPLACE VIEW v_inventory_statistics AS
SELECT 
  COUNT(DISTINCT id) as total_items,
  COUNT(DISTINCT CASE WHEN is_low_stock THEN id END) as low_stock_count,
  COALESCE(SUM(current_stock), 0) as total_units,
  COALESCE(SUM(total_value), 0) as total_inventory_value,
  COALESCE(AVG(current_stock), 0) as average_units_per_item,
  MAX(current_stock) as max_stock,
  MIN(current_stock) as min_stock
FROM v_inventory_current_stock;

-- Confirmación
SELECT 
  'v_inventory_current_stock' as vista,
  (SELECT COUNT(*) FROM v_inventory_current_stock) as registros
UNION ALL
SELECT 'v_requisitions_summary', (SELECT COUNT(*) FROM v_requisitions_summary)
UNION ALL
SELECT 'v_purchase_orders_summary', (SELECT COUNT(*) FROM v_purchase_orders_summary)
UNION ALL
SELECT 'v_recent_activity', (SELECT COUNT(*) FROM v_recent_activity)
UNION ALL
SELECT 'v_inventory_statistics', (SELECT COUNT(*) FROM v_inventory_statistics);
