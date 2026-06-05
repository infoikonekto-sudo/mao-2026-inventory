-- ============================================================
-- FIX RÁPIDO: Deshabilitar RLS en requisitions
-- ============================================================

-- Deshabilitar RLS completamente en requisitions (solución temporal)
ALTER TABLE public.requisitions DISABLE ROW LEVEL SECURITY;

-- Mantener RLS en email_notifications pero con política muy permisiva
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes de email_notifications
DROP POLICY IF EXISTS "email_notifications_select_own_or_admin" ON public.email_notifications;
DROP POLICY IF EXISTS "email_notifications_insert_allowed" ON public.email_notifications;
DROP POLICY IF EXISTS "email_notifications_update_sent_or_admin" ON public.email_notifications;
DROP POLICY IF EXISTS "email_notifications_delete_admin" ON public.email_notifications;

-- Nueva política simple para email_notifications: permitir todo a usuarios autenticados
CREATE POLICY "email_notifications_all_authenticated" ON public.email_notifications
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
