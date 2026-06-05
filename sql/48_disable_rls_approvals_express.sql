-- ============================================================
-- MIGRACIÓN 48: DESHABILITAR RLS EN TABLAS DE APROBACIONES Y EXPRESS
-- ============================================================
-- 
-- MOTIVO: La aplicación usa autenticación manual (código + Zustand store),
-- NO usa supabase.auth.signIn(). Por lo tanto auth.uid() siempre es NULL
-- y todas las políticas RLS que dependen de auth.uid() bloquean silenciosamente
-- todas las consultas, devolviendo 0 filas.
--
-- La seguridad se maneja a nivel de aplicación (roles en el frontend).
-- ============================================================

-- 1. Deshabilitar RLS en la tabla de aprobaciones
ALTER TABLE public.purchase_order_approvals DISABLE ROW LEVEL SECURITY;

-- 2. Deshabilitar RLS en las tablas de órdenes express
ALTER TABLE public.express_purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.express_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.express_item_quotes DISABLE ROW LEVEL SECURITY;
