-- ============================================================
-- MIGRACIÓN 49: PERMISOS COMPLETOS PARA purchase_order_approvals
-- ============================================================
-- 
-- PROBLEMA: La tabla purchase_order_approvals fue creada sin GRANT
-- para los roles 'anon' y 'authenticated'. PostgREST usa estos roles
-- para ejecutar queries, por lo que sin permisos SELECT/INSERT/UPDATE,
-- las consultas devuelven 0 filas silenciosamente.
-- ============================================================

-- Permisos completos para el rol anon (usado por el frontend)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_approvals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_approvals TO authenticated;

-- Asegurar que el servicio también tiene permisos
GRANT ALL ON public.purchase_order_approvals TO service_role;
