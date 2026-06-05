-- FIX: ASIGNAR INVENTORY_ITEM_ID
-- La tabla inventory_movements tiene ambos campos: item_id y inventory_item_id.
-- El error es que inventory_item_id no puede ser nulo.
-- Actualizamos el trigger para llenar ambos con el mismo ID del producto.

CREATE OR REPLACE FUNCTION public.handle_new_delivery()
RETURNS TRIGGER AS $$
DECLARE
    item_data JSONB;
BEGIN
    FOR item_data IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
        INSERT INTO public.inventory_movements (
            license_id,
            item_id,
            inventory_item_id, -- <--- AGREGADO
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
            (item_data->>'id')::UUID, -- <--- ASIGNAMOS EL MISMO ID
            'salida',
            (item_data->>'quantity')::NUMERIC,
            (SELECT current_stock FROM public.inventory_items WHERE id = (item_data->>'id')::UUID),
            (SELECT current_stock FROM public.inventory_items WHERE id = (item_data->>'id')::UUID) - (item_data->>'quantity')::NUMERIC,
            NEW.id, -- UUID
            'entrega_ventanilla',
            'Entrega a: ' || NEW.receiver_name || ' (' || NEW.department || ')',
            NEW.delivered_by;

        UPDATE public.inventory_items
        SET 
            current_stock = current_stock - (item_data->>'quantity')::NUMERIC,
            updated_at = NOW()
        WHERE id = (item_data->>'id')::UUID;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
