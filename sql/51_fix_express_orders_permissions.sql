-- ============================================================
-- MIGRACIÓN 51: PERMISOS PARA ÓRDENES EXPRESS
-- ============================================================
-- Las tablas express fueron creadas con RLS usando auth.role()
-- que no funciona con autenticación manual.
-- Deshabilitamos RLS y otorgamos permisos directos.
-- ============================================================

-- 1. Deshabilitar RLS en las 3 tablas express
ALTER TABLE public.express_purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.express_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.express_item_quotes DISABLE ROW LEVEL SECURITY;

-- 2. Permisos para rol anon (PostgREST frontend)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.express_purchase_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.express_order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.express_item_quotes TO anon;

-- 3. Permisos para rol authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.express_purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.express_order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.express_item_quotes TO authenticated;

-- 4. Permisos para service_role
GRANT ALL ON public.express_purchase_orders TO service_role;
GRANT ALL ON public.express_order_items TO service_role;
GRANT ALL ON public.express_item_quotes TO service_role;
