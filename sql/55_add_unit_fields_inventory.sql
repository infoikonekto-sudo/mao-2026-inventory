-- Add unit_of_measure and units_per_package to inventory_items table
-- Allows tracking what unit each item is stored as and how many individual units per package

-- Step 1: Add unit_of_measure column (unidades, cajas, paquetes, bolsas, libras, etc.)
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'unidades';

-- Step 2: Add units_per_package column (how many individual units per package/caja/bolsa)
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS units_per_package NUMERIC(15,3) DEFAULT 1;

COMMENT ON COLUMN public.inventory_items.unit_of_measure
IS 'Unit type for this inventory item: unidades, cajas, paquetes, bolsas, libras, kilogramos, etc.';

COMMENT ON COLUMN public.inventory_items.units_per_package
IS 'Individual units inside each package/caja/bolsa. Default 1 for simple units. E.g. 24 lapiceros por caja.';

-- Grant permissions
GRANT ALL ON TABLE public.inventory_items TO anon;
GRANT ALL ON TABLE public.inventory_items TO authenticated;
