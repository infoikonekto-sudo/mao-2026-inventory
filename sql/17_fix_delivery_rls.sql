-- ============================================================
-- FIX: PERMISOS Y RLS DE ENTREGAS
-- ============================================================

-- 1. Asegurar que RLS está activo
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas antiguas para evitar conflictos
DROP POLICY IF EXISTS "Accesible para staff autorizado" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery Monitor" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery Create" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery Select" ON public.deliveries;
DROP POLICY IF EXISTS "Delivery Insert" ON public.deliveries;

-- 3. Crear Políticas explícitas

-- LECTURA: Permitir ver entregas propias (si se quisiera) O si eres staff
CREATE POLICY "Delivery Select" ON public.deliveries
FOR SELECT
USING (
  -- Si eres el creador
  auth.uid() = delivered_by
  OR 
  -- O si tienes rol de staff
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'jefe_compras', 'bodega', 'finanzas')
  )
);

-- CREACIÓN: Permitir crear solo a staff
CREATE POLICY "Delivery Insert" ON public.deliveries
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'jefe_compras', 'bodega')
  )
);

-- 4. Grant explícito para que el rol 'authenticated' (Supabase default) pueda usar la tabla
GRANT ALL ON TABLE public.deliveries TO authenticated;
GRANT ALL ON TABLE public.deliveries TO service_role;

-- 5. Trigger check: Asegurar que el dueño de la función tenga permisos
ALTER FUNCTION public.handle_new_delivery() OWNER TO postgres;
