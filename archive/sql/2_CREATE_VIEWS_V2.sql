-- ============================================================
-- SCRIPT ACTUALIZADO 2: CREAR VISTAS
-- Adaptadas a tu estructura real
-- ============================================================

-- 1. VISTA: Stock actual calculado desde movimientos
CREATE OR REPLACE VIEW v_inventory_current_stock AS
SELECT 
  i.id as item_id,
  i.license_id,
  i.code,
  i.sku,
  i.name,
  i.category,
  i.minimum_stock,
  i.unit_cost,
  
  -- Stock inicial (asumimos que current_stock es el stock inicial)
  COALESCE(i.current_stock, 0) as initial_stock,
  
  -- Suma de todos los movimientos
  COALESCE(SUM(m.quantity), 0) as movements_total,
  
  -- Stock actual = inicial + movimientos
  COALESCE(i.current_stock, 0) + COALESCE(SUM(m.quantity), 0) as current_stock,
  
  -- ¿Stock bajo?
  CASE 
    WHEN (COALESCE(i.current_stock, 0) + COALESCE(SUM(m.quantity), 0)) <= COALESCE(i.minimum_stock, 0)
    THEN true 
    ELSE false 
  END as is_low_stock,
  
  i.created_at,
  i.updated_at
FROM inventory_items i
LEFT JOIN inventory_movements m 
  ON i.id = m.inventory_item_id
  AND i.license_id = m.license_id
GROUP BY 
  i.id, i.license_id, i.code, i.sku, i.name, i.category,
  i.minimum_stock, i.unit_cost, i.current_stock, i.created_at, i.updated_at;

-- 2. VISTA: Resumen de requisiciones
CREATE OR REPLACE VIEW v_requisitions_summary AS
SELECT 
  license_id,
  COUNT(*) as total_requisitions,
  SUM(CASE WHEN status = 'aprobada' THEN 1 ELSE 0 END) as approved_count,
  SUM(CASE WHEN status = 'en_revision' THEN 1 ELSE 0 END) as in_review_count,
  SUM(CASE WHEN status = 'rechazada' THEN 1 ELSE 0 END) as rejected_count,
  MAX(created_at) as last_requisition
FROM requisitions
GROUP BY license_id;

-- 3. VISTA: Resumen de órdenes de compra
CREATE OR REPLACE VIEW v_purchase_orders_summary AS
SELECT 
  license_id,
  COUNT(*) as total_orders,
  SUM(CASE WHEN status = 'pendiente' THEN 1 ELSE 0 END) as pending_count,
  SUM(CASE WHEN status = 'en_transito' THEN 1 ELSE 0 END) as in_transit_count,
  SUM(CASE WHEN status = 'completada' THEN 1 ELSE 0 END) as completed_count,
  SUM(total_amount) as total_amount,
  SUM(CASE WHEN status IN ('pendiente', 'en_transito') THEN total_amount ELSE 0 END) as pending_amount,
  MAX(created_at) as last_order
FROM purchase_orders
GROUP BY license_id;

-- 4. VISTA: Actividad reciente
CREATE OR REPLACE VIEW v_recent_activity AS
SELECT 
  'movement' as activity_type,
  license_id,
  inventory_item_id as reference_id,
  COALESCE(reference_number, id::text) as reference_number,
  movement_type as description,
  created_by,
  created_at
FROM inventory_movements
WHERE created_at > NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
  'requisition',
  license_id,
  id,
  COALESCE(requisition_number, id::text),
  'Requisición: ' || COALESCE(status, 'sin estado'),
  user_id,
  created_at
FROM requisitions
WHERE created_at > NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
  'purchase_order',
  license_id,
  id,
  COALESCE(order_number, id::text),
  'Orden: ' || COALESCE(status, 'sin estado'),
  NULL,
  created_at
FROM purchase_orders
WHERE created_at > NOW() - INTERVAL '30 days'

ORDER BY created_at DESC
LIMIT 100;

-- 5. VISTA: Estadísticas de inventario
CREATE OR REPLACE VIEW v_inventory_statistics AS
SELECT 
  license_id,
  COUNT(DISTINCT item_id) as total_items,
  SUM(CASE WHEN is_low_stock THEN 1 ELSE 0 END) as low_stock_items,
  ROUND(SUM(current_stock * unit_cost)::numeric, 2) as total_value,
  ROUND(AVG(current_stock)::numeric, 2) as avg_stock,
  MIN(current_stock) as min_stock,
  MAX(current_stock) as max_stock
FROM v_inventory_current_stock
GROUP BY license_id;

-- ============================================================
-- CONFIRMACIÓN
-- ============================================================
SELECT 
  'VISTAS CREADAS' as estado,
  'v_inventory_current_stock' as vista1,
  'v_requisitions_summary' as vista2,
  'v_purchase_orders_summary' as vista3,
  'v_recent_activity' as vista4,
  'v_inventory_statistics' as vista5,
  NOW() as timestamp;
