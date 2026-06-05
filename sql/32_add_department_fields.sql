-- =============================================================================
-- Add Department Fields for Auto CC Assignment
-- =============================================================================

-- Add department to users table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'department'
    ) THEN
        ALTER TABLE public.users ADD COLUMN department TEXT;
        RAISE NOTICE '✅ Columna department agregada a users';
    ELSE
        RAISE NOTICE '⚠️ Columna department ya existe en users';
    END IF;
END $$;

-- Add department to cost_centers table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cost_centers' AND column_name = 'department'
    ) THEN
        ALTER TABLE public.cost_centers ADD COLUMN department TEXT;
        RAISE NOTICE '✅ Columna department agregada a cost_centers';
    ELSE
        RAISE NOTICE '⚠️ Columna department ya existe en cost_centers';
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cost_centers_department 
ON public.cost_centers(license_id, department) 
WHERE department IS NOT NULL;

-- Verification
SELECT 'users' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'department'
UNION ALL
SELECT 'cost_centers' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cost_centers' AND column_name = 'department';
