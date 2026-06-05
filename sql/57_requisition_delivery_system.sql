-- ============================================================
-- REQUISITION DELIVERY SYSTEM WITH DIGITAL SIGNATURE
-- ============================================================

-- 1. Actualizar estados de requisición
DO $$ 
BEGIN
    ALTER TABLE public.requisitions DROP CONSTRAINT IF EXISTS requisitions_status_check;
    ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_status_check 
        CHECK (status IN ('pendiente', 'en_revision', 'aprobada', 'rechazada', 'listo_para_recoger', 'entregado_parcial', 'entregado'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint status actualizado';
END $$;

-- 2. Agregar control de entrega en items
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='requisition_items' AND column_name='quantity_delivered') THEN
        ALTER TABLE public.requisition_items ADD COLUMN quantity_delivered NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 3. Tabla de Despachos (Historial de entregas)
CREATE TABLE IF NOT EXISTS public.requisition_dispatches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
    requisition_id UUID NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
    signature_url TEXT, -- URL de la firma en Storage
    received_by_name TEXT NOT NULL,
    received_by_id UUID REFERENCES public.users(id), -- Opcional, si es un usuario del sistema
    dispatched_by UUID NOT NULL REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Items entregados en cada despacho (para trazabilidad de parciales)
CREATE TABLE IF NOT EXISTS public.requisition_dispatch_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    dispatch_id UUID NOT NULL REFERENCES public.requisition_dispatches(id) ON DELETE CASCADE,
    requisition_item_id UUID NOT NULL REFERENCES public.requisition_items(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES public.inventory_items(id),
    quantity_delivered NUMERIC NOT NULL,
    unit_of_measure TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_req_dispatches_req ON public.requisition_dispatches(requisition_id);
CREATE INDEX IF NOT EXISTS idx_req_dispatch_items_dispatch ON public.requisition_dispatch_items(dispatch_id);

-- 5. Modificar RPC de aprobación para NO descontar stock automáticamente
-- Ahora la aprobación solo valida presupuesto/flujo, pero el stock se descuenta en el despacho físico.
CREATE OR REPLACE FUNCTION public.process_requisition_approval(
  p_requisition_id uuid,
  p_license_id uuid,
  p_user_id uuid
) RETURNS void AS $$
BEGIN
  -- Ahora esta función solo podría marcar la requisición como aprobada internamente si fuera necesario,
  -- pero el descuento de stock se hará en public.dispatch_requisition_items o lógica similar de entrega física.
  -- Por ahora, la dejamos vacía para no romper llamadas existentes pero evitar el descuento doble.
  RAISE NOTICE 'Skipping auto-stock deduction on approval for requisition %', p_requisition_id;
END;
$$ LANGUAGE plpgsql;

-- 6. RPC para Procesar Entrega Atómica (Física)
-- Esta función:
-- 1. Crea el registro de despacho
-- 2. Inserta los items entregados
-- 3. Descuenta stock de inventory_items
-- 4. Registra movimientos de inventario
-- 5. Actualiza quantity_delivered en requisition_items
-- 6. Actualiza el estado de la requisición principal
CREATE OR REPLACE FUNCTION public.confirm_requisition_delivery(
    p_license_id UUID,
    p_requisition_id UUID,
    p_dispatched_by UUID,
    p_received_by_name TEXT,
    p_signature_url TEXT,
    p_notes TEXT,
    p_items JSONB -- Array de {requisition_item_id, inventory_item_id, quantity}
) RETURNS UUID AS $$
DECLARE
    v_dispatch_id UUID;
    v_item RECORD;
    v_total_requested NUMERIC;
    v_total_delivered NUMERIC;
    v_all_done BOOLEAN := TRUE;
BEGIN
    -- 1. Crear despacho
    INSERT INTO public.requisition_dispatches (
        license_id, requisition_id, signature_url, received_by_name, dispatched_by, notes
    ) VALUES (
        p_license_id, p_requisition_id, p_signature_url, p_received_by_name, p_dispatched_by, p_notes
    ) RETURNING id INTO v_dispatch_id;

    -- 2. Procesar cada item
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(requisition_item_id UUID, inventory_item_id UUID, quantity NUMERIC)
    LOOP
        IF v_item.quantity > 0 THEN
            -- A. Registrar en items del despacho
            INSERT INTO public.requisition_dispatch_items (
                dispatch_id, requisition_item_id, inventory_item_id, quantity_delivered
            ) VALUES (
                v_dispatch_id, v_item.requisition_item_id, v_item.inventory_item_id, v_item.quantity
            );

            -- B. Descontar stock (si tiene inventory_item_id)
            IF v_item.inventory_item_id IS NOT NULL THEN
                UPDATE public.inventory_items
                SET current_stock = current_stock - v_item.quantity,
                    updated_at = NOW()
                WHERE id = v_item.inventory_item_id;

                -- C. Registrar movimiento
                INSERT INTO public.inventory_movements (
                    license_id, item_id, inventory_item_id, movement_type, quantity,
                    related_type, related_id, user_id, notes
                ) VALUES (
                    p_license_id, v_item.inventory_item_id, v_item.inventory_item_id, 'salida', v_item.quantity,
                    'requisition_delivery', v_dispatch_id, p_dispatched_by, 'Entrega requisición: ' || p_received_by_name
                );
            END IF;

            -- D. Actualizar acumulado en requisition_items
            UPDATE public.requisition_items
            SET quantity_delivered = quantity_delivered + v_item.quantity
            WHERE id = v_item.requisition_item_id;
        END IF;
    END LOOP;

    -- 3. Calcular si la requisición está completa o parcial
    -- Si todos los items tienen quantity_delivered >= quantity (requested)
    SELECT NOT EXISTS (
        SELECT 1 FROM public.requisition_items 
        WHERE requisition_id = p_requisition_id 
        AND quantity_delivered < quantity
    ) INTO v_all_done;

    -- 4. Actualizar estado de la requisición
    IF v_all_done THEN
        UPDATE public.requisitions SET status = 'entregado', updated_at = NOW() WHERE id = p_requisition_id;
    ELSE
        UPDATE public.requisitions SET status = 'entregado_parcial', updated_at = NOW() WHERE id = p_requisition_id;
    END IF;

    RETURN v_dispatch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS y Permisos
ALTER TABLE public.requisition_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_dispatch_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dispatches_view" ON public.requisition_dispatches;
CREATE POLICY "dispatches_view" ON public.requisition_dispatches
    FOR SELECT USING (license_id IN (SELECT license_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "dispatches_insert" ON public.requisition_dispatches;
CREATE POLICY "dispatches_insert" ON public.requisition_dispatches
    FOR INSERT WITH CHECK (license_id IN (SELECT license_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "dispatch_items_view" ON public.requisition_dispatch_items;
CREATE POLICY "dispatch_items_view" ON public.requisition_dispatch_items
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.requisition_dispatches d 
        WHERE d.id = requisition_dispatch_items.dispatch_id 
        AND d.license_id IN (SELECT license_id FROM public.users WHERE id = auth.uid())
    ));

GRANT ALL ON TABLE public.requisition_dispatches TO authenticated;
GRANT ALL ON TABLE public.requisition_dispatch_items TO authenticated;
