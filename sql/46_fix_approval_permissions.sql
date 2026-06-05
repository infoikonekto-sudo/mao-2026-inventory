-- ============================================================
-- MIGRACIÓN 46: EXTENDER PERMISOS DE APROBACIONES
-- ============================================================

-- 1. Permitir que Jefe de Compras y Admin creen los registros de aprobación
-- Esto es necesario cuando se envía la orden a revisión
CREATE POLICY "Jefe Compras and Admin can create approvals" ON public.purchase_order_approvals
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'jefe_compras')
    )
);

-- 2. Asegurar que Jefe de Compras pueda ver las aprobaciones (ya cubierto en la 41, pero reforzamos lecturas generales si faltan)
-- (La política "Approvals are viewable by stakeholders" de la migración 41 ya incluye jefe_compras, así que no es necesario duplicar SELECT)

-- 3. Permitir que Jefe de Compras actualice la Orden de Compra a 'pending_approval'
-- (Esto generalmente ya está permitido si es el creador o por políticas de update existentes en purchase_orders, 
--  pero si falla el update del status, agregar esto:)

CREATE POLICY "Jefe Compras can update order status" ON public.purchase_orders
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'jefe_compras'
    )
);
