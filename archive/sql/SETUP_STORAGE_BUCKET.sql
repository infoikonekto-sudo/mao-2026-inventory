-- Script para crear bucket y configurar políticas RLS en Supabase
-- Ejecutar esto en la consola SQL de Supabase (SQL Editor)
-- NO requiere permisos de owner

-- PASO 1: Crear el bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'purchase_order_invoices',
  'purchase_order_invoices',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = true, file_size_limit = 52428800;

-- PASO 2: Eliminar políticas conflictivas (si existen)
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Public access to purchase_order_invoices" ON storage.objects;

-- PASO 3: Crear política PERMISIVA para lectura pública
CREATE POLICY "Allow all public reads"
ON storage.objects FOR SELECT
USING (true);

-- PASO 4: Crear política PERMISIVA para inserts autenticados
CREATE POLICY "Allow authenticated inserts"
ON storage.objects FOR INSERT
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- PASO 5: Crear política PERMISIVA para deletes autenticados
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- PASO 6: Crear política PERMISIVA para updates autenticados
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- PASO 7: Verificar que el bucket fue creado
SELECT 
  id, 
  name, 
  public, 
  file_size_limit
FROM storage.buckets 
WHERE id = 'purchase_order_invoices';

-- PASO 8: Contar políticas activas en storage.objects
SELECT 
  COUNT(*) as num_policies
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
