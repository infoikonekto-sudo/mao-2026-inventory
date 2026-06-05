-- ============================================================
-- MIGRACIÓN 52: FIX PURCHASE_ORDER_APPROVALS PARA EXPRESS ORDERS
-- ============================================================
-- La tabla solo tenía purchase_order_id (NOT NULL) pero Express Orders
-- necesita usar express_order_id. Solución: agregar columna y hacer
-- purchase_order_id nullable.
-- ============================================================

-- 1. Agregar columna express_order_id
ALTER TABLE public.purchase_order_approvals
ADD COLUMN IF NOT EXISTS express_order_id UUID REFERENCES public.express_purchase_orders(id) ON DELETE CASCADE;

-- 2. Hacer purchase_order_id nullable (para permitir express orders sin purchase_order)
ALTER TABLE public.purchase_order_approvals
ALTER COLUMN purchase_order_id DROP NOT NULL;

-- 3. Eliminar constraint UNIQUE viejo y crear uno nuevo más flexible
ALTER TABLE public.purchase_order_approvals
DROP CONSTRAINT IF EXISTS unique_order_role_approval;

-- Nuevos constraints: solo una aprobación por rol por tipo de orden
CREATE UNIQUE INDEX IF NOT EXISTS unique_po_role_approval
ON public.purchase_order_approvals (purchase_order_id, approver_role)
WHERE purchase_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_express_role_approval
ON public.purchase_order_approvals (express_order_id, approver_role)
WHERE express_order_id IS NOT NULL;

-- 4. Check constraint: debe tener al menos un tipo de orden
ALTER TABLE public.purchase_order_approvals
DROP CONSTRAINT IF EXISTS check_order_type;

ALTER TABLE public.purchase_order_approvals
ADD CONSTRAINT check_order_type
CHECK (purchase_order_id IS NOT NULL OR express_order_id IS NOT NULL);
