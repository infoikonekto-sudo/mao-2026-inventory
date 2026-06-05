-- ============================================================
-- SCRIPT ACTUALIZADO 1: CREAR TABLA inventory_movements
-- Adaptado a tu estructura real con license_id
-- ============================================================

-- 1. CREAR TABLA inventory_movements
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  
  -- Tipo de movimiento
  movement_type VARCHAR(50) NOT NULL,
  -- Valores: 'purchase_in', 'requisition_out', 'adjustment', 'return', 'transfer'
  
  -- Cantidad movida (positiva=entrada, negativa=salida)
  quantity INTEGER NOT NULL,
  
  -- Referencia al documento que generó el movimiento
  reference_type VARCHAR(50),
  -- Valores: 'purchase_order', 'requisition', 'manual', 'adjustment'
  
  reference_id UUID,
  reference_number VARCHAR(100),
  
  -- Información adicional
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_inventory_movements_license_id 
  ON inventory_movements(license_id);
  
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id 
  ON inventory_movements(inventory_item_id);
  
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference 
  ON inventory_movements(reference_type, reference_id);
  
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at 
  ON inventory_movements(created_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type 
  ON inventory_movements(movement_type);
  
CREATE INDEX IF NOT EXISTS idx_movements_item_license 
  ON inventory_movements(inventory_item_id, license_id);

-- 3. HABILITAR ROW LEVEL SECURITY
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- 4. CREAR POLICIES DE RLS
CREATE POLICY "Users can view movements from their license"
  ON inventory_movements
  FOR SELECT
  USING (
    license_id IN (
      SELECT license_id FROM users 
      WHERE auth.uid() = users.id
    )
  );

CREATE POLICY "Users can insert movements"
  ON inventory_movements
  FOR INSERT
  WITH CHECK (
    license_id IN (
      SELECT license_id FROM users 
      WHERE auth.uid() = users.id
    )
  );

CREATE POLICY "Users can update movements"
  ON inventory_movements
  FOR UPDATE
  USING (
    license_id IN (
      SELECT license_id FROM users 
      WHERE auth.uid() = users.id
    )
  );

-- 5. GRANT PERMISSIONS
GRANT SELECT ON inventory_movements TO authenticated;
GRANT INSERT ON inventory_movements TO authenticated;
GRANT UPDATE ON inventory_movements TO authenticated;

-- ============================================================
-- CONFIRMACIÓN
-- ============================================================
SELECT 
  'TABLA CREADA' as estado,
  'inventory_movements' as tabla,
  'Movimientos de inventario' as descripcion,
  NOW() as timestamp;
