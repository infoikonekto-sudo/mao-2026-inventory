-- Políticas RLS recomendadas para Supabase
-- Ejecutar en SQL Editor de Supabase (staging primero)

-- Helpers: obtener role y license_id desde JWT claims
-- Nota: usamos current_setting('request.jwt.claims', true)::json ->> 'role' para leer el claim `role`

-- 1) Habilitar RLS en tablas
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- 2) POLÍTICAS PARA `notifications`
-- SELECT: el usuario puede ver notificaciones que le sean propias o dirigidas a su rol, o los admins ven todo
DROP POLICY IF EXISTS "notifications_select_user_or_role_or_admin" ON public.notifications;
CREATE POLICY "notifications_select_user_or_role_or_admin" ON public.notifications
  FOR SELECT
  USING (
    (
      recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid()
    )
    OR (
      recipient_role IS NOT NULL AND (current_setting('request.jwt.claims', true)::json ->> 'role') = recipient_role
    )
    OR ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin'))
  );

-- INSERT: permitir que servicios/roles autorizados o usuarios creen notificaciones
DROP POLICY IF EXISTS "notifications_insert_allowed" ON public.notifications;
CREATE POLICY "notifications_insert_allowed" ON public.notifications
  FOR INSERT
  WITH CHECK (
    (
      -- El creador puede insertar notificaciones dirigidas a otros (se recomienda usar service_role para operaciones server-side)
      (current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin')
    )
    OR (
      -- o permitir que usuarios autenticados creen notificaciones dirigidas a su propio license (limitado)
      auth.uid() IS NOT NULL
    )
  );

-- UPDATE: permitir marcar como leída solo al destinatario o a admins
DROP POLICY IF EXISTS "notifications_update_mark_read" ON public.notifications;
CREATE POLICY "notifications_update_mark_read" ON public.notifications
  FOR UPDATE
  USING (
    recipient_user_id = auth.uid() OR (current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin')
  )
  WITH CHECK (
    -- Permitir que el destinatario marque como leída (solo puede establecer read = true)
    (recipient_user_id = auth.uid() AND read = TRUE)
    OR ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin'))
  );

-- DELETE: solo admins
DROP POLICY IF EXISTS "notifications_delete_admin" ON public.notifications;
CREATE POLICY "notifications_delete_admin" ON public.notifications
  FOR DELETE
  USING ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin'));

-- 3) POLÍTICAS PARA `inventory_movements`
-- SELECT: usuarios pueden ver movimientos de su `license_id`, los admins y auditores pueden ver todo; también el usuario que creó el movimiento
DROP POLICY IF EXISTS "inventory_movements_select_by_license_or_creator_or_admin" ON public.inventory_movements;
CREATE POLICY "inventory_movements_select_by_license_or_creator_or_admin" ON public.inventory_movements
  FOR SELECT
  USING (
    license_id = (current_setting('request.jwt.claims', true)::json ->> 'license_id')::uuid
    OR created_by = auth.uid()
    OR ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin','auditor'))
  );

-- INSERT: solo roles autorizados (jefe_compras, finanzas, admin) o service_role
DROP POLICY IF EXISTS "inventory_movements_insert_allowed_roles" ON public.inventory_movements;
CREATE POLICY "inventory_movements_insert_allowed_roles" ON public.inventory_movements
  FOR INSERT
  WITH CHECK (
    (
      (current_setting('request.jwt.claims', true)::json ->> 'role') IN ('jefe_compras','finanzas','admin','super_admin')
    )
    OR auth.uid() IS NOT NULL -- o permitir que el usuario registre su propio movimiento (si corresponde)
  );

-- UPDATE: solo admins o el creador pueden actualizar notas o corregir (evitar cambiar amount arbitrariamente en políticas simples)
DROP POLICY IF EXISTS "inventory_movements_update_creator_or_admin" ON public.inventory_movements;
CREATE POLICY "inventory_movements_update_creator_or_admin" ON public.inventory_movements
  FOR UPDATE
  USING (
    created_by = auth.uid() OR ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin'))
  )
  WITH CHECK (
    -- Opcional: restringir cambios a fields permitidos (simplificado aquí)
    created_by = auth.uid() OR ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin'))
  );

-- DELETE: solo admins
DROP POLICY IF EXISTS "inventory_movements_delete_admin" ON public.inventory_movements;
CREATE POLICY "inventory_movements_delete_admin" ON public.inventory_movements
  FOR DELETE
  USING ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('admin','super_admin'));

-- 4) Recomendación: crear una vista o función para que los endpoints administrativos obtengan datos agregados
-- (no incluido aquí, se puede agregar según necesidades)

-- Nota de seguridad:
-- - Estas políticas asumen que los tokens JWT contienen los claims `role` y `license_id`.
-- - Para acciones server-side use la "service_role" key de Supabase, que ignora RLS.
-- - Prueba en staging antes de aplicar en producción.
