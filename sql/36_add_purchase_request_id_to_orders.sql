-- ============================================================
-- FIX: ADD MISSING COLUMN purchase_request_id
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' AND column_name = 'purchase_request_id'
    ) THEN
        ALTER TABLE public.purchase_orders 
        ADD COLUMN purchase_request_id UUID REFERENCES public.purchase_requests(id);
        
        -- Create index for performance
        CREATE INDEX idx_purchase_orders_request_id ON public.purchase_orders(purchase_request_id);
    END IF;
END $$;

-- Force schema cache reload
NOTIFY pgrst, 'reload config';
