-- ============================================================
-- MIGRACIÓN: SISTEMA DE ENTREGA EN VENTANILLA
-- ============================================================

-- 1. Crear tabla de entregas
CREATE TABLE public.deliveries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    license_id UUID NOT NULL REFERENCES public.licenses(id),
    receiver_name TEXT NOT NULL, -- Nombre de quien recibe
    department TEXT NOT NULL, -- Departamento (Limpieza, Mantenimiento, etc.)
    signature_url TEXT, -- URL de la firma (o base64 si es corto, pero mejor storage)
    items JSONB NOT NULL, -- Array de {id: item_id, name: nombre, quantity: cantidad, unit: unidad}
    delivered_by UUID REFERENCES auth.users(id), -- Usuario que entregó (Admin/Bodeguero)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadatos opcionales
    reference_request_id UUID -- Si se vincula a una solicitud existente
);

-- 2. Habilitar RLS
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso (Admin, Jefe Compras, Bodega pueden ver todo)
CREATE POLICY "Accesible para staff autorizado" ON public.deliveries
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'super_admin', 'jefe_compras', 'bodega')
        )
    );

-- 4. Trigger para descontar inventario AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION public.handle_new_delivery()
RETURNS TRIGGER AS $$
DECLARE
    item_data JSONB;
    current_stock NUMERIC;
BEGIN
    -- Iterar sobre los items entregados
    FOR item_data IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
        -- 1. Registrar movimiento de salida
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
            'salida', -- Tipo salida
            (item_data->>'quantity')::NUMERIC,
            i.current_stock,
            i.current_stock - (item_data->>'quantity')::NUMERIC,
            NEW.id::TEXT,
            'entrega_ventanilla',
            'Entrega a: ' || NEW.receiver_name || ' (' || NEW.department || ')',
            NEW.delivered_by
        FROM public.inventory_items i
        WHERE i.id = (item_data->>'id')::UUID;

        -- 2. Actualizar stock actual en la tabla items
        UPDATE public.inventory_items
        SET 
            current_stock = current_stock - (item_data->>'quantity')::NUMERIC,
            updated_at = NOW()
        WHERE id = (item_data->>'id')::UUID;
        
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Aplicar Trigger
DROP TRIGGER IF EXISTS on_delivery_created ON public.deliveries;
CREATE TRIGGER on_delivery_created
AFTER INSERT ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.handle_new_delivery();
