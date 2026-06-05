-- ============================================================
-- MIGRACIÓN 50: PERMISOS PARA TABLAS RELACIONADAS AL DASHBOARD
-- ============================================================
-- El dashboard de jefaturas necesita leer de estas tablas.
-- Asegurar que el rol 'anon' (PostgREST) puede leer.
-- ============================================================

-- purchase_orders: necesario para ver detalles de órdenes
GRANT SELECT ON public.purchase_orders TO anon;
GRANT SELECT ON public.purchase_orders TO authenticated;

-- suppliers: necesario para nombre del proveedor
GRANT SELECT ON public.suppliers TO anon;
GRANT SELECT ON public.suppliers TO authenticated;

-- users: necesario para nombre del solicitante
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.users TO authenticated;

-- purchase_requests: necesario para descripción de la solicitud
GRANT SELECT ON public.purchase_requests TO anon;
GRANT SELECT ON public.purchase_requests TO authenticated;
