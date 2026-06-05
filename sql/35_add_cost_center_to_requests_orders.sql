-- =====================================================================
-- AUTOMATE COST CENTER LINKAGE (Requests -> Orders)
-- =====================================================================

-- 1. Add cost_center_id to PURCHASE REQUESTS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='purchase_requests' AND column_name='cost_center_id'
    ) THEN
        ALTER TABLE public.purchase_requests ADD COLUMN cost_center_id UUID REFERENCES public.cost_centers(id);
    END IF;
END $$;

-- 2. Add cost_center_id to PURCHASE ORDERS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='purchase_orders' AND column_name='cost_center_id'
    ) THEN
        ALTER TABLE public.purchase_orders ADD COLUMN cost_center_id UUID REFERENCES public.cost_centers(id);
    END IF;
END $$;

-- 3. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_requests_cost_center ON public.purchase_requests(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_cost_center ON public.purchase_orders(cost_center_id);

-- 4. Enable RLS for these new columns (Inherits existing table policies, but good verifying)
-- Existing policies usually cover "all" or "select", so no extra policy needed if RLS enabled on table.

-- Verification
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'cost_center_id' AND table_name IN ('purchase_requests', 'purchase_orders');
