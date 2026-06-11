-- Agregar la columna custom_permissions a la tabla users si no existe
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS custom_permissions text[] DEFAULT '{}'::text[];

-- Forzar la recarga del caché de esquema (Schema Cache) en PostgREST
NOTIFY pgrst, 'reload schema';
