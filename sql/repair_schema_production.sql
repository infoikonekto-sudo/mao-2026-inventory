-- SCRIPT DE REPARACIÓN CONSOLIDADO - MAO 2026 v1.3
-- Ejecuta este script en el Dashboard de Supabase -> SQL Editor para corregir errores de esquema y tipos.

-- 1. ELIMINAR VISTAS DEPENDIENTES (CASCADE es fundamental para limpiar dependencias ocultas)
-- Esto eliminará cualquier vista o regla que bloquee el ALTER TABLE
DROP VIEW IF EXISTS public.vw_requisition_dispatch_details CASCADE;
DROP VIEW IF EXISTS public.vw_requisition_dispatch_summary CASCADE;
DROP VIEW IF EXISTS public.vw_inventory_current_stock CASCADE;
DROP VIEW IF EXISTS public.vw_inventory_movements_detail CASCADE;
DROP VIEW IF EXISTS public.v_requisitions_summary CASCADE;
DROP VIEW IF EXISTS public.v_purchase_orders_summary CASCADE;

-- 2. ASEGURAR COLUMNA is_active EN inventory_items (Soft Delete)
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. CAMBIAR TIPOS A NUMERIC (Soporte Decimal)
-- Ahora que las vistas están eliminadas, PostgreSQL permitirá el cambio de tipo
ALTER TABLE public.inventory_items ALTER COLUMN current_stock TYPE NUMERIC(15,3);
ALTER TABLE public.inventory_items ALTER COLUMN minimum_stock TYPE NUMERIC(15,3);
ALTER TABLE public.requisition_items ALTER COLUMN quantity_requested TYPE NUMERIC(15,3);
ALTER TABLE public.inventory_movements ALTER COLUMN change TYPE NUMERIC(15,3);

-- 4. UNIFICACIÓN DE NOMBRES DE COLUMNAS (inventory_movements)
DO $$ 
BEGIN 
    -- Caso: Renombrar movement_type a type
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'movement_type') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'type') THEN
            ALTER TABLE inventory_movements RENAME COLUMN movement_type TO type;
        ELSE
            -- Si ambas existen, podemos eliminar la vieja si la nueva ya tiene datos (o simplemente dejarla)
            -- Por seguridad, no borraremos, solo ignoraremos el rename ya que 'type' ya existe.
            RAISE NOTICE 'La columna type ya existe, ignorando rename de movement_type';
        END IF;
    END IF;

    -- Caso: Renombrar quantity a change
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'quantity') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'change') THEN
            ALTER TABLE inventory_movements RENAME COLUMN quantity TO change;
        ELSE
            RAISE NOTICE 'La columna change ya existe, ignorando rename de quantity';
        END IF;
    END IF;
END $$;

-- 5. RECREAR VISTA: Inventario Actual
CREATE OR REPLACE VIEW public.vw_inventory_current_stock AS
SELECT 
  ii.id,
  ii.license_id,
  ii.item_code,
  ii.name,
  ii.category,
  ii.current_stock,
  ii.minimum_stock,
  ii.unit_cost,
  ii.location,
  COALESCE(SUM(CASE WHEN im.type = 'entrada' THEN im.change ELSE 0 END), 0) as total_entries,
  COALESCE(SUM(CASE WHEN im.type = 'salida' THEN im.change ELSE 0 END), 0) as total_exits,
  MAX(im.created_at) as last_movement_at
FROM public.inventory_items ii
LEFT JOIN public.inventory_movements im ON ii.id = im.item_id
GROUP BY ii.id, ii.license_id, ii.item_code, ii.name, ii.category, ii.current_stock, ii.minimum_stock, ii.unit_cost, ii.location;

-- 6. RECREAR VISTA: Detalle de Movimientos
CREATE OR REPLACE VIEW public.vw_inventory_movements_detail AS
SELECT 
  im.id,
  im.license_id,
  im.item_id,
  im.change,
  im.type,
  im.related_type,
  im.related_id,
  im.user_id,
  im.notes,
  im.created_at,
  CASE 
    WHEN im.related_type = 'requisition' THEN 'Requisición'
    WHEN im.related_type = 'purchase_order' THEN 'Orden de Compra'
    WHEN im.related_type = 'requisition_reversal' THEN 'Reversión de Requisición'
    ELSE COALESCE(im.related_type, 'Otro')
  END as related_type_label
FROM public.inventory_movements im;

-- 7. RECREAR VISTA: Resumen de Despacho
CREATE OR REPLACE VIEW public.vw_requisition_dispatch_summary AS
SELECT 
	r.id,
	r.requisition_number,
	r.status,
	COUNT(ri.id) as total_items,
	SUM(ri.quantity_requested) as total_quantity_requested,
	SUM(CASE WHEN ii.current_stock >= ri.quantity_requested THEN 1 ELSE 0 END) as items_with_sufficient_stock,
	SUM(CASE WHEN ii.current_stock < ri.quantity_requested THEN 1 ELSE 0 END) as items_with_deficit,
	MAX(CASE WHEN ii.current_stock < ri.quantity_requested THEN ii.current_stock - ri.quantity_requested ELSE 0 END) as max_deficit,
	r.license_id
FROM public.requisitions r
LEFT JOIN public.requisition_items ri ON ri.requisition_id = r.id
LEFT JOIN public.inventory_items ii ON ii.id = ri.inventory_item_id
WHERE r.status = 'aprobada'
GROUP BY r.id, r.requisition_number, r.status, r.license_id;

-- 8. RECREAR VISTA: Detalles de Despacho
CREATE OR REPLACE VIEW public.vw_requisition_dispatch_details AS
SELECT 
	r.id as requisition_id,
	r.requisition_number,
	ri.id as item_id,
	ii.name as item_name,
	ii.code as item_code,
	ri.quantity_requested,
	ii.current_stock as stock_available,
	(ii.current_stock - ri.quantity_requested) as stock_after_dispatch,
	CASE 
		WHEN ii.current_stock >= ri.quantity_requested THEN 'OK'
		ELSE 'DEFICIT: ' || (ri.quantity_requested - ii.current_stock) || ' unidades'
	END as stock_status,
	r.license_id
FROM public.requisitions r
JOIN public.requisition_items ri ON ri.requisition_id = r.id
JOIN public.inventory_items ii ON ii.id = ri.inventory_item_id
ORDER BY r.created_at DESC, ii.name;

-- 9. NOTIFICAR RESULTADO
COMMENT ON TABLE inventory_items IS 'Tabla sincronizada v1.3 - Desbloqueo de Vistas Exitoso';
