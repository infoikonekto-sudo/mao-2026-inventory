-- ============================================================
-- 59_fix_delivery_visibility.sql
-- Deshabilitar RLS en tablas de despacho para compatibilidad
-- con el sistema de autenticación manual.
-- ============================================================

-- 1. Deshabilitar RLS
ALTER TABLE public.requisition_dispatches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_dispatch_items DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas que podrían interferir (opcional pero recomendado)
DROP POLICY IF EXISTS "dispatches_view" ON public.requisition_dispatches;
DROP POLICY IF EXISTS "dispatches_insert" ON public.requisition_dispatches;
DROP POLICY IF EXISTS "dispatch_items_view" ON public.requisition_dispatch_items;

-- 3. Otorgar permisos explícitos a roles de PostgREST
GRANT ALL ON TABLE public.requisition_dispatches TO anon, authenticated;
GRANT ALL ON TABLE public.requisition_dispatch_items TO anon, authenticated;

-- 4. Asegurar que las secuencias (si existen) sean accesibles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

DO $$ 
BEGIN 
    RAISE NOTICE '✅ RLS deshabilitado en tablas de despacho para visibilidad total';
END $$;
