-- =============================================================================
-- FIX: Add estimated_unit_cost to requisition_items
-- =============================================================================

-- Add estimated_unit_cost column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'requisition_items' 
        AND column_name = 'estimated_unit_cost'
    ) THEN
        ALTER TABLE public.requisition_items 
        ADD COLUMN estimated_unit_cost NUMERIC(10,2) DEFAULT 0;
        
        RAISE NOTICE '✅ Columna estimated_unit_cost agregada';
    ELSE
        RAISE NOTICE '⚠️ Columna ya existe';
    END IF;
END $$;

-- Verification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'requisition_items'
ORDER BY ordinal_position;
