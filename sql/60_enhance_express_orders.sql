-- 60_enhance_express_orders.sql
-- Adds support for quotations and delivery signatures to express orders

-- 1. Add quotation columns
ALTER TABLE public.express_purchase_orders
ADD COLUMN IF NOT EXISTS quotation_files TEXT[] DEFAULT '{}';

-- 2. Add delivery tracking columns
ALTER TABLE public.express_purchase_orders
ADD COLUMN IF NOT EXISTS delivered_signature_url TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_to_name TEXT;

-- 3. Comments for documentation
COMMENT ON COLUMN public.express_purchase_orders.quotation_files IS 'Array of URLs for quotation documents attached during draft/pending state';
COMMENT ON COLUMN public.express_purchase_orders.delivered_signature_url IS 'URL of the signature image capture at delivery';
COMMENT ON COLUMN public.express_purchase_orders.delivered_at IS 'Timestamp when the order was delivered to the requester';
COMMENT ON COLUMN public.express_purchase_orders.delivered_to_name IS 'Name of the person who received the order (usually the professor)';

-- 4. Ensure permissions
GRANT ALL ON TABLE public.express_purchase_orders TO anon;
GRANT ALL ON TABLE public.express_purchase_orders TO authenticated;
