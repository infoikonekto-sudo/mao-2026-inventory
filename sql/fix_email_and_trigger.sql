-- ============================================================
-- FIX: Deshabilitar RLS en email_notifications y desactivar trigger de items
-- ============================================================

-- Deshabilitar RLS completamente en email_notifications
ALTER TABLE public.email_notifications DISABLE ROW LEVEL SECURITY;

-- Desactivar el trigger que valida items (ya no es necesario si usamos quantity)
DROP TRIGGER IF EXISTS trg_check_requisition_items ON public.requisitions;
