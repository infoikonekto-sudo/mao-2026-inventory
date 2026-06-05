-- Add units_per_package to requisition_items table
-- Same logic as express_order_items: tracks how many individual units are inside each caja/paquete

ALTER TABLE public.requisition_items
ADD COLUMN IF NOT EXISTS units_per_package NUMERIC(15,3) DEFAULT 1;

COMMENT ON COLUMN public.requisition_items.units_per_package
IS 'Number of individual units inside each caja, paquete, or docena. Default 1 for unidades.';

-- Grant permissions
GRANT ALL ON TABLE public.requisition_items TO anon;
GRANT ALL ON TABLE public.requisition_items TO authenticated;
