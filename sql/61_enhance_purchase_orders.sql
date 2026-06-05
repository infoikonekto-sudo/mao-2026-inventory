-- 61_enhance_purchase_orders.sql
-- Adds support for quotations and delivery signatures to standard purchase orders

-- 1. Add document tracking columns
ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS quotation_url TEXT,
ADD COLUMN IF NOT EXISTS delivered_signature_url TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_to_name TEXT;

-- 2. Add comments for documentation
COMMENT ON COLUMN public.purchase_orders.quotation_url IS 'URL for the quotation document uploaded during order creation';
COMMENT ON COLUMN public.purchase_orders.delivered_signature_url IS 'URL of the signature image captured at delivery';
COMMENT ON COLUMN public.purchase_orders.delivered_at IS 'Timestamp when the order was delivered to the applicant';
COMMENT ON COLUMN public.purchase_orders.delivered_to_name IS 'Name of the person who received the order';

-- 3. Ensure permissions
GRANT ALL ON TABLE public.purchase_orders TO anon;
GRANT ALL ON TABLE public.purchase_orders TO authenticated;
