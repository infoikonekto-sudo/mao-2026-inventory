-- ============================================================
-- FIX: PERMISOS EN FUNCIONES DE INVENTARIO
-- ============================================================
-- Problema: "new row violates row-level security policy for table inventory_movements"
-- Causa: La función se ejecuta con los permisos del usuario (SECURITY INVOKER) y el usuario
--        no tiene permiso explícito de INSERT en la política RLS de inventory_movements.
-- Solución: Cambiar a SECURITY DEFINER para que la función se ejecute con permisos elevados.

-- 1. Actualizar process_requisition_approval
CREATE OR REPLACE FUNCTION public.process_requisition_approval(
  p_requisition_id uuid,
  p_license_id uuid,
  p_user_id uuid
) RETURNS void 
SECURITY DEFINER -- Ejecuta con permisos del creador de la función (admin/postgres)
SET search_path = public -- Buena práctica de seguridad
AS $$
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
      '', -- item_code (opcional/empty si no se tiene a mano)
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

-- 2. Actualizar revert_requisition_rejection
CREATE OR REPLACE FUNCTION public.revert_requisition_rejection(
  p_requisition_id uuid,
  p_license_id uuid,
  p_user_id uuid
) RETURNS void 
SECURITY DEFINER -- Ejecuta con permisos elevados
SET search_path = public
AS $$
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
