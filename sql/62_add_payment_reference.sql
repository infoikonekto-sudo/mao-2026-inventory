-- Add payment_reference column to purchase_orders table
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Add comment for clarity
COMMENT ON COLUMN purchase_orders.payment_reference IS 'Número de cheque o transferencia asociado al pago de la orden';
