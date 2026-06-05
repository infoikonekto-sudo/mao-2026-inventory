-- =============================================================================
-- FIX: Add created_by column to requisitions table
-- Error: "Could not find the 'created_by' column of 'requisitions'"
-- =============================================================================

-- Add created_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'requisitions' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.requisitions 
        ADD COLUMN created_by UUID REFERENCES public.users(id);
        
        RAISE NOTICE '✅ Columna created_by agregada a requisitions';
    ELSE
        RAISE NOTICE '⚠️ Columna created_by ya existe';
    END IF;
END $$;

-- Update existing records to set created_by from user_id if they exist
UPDATE public.requisitions
SET created_by = user_id
WHERE created_by IS NULL AND user_id IS NOT NULL;

-- Verification
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'requisitions'
AND column_name IN ('user_id', 'created_by')
ORDER BY column_name;

-- Confirmation message
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada';
    RAISE NOTICE '   - Columna created_by agregada/verificada';
    RAISE NOTICE '   - Registros existentes actualizados';
END $$;
