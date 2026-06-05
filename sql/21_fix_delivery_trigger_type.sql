-- FIX: CORRECCIÓN DE TIPO DE DATO EN TRIGGER DE ENTREGAS
-- El error indica que reference_id es UUID pero el trigger intentaba guardar TEXT.
-- Solución: Actualizar la función para pasar el ID como UUID (sin cast a TEXT).

CREATE OR REPLACE FUNCTION public.handle_new_delivery()
RETURNS TRIGGER AS $$
DECLARE
    item_data JSONB;
    current_stock NUMERIC;
BEGIN
    FOR item_data IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
        INSERT INTO public.inventory_movements (
            license_id,
            item_id,
            movement_type,
            quantity,
            previous_stock,
            new_stock,
            reference_id,
            reference_type,
            notes,
            created_by
        )
        SELECT 
            NEW.license_id,
            (item_data->>'id')::UUID,
            'salida',
            (item_data->>'quantity')::NUMERIC,
            i.current_stock,
            i.current_stock - (item_data->>'quantity')::NUMERIC,
            NEW.id, -- SE ELIMINÓ EL CAST ::TEXT PARA QUE PASE COMO UUID
            'entrega_ventanilla',
            'Entrega a: ' || NEW.receiver_name || ' (' || NEW.department || ')',
            NEW.delivered_by
        FROM public.inventory_items i
        WHERE i.id = (item_data->>'id')::UUID;

        UPDATE public.inventory_items
        SET 
            current_stock = current_stock - (item_data->>'quantity')::NUMERIC,
            updated_at = NOW()
        WHERE id = (item_data->>'id')::UUID;
        
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
