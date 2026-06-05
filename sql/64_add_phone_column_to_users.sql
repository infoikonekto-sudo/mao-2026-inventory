-- ============================================================
-- ADD MISSING PHONE COLUMN TO USERS TABLE
-- ============================================================

-- Add phone column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.users ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE '✅ Columna phone agregada a users';
    ELSE
        RAISE NOTICE '⚠️ Columna phone ya existe en users';
    END IF;
END $$;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone';
