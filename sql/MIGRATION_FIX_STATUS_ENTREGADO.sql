-- ============================================================
-- MIGRACIÓN: CORREGIR ESTADO 'DESPACHADA' A 'ENTREGADO'
-- ============================================================

-- ORDEN CORREGIDO:
-- 1. Eliminar el constraint antiguo (para liberar el bloqueo de nombres)
-- 2. Actualizar los datos
-- 3. Crear el nuevo constraint

-- 1) Eliminar constraint antiguo que bloquea 'entregado'
ALTER TABLE public.requisitions DROP CONSTRAINT IF EXISTS requisitions_status_check;

-- 2) Ahora sí podemos actualizar los registros sin error
UPDATE public.requisitions 
SET status = 'entregado' 
WHERE status = 'despachada';

-- 3) Crear el nuevo constraint oficial con 'entregado'
ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_status_check 
  CHECK (status IN ('pendiente', 'en_revision', 'aprobada', 'rechazada', 'entregado'));

-- 4) Actualizar la función de despacho (dispatch_requisition) con el nuevo término
CREATE OR REPLACE FUNCTION public.dispatch_requisition(
	p_requisition_id uuid,
	p_license_id uuid,
	p_user_id uuid
)
RETURNS TABLE (
	success boolean,
	message text,
	items_dispatched json,
	new_balances json
) AS $$
DECLARE
	v_req_status text;
	v_item_record RECORD;
	v_current_stock NUMERIC(15,3);
	v_deficit NUMERIC(15,3);
	v_deficit_details jsonb := '[]'::jsonb;
	v_items_dispatched jsonb := '[]'::jsonb;
	v_new_balances jsonb := '[]'::jsonb;
	v_has_deficit boolean := FALSE;
	v_has_movement_type boolean := FALSE;
	v_type_col text := 'type';
	v_note_col text := NULL;
	v_note_text text;
	v_change_col text := 'change';
BEGIN
	-- Detectar nombres de columnas en inventory_movements para compatibilidad
	SELECT EXISTS(
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='movement_type'
	) INTO v_has_movement_type;
	IF v_has_movement_type THEN
		v_type_col := 'movement_type';
	ELSE
		v_type_col := 'type';
	END IF;

	/* Detectar nombre de columna para la cantidad/valor del movimiento */
	IF EXISTS(
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='change'
	) THEN
		v_change_col := 'change';
	ELSIF EXISTS(
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='quantity'
	) THEN
		v_change_col := 'quantity';
	ELSIF EXISTS(
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='amount'
	) THEN
		v_change_col := 'amount';
	ELSE
		v_change_col := 'change';
	END IF;

	IF EXISTS(
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='note'
	) THEN
		v_note_col := 'note';
	ELSIF EXISTS(
		SELECT 1 FROM information_schema.columns
		WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='notes'
	) THEN
		v_note_col := 'notes';
	ELSE
		v_note_col := NULL;
	END IF;
	-- PASO 1: VALIDAR IDENTIDAD
	-- Verificar que la requisición existe y está APROBADA
	SELECT status INTO v_req_status
	FROM public.requisitions
	WHERE id = p_requisition_id AND license_id = p_license_id;

	IF v_req_status IS NULL THEN
		RETURN QUERY SELECT false, 'Requisición no encontrada'::text, NULL::json, NULL::json;
		RETURN;
	END IF;

	IF v_req_status != 'aprobada' THEN
		RETURN QUERY SELECT false, 'La requisición debe estar APROBADA (estado actual: ' || v_req_status || ')'::text, NULL::json, NULL::json;
		RETURN;
	END IF;

	-- PASO 2: CRUCE DE EXISTENCIAS (PRE-VUELO)
	-- Analizar cada item y comparar contra stock disponible
	FOR v_item_record IN
		SELECT ri.id, ri.inventory_item_id, ri.quantity_requested, ii.name, ii.code, ii.current_stock
		FROM public.requisition_items ri
		JOIN public.inventory_items ii ON ii.id = ri.inventory_item_id
		WHERE ri.requisition_id = p_requisition_id
	LOOP
		-- Calcular déficit si existe
		v_deficit := v_item_record.quantity_requested - COALESCE(v_item_record.current_stock, 0);
    
		IF v_deficit > 0 THEN
			-- HAY DÉFICIT: Registrar y marcar como error
			v_has_deficit := TRUE;
			v_deficit_details := v_deficit_details || jsonb_build_object(
				'item_id', v_item_record.inventory_item_id,
				'item_name', v_item_record.name,
				'item_code', v_item_record.code,
				'quantity_requested', v_item_record.quantity_requested,
				'stock_available', COALESCE(v_item_record.current_stock, 0),
				'deficit', v_deficit
			);
		END IF;
	END LOOP;

	-- PASO 3: SI HAY DÉFICIT, INFORMAR Y NO PROCESAR
	IF v_has_deficit THEN
		RETURN QUERY SELECT 
			false, 
			'Stock insuficiente para los siguientes items:'::text, 
			v_deficit_details::json, 
			NULL::json;
		RETURN;
	END IF;

	-- PASO 4: EJECUCIÓN ATÓMICA - Procesar la salida
	FOR v_item_record IN
		SELECT ri.id, ri.inventory_item_id, ri.quantity_requested, ii.name, ii.code, ii.current_stock
		FROM public.requisition_items ri
		JOIN public.inventory_items ii ON ii.id = ri.inventory_item_id
		WHERE ri.requisition_id = p_requisition_id
	LOOP
		-- 4A: Restar la cantidad del stock_actual
		UPDATE public.inventory_items
		SET 
			current_stock = current_stock - v_item_record.quantity_requested,
			updated_at = now()
		WHERE id = v_item_record.inventory_item_id;

		-- Construir INSERT seguro según columnas existentes: manejar 'quantity' y 'change'
		DECLARE
			v_has_quantity boolean := FALSE;
			v_has_change boolean := FALSE;
			v_quantity_not_null boolean := FALSE;
			v_change_not_null boolean := FALSE;
		BEGIN
			SELECT EXISTS(
				SELECT 1 FROM information_schema.columns
				WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='quantity'
			) INTO v_has_quantity;
			SELECT EXISTS(
				SELECT 1 FROM information_schema.columns
				WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='change'
			) INTO v_has_change;
			IF v_has_quantity THEN
				SELECT (is_nullable = 'NO') INTO v_quantity_not_null
				FROM information_schema.columns
				WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='quantity' LIMIT 1;
			END IF;
			IF v_has_change THEN
				SELECT (is_nullable = 'NO') INTO v_change_not_null
				FROM information_schema.columns
				WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='change' LIMIT 1;
			END IF;

			-- Casos:
			-- 1) existen ambas columnas -> insertar ambas (evita que una quede NULL)
			-- 2) existe sólo una -> insertar la existente
			IF v_has_quantity AND v_has_change THEN
				IF v_note_col IS NOT NULL THEN
					EXECUTE format(
						'INSERT INTO public.inventory_movements (license_id,item_id,inventory_item_id,item_code,quantity,%I,related_type,related_id,user_id,%I,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
						v_type_col, v_note_col
					)
					USING p_license_id, v_item_record.inventory_item_id, v_item_record.inventory_item_id, v_item_record.code, v_item_record.quantity_requested, 'salida', 'requisition', p_requisition_id, p_user_id, v_note_text, now();
				ELSE
					EXECUTE format(
						'INSERT INTO public.inventory_movements (license_id,item_id,inventory_item_id,item_code,quantity,%I,related_type,related_id,user_id,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
						v_type_col
					)
					USING p_license_id, v_item_record.inventory_item_id, v_item_record.inventory_item_id, v_item_record.code, v_item_record.quantity_requested, 'salida', 'requisition', p_requisition_id, p_user_id, now();
				END IF;
			ELSIF v_has_change THEN
				-- Insertar usando 'change' columna
				IF v_note_col IS NOT NULL THEN
					EXECUTE format(
						'INSERT INTO public.inventory_movements (license_id,item_id,inventory_item_id,item_code,%I,%I,related_type,related_id,user_id,%I,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
						v_change_col, v_type_col, v_note_col
					)
					USING p_license_id, v_item_record.inventory_item_id, v_item_record.inventory_item_id, v_item_record.code, v_item_record.quantity_requested, 'salida', 'requisition', p_requisition_id, p_user_id, v_note_text, now();
				ELSE
					EXECUTE format(
						'INSERT INTO public.inventory_movements (license_id,item_id,inventory_item_id,item_code,%I,%I,related_type,related_id,user_id,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
						v_change_col, v_type_col
					)
					USING p_license_id, v_item_record.inventory_item_id, v_item_record.inventory_item_id, v_item_record.code, v_item_record.quantity_requested, 'salida', 'requisition', p_requisition_id, p_user_id, now();
				END IF;
			ELSIF v_has_quantity THEN
				-- Sólo quantity existe
				IF v_note_col IS NOT NULL THEN
					EXECUTE format(
						'INSERT INTO public.inventory_movements (license_id,item_id,inventory_item_id,item_code,quantity,%I,related_type,related_id,user_id,%I,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
						v_type_col, v_note_col
					)
					USING p_license_id, v_item_record.inventory_item_id, v_item_record.inventory_item_id, v_item_record.code, v_item_record.quantity_requested, 'salida', 'requisition', p_requisition_id, p_user_id, v_note_text, now();
				ELSE
					EXECUTE format(
						'INSERT INTO public.inventory_movements (license_id,item_id,inventory_item_id,item_code,quantity,%I,related_type,related_id,user_id,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
						v_type_col
					)
					USING p_license_id, v_item_record.inventory_item_id, v_item_record.inventory_item_id, v_item_record.code, v_item_record.quantity_requested, 'salida', 'requisition', p_requisition_id, p_user_id, now();
				END IF;
			ELSE
				-- Ninguna columna encontrada: insertar en columnas básicas y created_at (posible esquema inesperado)
				IF v_note_col IS NOT NULL THEN
					EXECUTE 'INSERT INTO public.inventory_movements (license_id,item_id,inventory_item_id,item_code,' || format('%I', v_type_col) || ',related_type,related_id,user_id,' || format('%I', v_note_col) || ',created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)'
					USING p_license_id, v_item_record.inventory_item_id, v_item_record.inventory_item_id, v_item_record.code, 'salida', 'requisition', p_requisition_id, p_user_id, v_note_text, now();
				ELSE
					EXECUTE 'INSERT INTO public.inventory_movements (license_id,item_id,inventory_item_id,item_code,' || format('%I', v_type_col) || ',related_type,related_id,user_id,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)'
					USING p_license_id, v_item_record.inventory_item_id, v_item_record.inventory_item_id, v_item_record.code, 'salida', 'requisition', p_requisition_id, p_user_id, now();
				END IF;
			END IF;
		END;

		-- Obtener nuevo balance
		SELECT current_stock INTO v_current_stock
		FROM public.inventory_items
		WHERE id = v_item_record.inventory_item_id;

		-- Agregar a array de items despachados
		v_items_dispatched := v_items_dispatched || jsonb_build_object(
			'item_id', v_item_record.inventory_item_id,
			'item_name', v_item_record.name,
			'item_code', v_item_record.code,
			'quantity_dispatched', v_item_record.quantity_requested,
			'previous_stock', v_item_record.current_stock,
			'new_stock', v_current_stock
		);

		-- Agregar a array de nuevos balances
		v_new_balances := v_new_balances || jsonb_build_object(
			'item_code', v_item_record.code,
			'item_name', v_item_record.name,
			'new_balance', v_current_stock
		);
	END LOOP;

	-- 4C: Actualizar el estado de la requisición a 'ENTREGADO'
	UPDATE public.requisitions
	SET 
		status = 'entregado',
		updated_at = now()
	WHERE id = p_requisition_id;

	-- PASO 5: CONFIRMACIÓN - Retornar resumen de operación
	RETURN QUERY SELECT 
		true, 
		'Requisición entregada exitosamente'::text, 
		v_items_dispatched::json, 
		v_new_balances::json;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
