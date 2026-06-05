-- ============================================================
-- LÓGICA DE NEGOCIO: SALIDAS DE INVENTARIO POR REQUISICIONES
-- ============================================================
-- Cuando se aprueba una requisición, se registran salidas automáticas en inventory_movements
-- y se reduce el stock en inventory_items.

-- 0) VALIDACIÓN: Asegurar que todas las columnas necesarias existen en inventory_movements
DO $$
BEGIN
  -- Agregar columnas faltantes si no existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='related_type'
  ) THEN
    ALTER TABLE public.inventory_movements ADD COLUMN related_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='related_id'
  ) THEN
    ALTER TABLE public.inventory_movements ADD COLUMN related_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.inventory_movements ADD COLUMN user_id uuid;
  END IF;
END $$;

-- 1) TABLA: requisition_items (si no existe, para ligar items a requisiciones)
-- Esta tabla vincula items solicitados en cada requisición con cantidades
CREATE TABLE IF NOT EXISTS public.requisition_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  requisition_id uuid NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_requested integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requisition_items_requisition 
  ON public.requisition_items (requisition_id);

-- 2) FUNCIÓN: reducir inventario cuando se aprueba requisición
CREATE OR REPLACE FUNCTION public.process_requisition_approval(
  p_requisition_id uuid,
  p_license_id uuid,
  p_user_id uuid
) RETURNS void AS $$
DECLARE
  v_item_record RECORD;
  v_current_stock integer;
  v_new_stock integer;
BEGIN
  -- Recorrer todos los items solicitados en la requisición
  FOR v_item_record IN
    SELECT ri.inventory_item_id, ri.quantity_requested
    FROM public.requisition_items ri
    WHERE ri.requisition_id = p_requisition_id
  LOOP
    -- Obtener stock actual del item
    SELECT current_stock INTO v_current_stock
    FROM public.inventory_items
    WHERE id = v_item_record.inventory_item_id;

    -- Validar que hay stock suficiente (si aplica)
    IF v_current_stock IS NULL THEN
      RAISE NOTICE 'Item % no encontrado', v_item_record.inventory_item_id;
      CONTINUE;
    END IF;

    -- Calcular nuevo stock (restar cantidad solicitada)
    v_new_stock := GREATEST(0, v_current_stock - v_item_record.quantity_requested);

    -- Actualizar stock en inventory_items
    UPDATE public.inventory_items
    SET current_stock = v_new_stock, updated_at = now()
    WHERE id = v_item_record.inventory_item_id;

    -- Registrar movimiento de SALIDA en inventory_movements
    INSERT INTO public.inventory_movements (
      license_id,
      item_id,
      item_code,
      change,
      type,
      related_type,
      related_id,
      user_id,
      notes,
      created_at
    ) VALUES (
      p_license_id,
      v_item_record.inventory_item_id,
      '',
      v_item_record.quantity_requested,
      'salida',
      'requisition',
      p_requisition_id,
      p_user_id,
      'Salida por requisición aprobada',
      now()
    );

  END LOOP;

END;
$$ LANGUAGE plpgsql;

-- 3) FUNCIÓN: revertir salidas si se RECHAZA una requisición que ya fue aprobada
CREATE OR REPLACE FUNCTION public.revert_requisition_rejection(
  p_requisition_id uuid,
  p_license_id uuid,
  p_user_id uuid
) RETURNS void AS $$
DECLARE
  v_item_record RECORD;
  v_current_stock integer;
  v_new_stock integer;
BEGIN
  -- Recorrer movimientos de SALIDA asociados a esta requisición
  FOR v_item_record IN
    SELECT im.item_id, im.change
    FROM public.inventory_movements im
    WHERE im.related_id = p_requisition_id
      AND im.related_type = 'requisition'
      AND im.type = 'salida'
  LOOP
    -- Obtener stock actual
    SELECT current_stock INTO v_current_stock
    FROM public.inventory_items
    WHERE id = v_item_record.item_id;

    -- Sumar de vuelta la cantidad (revertir salida)
    v_new_stock := v_current_stock + v_item_record.change;

    -- Actualizar stock
    UPDATE public.inventory_items
    SET current_stock = v_new_stock, updated_at = now()
    WHERE id = v_item_record.item_id;

    -- Registrar movimiento de ENTRADA de reversa
    INSERT INTO public.inventory_movements (
      license_id,
      item_id,
      change,
      type,
      related_type,
      related_id,
      user_id,
      notes,
      created_at
    ) VALUES (
      p_license_id,
      v_item_record.item_id,
      v_item_record.change,
      'entrada',
      'requisition_reversal',
      p_requisition_id,
      p_user_id,
      'Reversión de requisición rechazada',
      now()
    );

  END LOOP;

END;
$$ LANGUAGE plpgsql;

-- 4) VISTA: Inventario Actual con Historial de Movimientos
DROP VIEW IF EXISTS public.vw_inventory_current_stock CASCADE;
CREATE VIEW public.vw_inventory_current_stock AS
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
  -- Calcular entradas totales
  COALESCE(SUM(CASE WHEN im.type = 'entrada' THEN im.change ELSE 0 END), 0) as total_entries,
  -- Calcular salidas totales
  COALESCE(SUM(CASE WHEN im.type = 'salida' THEN im.change ELSE 0 END), 0) as total_exits,
  -- Última actualización
  MAX(im.created_at) as last_movement_at
FROM public.inventory_items ii
LEFT JOIN public.inventory_movements im ON ii.id = im.item_id
GROUP BY ii.id, ii.license_id, ii.item_code, ii.name, ii.category, ii.current_stock, ii.minimum_stock, ii.unit_cost, ii.location;

-- 5) VISTA: Movimientos de Inventario con Detalles
DROP VIEW IF EXISTS public.vw_inventory_movements_detail CASCADE;
CREATE VIEW public.vw_inventory_movements_detail AS
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
  -- Información de referencia
  CASE 
    WHEN im.related_type = 'requisition' THEN 'Requisición'
    WHEN im.related_type = 'purchase_order' THEN 'Orden de Compra'
    WHEN im.related_type = 'requisition_reversal' THEN 'Reversión de Requisición'
    ELSE COALESCE(im.related_type, 'Otro')
  END as related_type_label
FROM public.inventory_movements im
ORDER BY im.created_at DESC;

-- 6) TRIGGER: Prevenir aprobación de requisición sin items
CREATE OR REPLACE FUNCTION public.check_requisition_has_items()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'aprobada' AND OLD.status != 'aprobada' THEN
    IF NOT EXISTS (SELECT 1 FROM public.requisition_items WHERE requisition_id = NEW.id) THEN
      RAISE EXCEPTION 'No se puede aprobar una requisición sin items';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_requisition_items ON public.requisitions;
CREATE TRIGGER trg_check_requisition_items
  BEFORE UPDATE ON public.requisitions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_requisition_has_items();

-- ============================================================
-- PRUEBAS
-- ============================================================
-- Para probar la lógica:
/*
-- 1. Verificar que las funciones existen
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'process_%' OR routine_name LIKE 'revert_%';

-- 2. Ver vista de inventario actual
SELECT * FROM public.vw_inventory_current_stock LIMIT 10;

-- 3. Ver historial de movimientos
SELECT * FROM public.vw_inventory_movements_detail LIMIT 20;

-- 4. Probar proceso manual (después integrar en TypeScript):
-- SELECT public.process_requisition_approval(
--   '<REQUISITION_UUID>',
--   '<LICENSE_UUID>',
--   '<USER_UUID>'
-- );
*/
