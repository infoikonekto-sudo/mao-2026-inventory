-- Add unit field to requisition_items table
-- This allows users to specify custom units of measure (caja, unidad, paquete, etc.)

ALTER TABLE requisition_items
ADD COLUMN IF NOT EXISTS unit TEXT;

COMMENT ON COLUMN requisition_items.unit IS 'Custom unit of measure (e.g., caja, unidad, paquete, litro)';

-- Set default value for existing records
UPDATE requisition_items
SET unit = 'unidad'
WHERE unit IS NULL;
