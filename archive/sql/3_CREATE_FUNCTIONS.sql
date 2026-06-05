-- ============================================================
-- SCRIPT 3: CREAR FUNCIONES PARA MOVIMIENTOS
-- Ejecuta esto después de SCRIPT 2
-- ============================================================

-- Función principal para registrar movimientos de inventario
CREATE OR REPLACE FUNCTION fn_record_inventory_movement(
  p_item_id UUID,
  p_movement_type TEXT,
  p_quantity DECIMAL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS inventory_movements AS $$
DECLARE
  v_movement inventory_movements;
  v_item RECORD;
  v_new_stock DECIMAL;
BEGIN
  -- Validar que el item existe
  SELECT * INTO v_item FROM inventory_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item no encontrado: %', p_item_id;
  END IF;
  
  -- Validar que el tipo de movimiento es válido
  IF p_movement_type NOT IN ('purchase_in', 'requisition_out', 'return', 'adjustment', 'transfer') THEN
    RAISE EXCEPTION 'Tipo de movimiento inválido: %', p_movement_type;
  END IF;
  
  -- Validar que la cantidad no sea cero
  IF p_quantity = 0 THEN
    RAISE EXCEPTION 'La cantidad no puede ser cero';
  END IF;
  
  -- Crear movimiento
  INSERT INTO inventory_movements (
    inventory_item_id, 
    movement_type, 
    quantity, 
    unit_cost,
    reference_type, 
    reference_id, 
    notes, 
    created_by
  )
  VALUES (
    p_item_id, 
    p_movement_type, 
    p_quantity,
    v_item.unit_cost,
    p_reference_type, 
    p_reference_id, 
    p_notes, 
    auth.uid()
  )
  RETURNING * INTO v_movement;
  
  -- Calcular y actualizar current_stock
  SELECT COALESCE(SUM(quantity), 0) INTO v_new_stock
  FROM inventory_movements 
  WHERE inventory_item_id = p_item_id;
  
  UPDATE inventory_items
  SET current_stock = v_new_stock
  WHERE id = p_item_id;
  
  RETURN v_movement;
END;
$$ LANGUAGE plpgsql;

-- Función para registrar entrada por compra
CREATE OR REPLACE FUNCTION fn_record_purchase_receipt(
  p_purchase_order_id UUID,
  p_items JSONB  -- Array de {inventory_item_id, quantity}
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_item RECORD;
  v_item_id UUID;
  v_quantity DECIMAL;
  v_cost RECORD;
BEGIN
  -- Iterar sobre los items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_item.value ->> 'inventory_item_id')::UUID;
    v_quantity := (v_item.value ->> 'quantity')::DECIMAL;
    
    -- Registrar movimiento
    PERFORM fn_record_inventory_movement(
      p_item_id := v_item_id,
      p_movement_type := 'purchase_in',
      p_quantity := v_quantity,
      p_reference_type := 'purchase_order',
      p_reference_id := p_purchase_order_id,
      p_notes := 'Recepción de orden de compra'
    );
  END LOOP;
  
  -- Actualizar estado de la orden
  UPDATE purchase_orders
  SET status = 'completed'
  WHERE id = p_purchase_order_id;
  
  RETURN QUERY SELECT true, 'Recepción registrada correctamente'::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Función para registrar salida por requisición
CREATE OR REPLACE FUNCTION fn_record_requisition_dispatch(
  p_requisition_id UUID,
  p_items JSONB  -- Array de {inventory_item_id, quantity}
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_item RECORD;
  v_item_id UUID;
  v_quantity DECIMAL;
  v_current_stock DECIMAL;
BEGIN
  -- Iterar sobre los items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_id := (v_item.value ->> 'inventory_item_id')::UUID;
    v_quantity := (v_item.value ->> 'quantity')::DECIMAL;
    
    -- Verificar si hay suficiente stock
    SELECT current_stock INTO v_current_stock
    FROM inventory_items
    WHERE id = v_item_id;
    
    IF v_current_stock < v_quantity THEN
      RETURN QUERY SELECT false, 'Stock insuficiente para ' || v_item_id::TEXT;
      RETURN;
    END IF;
    
    -- Registrar movimiento (negativo para salida)
    PERFORM fn_record_inventory_movement(
      p_item_id := v_item_id,
      p_movement_type := 'requisition_out',
      p_quantity := -v_quantity,  -- NEGATIVO
      p_reference_type := 'requisition',
      p_reference_id := p_requisition_id,
      p_notes := 'Despacho de requisición'
    );
  END LOOP;
  
  -- Actualizar estado de la requisición
  UPDATE requisitions
  SET status = 'completed'
  WHERE id = p_requisition_id;
  
  RETURN QUERY SELECT true, 'Despacho registrado correctamente'::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Confirmación
SELECT 'Función fn_record_inventory_movement creada' as resultado
UNION ALL
SELECT 'Función fn_record_purchase_receipt creada'
UNION ALL
SELECT 'Función fn_record_requisition_dispatch creada';
