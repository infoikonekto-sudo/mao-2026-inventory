-- 72_soft_delete_inventory.sql

-- 1. Añadir columna is_active
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Crear índice para optimizar filtrado
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_active ON inventory_items(is_active) WHERE is_active = true;

-- 3. Nota: No eliminamos items físicamente, ahora usaremos is_active = false
COMMENT ON COLUMN inventory_items.is_active IS 'Flag para borrado lógico (Soft Delete)';
