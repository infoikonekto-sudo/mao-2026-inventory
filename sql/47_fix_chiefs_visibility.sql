-- ============================================================
-- MIGRACIÓN 47: GARANTIZAR VISIBILIDAD DE JEFATURAS (CORREGIDO)
-- ============================================================

-- 1. Eliminar la política si ya existe para evitar errores
DROP POLICY IF EXISTS "Approvers can view assigned orders" ON public.purchase_orders;

-- 2. Crear la política corregida
-- Permitir ver la orden si el usuario tiene una aprobación asignada para esa orden,
-- independientemente del estado de la orden.

CREATE POLICY "Approvers can view assigned orders" ON public.purchase_orders
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.purchase_order_approvals
        WHERE purchase_order_approvals.purchase_order_id = purchase_orders.id
        AND purchase_order_approvals.approver_role = (
            SELECT role FROM public.users WHERE id = auth.uid()
        )
    )
);
