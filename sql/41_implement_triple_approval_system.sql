-- ============================================================
-- MIGRACIÓN 41: SISTEMA DE TRIPLE APROBACIÓN DE ÓRDENES
-- ============================================================

-- 1. Crear tabla de aprobaciones
CREATE TABLE IF NOT EXISTS public.purchase_order_approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    approver_role TEXT NOT NULL CHECK (approver_role IN ('jefe_presupuesto', 'jefe_operaciones', 'jefe_calidad')),
    approver_user_id UUID REFERENCES public.users(id), -- Nullable initially
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    comments TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un rol solo puede tener una aprobación activa por orden
    CONSTRAINT unique_order_role_approval UNIQUE(purchase_order_id, approver_role)
);

-- 2. Habilitar RLS en aprobaciones
ALTER TABLE public.purchase_order_approvals ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS para aprobaciones

-- Lectura: Todos los involucrados (Jefe Compras, Admin, Finanzas, y los 3 Jefes)
CREATE POLICY "Approvals are viewable by stakeholders" ON public.purchase_order_approvals
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'jefe_compras', 'finanzas', 'jefe_presupuesto', 'jefe_operaciones', 'jefe_calidad'))
);

-- Edición: Solo el usuario con el rol correspondiente puede aprobar/rechazar SU registro
-- (PERO el registro se crea inicialmente sin usser_id, asi que validamos por ROL del usuario vs approver_role del registro)
CREATE POLICY "Approvers can update their assigned role record" ON public.purchase_order_approvals
FOR UPDATE USING (
    status = 'pending' AND
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND (
            (role = 'jefe_presupuesto' AND purchase_order_approvals.approver_role = 'jefe_presupuesto') OR
            (role = 'jefe_operaciones' AND purchase_order_approvals.approver_role = 'jefe_operaciones') OR
            (role = 'jefe_calidad' AND purchase_order_approvals.approver_role = 'jefe_calidad')
        )
    )
);

-- 4. Función para verificar si la orden está completamente aprobada
CREATE OR REPLACE FUNCTION check_purchase_order_full_approval() RETURNS TRIGGER AS $$
DECLARE
    total_approvals INTEGER;
    approved_count INTEGER;
    rejected_count INTEGER;
BEGIN
    -- Contar registros para esta orden
    SELECT COUNT(*), 
           COUNT(*) FILTER (WHERE status = 'approved'),
           COUNT(*) FILTER (WHERE status = 'rejected')
    INTO total_approvals, approved_count, rejected_count
    FROM public.purchase_order_approvals
    WHERE purchase_order_id = NEW.purchase_order_id;

    -- Si hay al menos un rechazo, la orden se marca como rechazada y se desbloquea
    IF rejected_count > 0 THEN
        UPDATE public.purchase_orders
        SET status = 'rejected',
            is_locked = FALSE
        WHERE id = NEW.purchase_order_id;
    
    -- Si las 3 aprobaciones están completas (y son exactamente 3 las requeridas)
    ELSIF approved_count = 3 THEN
        UPDATE public.purchase_orders
        SET status = 'approved',
            is_locked = FALSE -- Se desbloquea para que Jefe Compras continúe (confirmar precio, etc)
        WHERE id = NEW.purchase_order_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar la verificación después de cada actualización de aprobación
CREATE OR REPLACE TRIGGER trg_check_approval_status
AFTER UPDATE ON public.purchase_order_approvals
FOR EACH ROW EXECUTE FUNCTION check_purchase_order_full_approval();

-- 5. Actualizar Políticas de Purchase Orders para permitir lectura a los nuevos roles si está en revisión
CREATE POLICY "Approvers can view orders in review" ON public.purchase_orders
FOR SELECT USING (
    status IN ('pending_approval', 'approved', 'rejected') AND
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('jefe_presupuesto', 'jefe_operaciones', 'jefe_calidad')
    )
);

-- 6. Indices
CREATE INDEX IF NOT EXISTS idx_approvals_order_id ON public.purchase_order_approvals(purchase_order_id);
