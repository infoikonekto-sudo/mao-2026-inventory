-- =============================================================================
-- VERIFICAR Y ARREGLAR TODAS LAS COLUMNAS DE requisition_items
-- =============================================================================

-- Ver columnas actuales
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'requisition_items'
ORDER BY ordinal_position;

-- Agregar todas las columnas faltantes
DO $$ 
BEGIN
    -- item_name (nullable first, then fix)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'requisition_items' AND column_name = 'item_name'
    ) THEN
        ALTER TABLE public.requisition_items ADD COLUMN item_name TEXT;
        UPDATE public.requisition_items SET item_name = 'Item sin nombre' WHERE item_name IS NULL;
        ALTER TABLE public.requisition_items ALTER COLUMN item_name SET NOT NULL;
        RAISE NOTICE '✅ Columna item_name agregada';
    END IF;

    -- quantity (nullable first, then fix)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'requisition_items' AND column_name = 'quantity'
    ) THEN
        ALTER TABLE public.requisition_items ADD COLUMN quantity INTEGER DEFAULT 1;
        UPDATE public.requisition_items SET quantity = 1 WHERE quantity IS NULL;
        ALTER TABLE public.requisition_items ALTER COLUMN quantity SET NOT NULL;
        RAISE NOTICE '✅ Columna quantity agregada';
    END IF;

    -- unit_of_measure
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'requisition_items' AND column_name = 'unit_of_measure'
    ) THEN
        ALTER TABLE public.requisition_items ADD COLUMN unit_of_measure TEXT DEFAULT 'unidades';
        UPDATE public.requisition_items SET unit_of_measure = 'unidades' WHERE unit_of_measure IS NULL;
        ALTER TABLE public.requisition_items ALTER COLUMN unit_of_measure SET NOT NULL;
        RAISE NOTICE '✅ Columna unit_of_measure agregada';
    END IF;

    -- estimated_unit_cost
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'requisition_items' AND column_name = 'estimated_unit_cost'
    ) THEN
        ALTER TABLE public.requisition_items ADD COLUMN estimated_unit_cost NUMERIC(10,2) DEFAULT 0;
        RAISE NOTICE '✅ Columna estimated_unit_cost agregada';
    END IF;

    -- notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'requisition_items' AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.requisition_items ADD COLUMN notes TEXT;
        RAISE NOTICE '✅ Columna notes agregada';
    END IF;
END $$;

-- Forzar reload del esquema
NOTIFY pgrst, 'reload schema';

-- Verificación final
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'requisition_items'
ORDER BY ordinal_position;
