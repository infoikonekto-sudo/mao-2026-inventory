-- ============================================================
-- AGREGAR COLUMNAS FALTANTES A TABLA USERS PARA PERFIL EDITABLE
-- ============================================================

-- Agregar columnas si no existen
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS bio TEXT;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Verificar que las columnas existan
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema='public' AND table_name='users'
ORDER BY ordinal_position;
