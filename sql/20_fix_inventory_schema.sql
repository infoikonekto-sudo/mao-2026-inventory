-- FIX: AGREGAR COLUMNAS FALTANTES EN INVENTORY_MOVEMENTS
-- El sistema de entregas intenta guardar 'previous_stock' y 'new_stock' pero la tabla no las tiene.
-- También nos aseguramos de que existan reference_id y reference_type que usa el trigger.

DO $$
BEGIN
    -- 1. Agregar previous_stock
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_movements' AND column_name='previous_stock') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN previous_stock NUMERIC DEFAULT 0;
    END IF;

    -- 2. Agregar new_stock
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_movements' AND column_name='new_stock') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN new_stock NUMERIC DEFAULT 0;
    END IF;

    -- 3. Agregar reference_id (usado por el trigger de entregas)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_movements' AND column_name='reference_id') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN reference_id TEXT;
    END IF;

    -- 4. Agregar reference_type (usado por el trigger de entregas)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_movements' AND column_name='reference_type') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN reference_type TEXT;
    END IF;
END $$;
