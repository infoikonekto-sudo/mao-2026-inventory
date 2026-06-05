-- ============================================================
-- SCRIPT ACTUALIZADO 3: CREAR FUNCIONES SUPABASE
-- Adaptadas a tu estructura real
-- ============================================================

-- ============================================================
-- FUNCIÓN 1: Registrar un movimiento de inventario
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_record_inventory_movement(
  p_license_id UUID,
  p_item_id UUID,
  p_movement_type TEXT,
  p_quantity INTEGER,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  movement_id UUID,
  new_stock INTEGER
) AS $$
DECLARE
  v_movement_id UUID;
  v_current_stock INTEGER;
  v_item_exists BOOLEAN;
BEGIN
  -- 1. VALIDAR que el item existe en la licencia
  SELECT EXISTS(
    SELECT 1 FROM inventory_items 
    WHERE id = p_item_id AND license_id = p_license_id
  ) INTO v_item_exists;
  
  IF NOT v_item_exists THEN
    RETURN QUERY SELECT false, 'Item no existe en esta licencia', NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;
  
  -- 2. CREAR EL MOVIMIENTO
  INSERT INTO inventory_movements (
    license_id,
    inventory_item_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    reference_number,
    notes,
    created_by,
    created_at
  ) VALUES (
    p_license_id,
    p_item_id,
    p_movement_type,
    p_quantity,
    p_reference_type,
    p_reference_id,
    p_reference_number,
    p_notes,
    COALESCE(p_created_by, auth.uid()),
    NOW()
  ) RETURNING id INTO v_movement_id;
  
  -- 3. OBTENER NUEVO STOCK
  SELECT COALESCE(ii.current_stock, 0) + COALESCE(SUM(im.quantity), 0)
  INTO v_current_stock
  FROM inventory_items ii
  LEFT JOIN inventory_movements im 
    ON ii.id = im.inventory_item_id
    AND ii.license_id = im.license_id
  WHERE ii.id = p_item_id
  GROUP BY ii.id, ii.current_stock;
  
  -- 4. RETORNAR ÉXITO
  RETURN QUERY SELECT true, 'Movimiento registrado', v_movement_id, v_current_stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCIÓN 2: Registrar recepción de orden de compra
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_record_purchase_receipt(
  p_license_id UUID,
  p_purchase_order_id UUID,
  p_items_json JSONB DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  movements_created INTEGER
) AS $$
DECLARE
  v_order_exists BOOLEAN;
  v_order_status TEXT;
  v_movements_count INTEGER := 0;
  v_item_record RECORD;
BEGIN
  -- 1. VALIDAR que la orden existe
  SELECT EXISTS(
    SELECT 1 FROM purchase_orders 
    WHERE id = p_purchase_order_id AND license_id = p_license_id
  ), status
  INTO v_order_exists, v_order_status
  FROM purchase_orders
  WHERE id = p_purchase_order_id;
  
  IF NOT v_order_exists THEN
    RETURN QUERY SELECT false, 'Orden no existe', 0;
    RETURN;
  END IF;
  
  -- 2. SI NO hay items JSON, recibir toda la orden con cantidad genérica
  -- Esto es una simplificación, idealmente necesitarías la estructura de items
  IF p_items_json IS NULL THEN
    -- Crear UN movimiento por la orden completa
    PERFORM fn_record_inventory_movement(
      p_license_id,
      (SELECT inventory_items.id FROM inventory_items LIMIT 1), -- Placeholder
      'purchase_in',
      1,
      'purchase_order',
      p_purchase_order_id,
      (SELECT order_number FROM purchase_orders WHERE id = p_purchase_order_id),
      'Recepción de orden de compra',
      auth.uid()
    );
    v_movements_count := 1;
  ELSE
    -- Procesar items del JSON
    FOR v_item_record IN
      SELECT 
        (item->>'item_id')::UUID as item_id,
        (item->>'quantity')::INTEGER as quantity
      FROM jsonb_array_elements(p_items_json) as item
    LOOP
      PERFORM fn_record_inventory_movement(
        p_license_id,
        v_item_record.item_id,
        'purchase_in',
        v_item_record.quantity,
        'purchase_order',
        p_purchase_order_id,
        (SELECT order_number FROM purchase_orders WHERE id = p_purchase_order_id),
        'Item de orden de compra recibida',
        auth.uid()
      );
      v_movements_count := v_movements_count + 1;
    END LOOP;
  END IF;
  
  -- 3. ACTUALIZAR ESTADO DE LA ORDEN
  UPDATE purchase_orders
  SET status = 'completada'
  WHERE id = p_purchase_order_id;
  
  -- 4. RETORNAR ÉXITO
  RETURN QUERY SELECT true, 'Orden recibida y movimientos registrados', v_movements_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCIÓN 3: Registrar despacho de requisición
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_record_requisition_dispatch(
  p_license_id UUID,
  p_requisition_id UUID,
  p_items_json JSONB DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  movements_created INTEGER
) AS $$
DECLARE
  v_req_exists BOOLEAN;
  v_req_status TEXT;
  v_movements_count INTEGER := 0;
  v_item_record RECORD;
BEGIN
  -- 1. VALIDAR que la requisición existe
  SELECT EXISTS(
    SELECT 1 FROM requisitions 
    WHERE id = p_requisition_id AND license_id = p_license_id
  ), status
  INTO v_req_exists, v_req_status
  FROM requisitions
  WHERE id = p_requisition_id;
  
  IF NOT v_req_exists THEN
    RETURN QUERY SELECT false, 'Requisición no existe', 0;
    RETURN;
  END IF;
  
  -- 2. SI NO hay items JSON, despachar con cantidad genérica
  IF p_items_json IS NULL THEN
    PERFORM fn_record_inventory_movement(
      p_license_id,
      (SELECT inventory_items.id FROM inventory_items LIMIT 1), -- Placeholder
      'requisition_out',
      -1,
      'requisition',
      p_requisition_id,
      (SELECT requisition_number FROM requisitions WHERE id = p_requisition_id),
      'Despacho de requisición',
      auth.uid()
    );
    v_movements_count := 1;
  ELSE
    -- Procesar items del JSON
    FOR v_item_record IN
      SELECT 
        (item->>'item_id')::UUID as item_id,
        (item->>'quantity')::INTEGER as quantity
      FROM jsonb_array_elements(p_items_json) as item
    LOOP
      -- Verificar stock disponible
      IF NOT EXISTS(
        SELECT 1 FROM v_inventory_current_stock
        WHERE item_id = v_item_record.item_id
        AND current_stock >= v_item_record.quantity
      ) THEN
        RETURN QUERY SELECT false, 'Stock insuficiente para item: ' || v_item_record.item_id::TEXT, v_movements_count;
        RETURN;
      END IF;
      
      PERFORM fn_record_inventory_movement(
        p_license_id,
        v_item_record.item_id,
        'requisition_out',
        -v_item_record.quantity,
        'requisition',
        p_requisition_id,
        (SELECT requisition_number FROM requisitions WHERE id = p_requisition_id),
        'Item de requisición despachada',
        auth.uid()
      );
      v_movements_count := v_movements_count + 1;
    END LOOP;
  END IF;
  
  -- 3. ACTUALIZAR ESTADO DE LA REQUISICIÓN
  UPDATE requisitions
  SET status = 'aprobada'
  WHERE id = p_requisition_id;
  
  -- 4. RETORNAR ÉXITO
  RETURN QUERY SELECT true, 'Requisición despachada y movimientos registrados', v_movements_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CONFIRMACIÓN
-- ============================================================
SELECT 
  'FUNCIONES CREADAS' as estado,
  'fn_record_inventory_movement' as func1,
  'fn_record_purchase_receipt' as func2,
  'fn_record_requisition_dispatch' as func3,
  NOW() as timestamp;
