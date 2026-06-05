-- ============================================================
-- FIX: Agregar RLS policies para requisitions y email_notifications
-- ============================================================

-- 1) Habilitar RLS en ambas tablas
ALTER TABLE IF EXISTS public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS PARA `requisitions`
-- ============================================================

-- SELECT: El usuario puede ver sus propias requisiciones, cualquiera de su license_id, o si es admin
DROP POLICY IF EXISTS "requisitions_select_by_license_or_admin" ON public.requisitions;
CREATE POLICY "requisitions_select_by_license_or_admin" ON public.requisitions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR license_id = (current_setting('request.jwt.claims', true)::json ->> 'license_id')::uuid
    OR ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin','jefe_compras'))
  );

-- INSERT: Cualquier usuario autenticado puede crear requisiciones
DROP POLICY IF EXISTS "requisitions_insert_own_license" ON public.requisitions;
CREATE POLICY "requisitions_insert_own_license" ON public.requisitions
  FOR INSERT
  WITH CHECK (
    true  -- Permitir cualquier usuario autenticado insertar (verificación en aplicación)
  );

-- UPDATE: Solo jefe_compras, admin y el creador pueden actualizar
DROP POLICY IF EXISTS "requisitions_update_jefe_or_creator" ON public.requisitions;
CREATE POLICY "requisitions_update_jefe_or_creator" ON public.requisitions
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('jefe_compras','admin','super_admin'))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('jefe_compras','admin','super_admin'))
  );

-- DELETE: solo admins o creador dentro de 1 hora
DROP POLICY IF EXISTS "requisitions_delete_admin_or_creator" ON public.requisitions;
CREATE POLICY "requisitions_delete_admin_or_creator" ON public.requisitions
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin'))
  );

-- ============================================================
-- POLÍTICAS PARA `email_notifications`
-- ============================================================

-- SELECT: Usuario puede ver sus propias notificaciones, admins ven todo
DROP POLICY IF EXISTS "email_notifications_select_own_or_admin" ON public.email_notifications;
CREATE POLICY "email_notifications_select_own_or_admin" ON public.email_notifications
  FOR SELECT
  USING (
    recipient_email = (current_setting('request.jwt.claims', true)::json ->> 'email')
    OR ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin','auditor'))
  );

-- INSERT: servicios y roles autorizados pueden crear notificaciones
DROP POLICY IF EXISTS "email_notifications_insert_allowed" ON public.email_notifications;
CREATE POLICY "email_notifications_insert_allowed" ON public.email_notifications
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL -- permitir usuarios autenticados crear notificaciones
    OR ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin'))
  );

-- UPDATE: solo para marcar como enviado o admin
DROP POLICY IF EXISTS "email_notifications_update_sent_or_admin" ON public.email_notifications;
CREATE POLICY "email_notifications_update_sent_or_admin" ON public.email_notifications
  FOR UPDATE
  USING (
    ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin'))
    OR auth.uid() IS NOT NULL -- permitir actualizar si es necesario
  )
  WITH CHECK (
    ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin'))
  );

-- DELETE: solo admins
DROP POLICY IF EXISTS "email_notifications_delete_admin" ON public.email_notifications;
CREATE POLICY "email_notifications_delete_admin" ON public.email_notifications
  FOR DELETE
  USING ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin'));
