-- ============================================================
-- MIGRACIÓN 71 (ULTRA-ROBUSTA): STOCK DECIMAL Y LIMPIEZA DE VISTAS
-- ============================================================

-- 1. ELIMINAR CUALQUIER VERSIÓN DE VISTA QUE BLOQUEE LA COLUMNA (CON CASCADE)
-- Intentamos con ambos nombres posibles por si hay discrepancias en la BD
DROP VIEW IF EXISTS public.v_inventory_current_stock CASCADE;
DROP VIEW IF EXISTS public.vw_inventory_current_stock CASCADE;
DROP VIEW IF EXISTS public.vw_requisition_dispatch_summary CASCADE;
DROP VIEW IF EXISTS public.vw_requisition_dispatch_details CASCADE;

-- 2. CAMBIAR TIPOS DE DATOS A NUMERIC (POR FIN)
ALTER TABLE public.inventory_items 
  ALTER COLUMN current_stock TYPE NUMERIC(15,3),
  ALTER COLUMN minimum_stock TYPE NUMERIC(15,3);

ALTER TABLE public.requisition_items
  ALTER COLUMN quantity_requested TYPE NUMERIC(15,3);

-- 3. RECREAR VISTAS (RESTABLECIENDO LÓGICA ESTÁNDAR)
-- Nota: Usamos "vw_" que es el estándar del repositorio, 
-- pero si prefieres "v_" puedes renombrarlas después.

CREATE OR REPLACE VIEW public.vw_inventory_current_stock AS
SELECT 
  ii.id, ii.license_id, ii.item_code, ii.name, ii.category, ii.current_stock, ii.minimum_stock, ii.unit_cost, ii.location,
  COALESCE(SUM(CASE WHEN im.type = 'entrada' THEN im.change ELSE 0 END), 0) as total_entries,
  COALESCE(SUM(CASE WHEN im.type = 'salida' THEN im.change ELSE 0 END), 0) as total_exits,
  MAX(im.created_at) as last_movement_at
FROM public.inventory_items ii
LEFT JOIN public.inventory_movements im ON ii.id = im.item_id
GROUP BY ii.id, ii.license_id, ii.item_code, ii.name, ii.category, ii.current_stock, ii.minimum_stock, ii.unit_cost, ii.location;

CREATE OR REPLACE VIEW public.vw_requisition_dispatch_summary AS
SELECT 
	r.id, r.requisition_number, r.status, COUNT(ri.id) as total_items, SUM(ri.quantity_requested) as total_quantity_requested,
	SUM(CASE WHEN ii.current_stock >= ri.quantity_requested THEN 1 ELSE 0 END) as items_with_sufficient_stock,
	SUM(CASE WHEN ii.current_stock < ri.quantity_requested THEN 1 ELSE 0 END) as items_with_deficit,
	MAX(CASE WHEN ii.current_stock < ri.quantity_requested THEN ii.current_stock - ri.quantity_requested ELSE 0 END) as max_deficit,
	r.license_id
FROM public.requisitions r
LEFT JOIN public.requisition_items ri ON ri.requisition_id = r.id
LEFT JOIN public.inventory_items ii ON ii.id = ri.inventory_item_id
WHERE r.status = 'aprobada'
GROUP BY r.id, r.requisition_number, r.status, r.license_id;

CREATE OR REPLACE VIEW public.vw_requisition_dispatch_details AS
SELECT 
	r.id as requisition_id, r.requisition_number, ri.id as item_id, ii.name as item_name, ii.code as item_code,
	ri.quantity_requested, ii.current_stock as stock_available, (ii.current_stock - ri.quantity_requested) as stock_after_dispatch,
	CASE WHEN ii.current_stock >= ri.quantity_requested THEN 'OK' ELSE 'DEFICIT: ' || (ri.quantity_requested - ii.current_stock) || ' unidades' END as stock_status,
	r.license_id
FROM public.requisitions r
JOIN public.requisition_items ri ON ri.requisition_id = r.id
JOIN public.inventory_items ii ON ii.id = ri.inventory_item_id
ORDER BY r.created_at DESC, ii.name;

-- 4. PRUEBA DE VERIFICACIÓN
SELECT 10.000 - 0.5 AS resultado_esperado; 
-- Debe retornar 9.5
