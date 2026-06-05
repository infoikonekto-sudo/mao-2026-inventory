-- 63_standardize_express_payment_ref.sql
-- Estandarización de referencias de pago para órdenes express

-- 1. Agregar nueva columna payment_reference
ALTER TABLE public.express_purchase_orders 
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- 2. Migrar datos existentes (si los hay)
UPDATE public.express_purchase_orders
SET payment_reference = COALESCE(cheque_number, transfer_reference)
WHERE payment_reference IS NULL 
AND (cheque_number IS NOT NULL OR transfer_reference IS NOT NULL);

-- 3. Comentario informativo
COMMENT ON COLUMN public.express_purchase_orders.payment_reference IS 'Número de cheque o referencia de transferencia (estandarizado)';
