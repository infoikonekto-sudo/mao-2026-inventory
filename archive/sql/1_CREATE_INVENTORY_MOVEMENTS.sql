-- ============================================================
-- SCRIPT 1: CREAR TABLA inventory_movements
-- Ejecuta esto primero en Supabase SQL Editor
-- ============================================================

-- Crear tabla de movimientos de inventario
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  
  -- Tipo de movimiento
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'purchase_in',      
    'requisition_out',  
    'return',          
    'adjustment',      
    'transfer'         
  )),
  
  -- Cantidad (positiva=entrada, negativa=salida)
  quantity DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(12,2),
  
  -- Referencia
  reference_type TEXT,
  reference_id UUID,
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);

-- RLS Policies
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver movimientos"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear movimientos"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar movimientos"
  ON inventory_movements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON inventory_movements TO anon, authenticated;
GRANT INSERT ON inventory_movements TO authenticated;
GRANT UPDATE ON inventory_movements TO authenticated;

-- Confirmación
SELECT 'Tabla inventory_movements creada correctamente' as resultado;
