-- ============================================================
-- CREAR TABLA DE PRESUPUESTOS
-- Para que finanzas pueda asignar presupuesto a compras
-- ============================================================

-- 1. CREAR TABLA budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  
  -- Información del presupuesto
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Montos
  total_amount DECIMAL(12, 2) NOT NULL,
  spent_amount DECIMAL(12, 2) DEFAULT 0,
  remaining_amount DECIMAL(12, 2) NOT NULL,
  
  -- Periodo
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Estado
  status VARCHAR(50) DEFAULT 'active',
  -- Valores: 'active', 'completed', 'paused'
  
  -- Categorías opcionales
  category VARCHAR(100),
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_budgets_license_id 
  ON budgets(license_id);
  
CREATE INDEX IF NOT EXISTS idx_budgets_status 
  ON budgets(status);
  
CREATE INDEX IF NOT EXISTS idx_budgets_dates 
  ON budgets(start_date, end_date);
  
CREATE INDEX IF NOT EXISTS idx_budgets_category 
  ON budgets(category);

-- 3. HABILITAR RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- 4. CREAR POLICIES
CREATE POLICY "Users can view budgets from their license"
  ON budgets
  FOR SELECT
  USING (
    license_id IN (
      SELECT license_id FROM users 
      WHERE auth.uid() = users.id
    )
  );

CREATE POLICY "Users can create budgets"
  ON budgets
  FOR INSERT
  WITH CHECK (
    license_id IN (
      SELECT license_id FROM users 
      WHERE auth.uid() = users.id
    )
  );

CREATE POLICY "Users can update budgets"
  ON budgets
  FOR UPDATE
  USING (
    license_id IN (
      SELECT license_id FROM users 
      WHERE auth.uid() = users.id
    )
  );

-- 5. GRANTS
GRANT SELECT ON budgets TO authenticated;
GRANT INSERT ON budgets TO authenticated;
GRANT UPDATE ON budgets TO authenticated;

-- 6. CREAR TABLA DE AUDITORÍA DE PRESUPUESTO
CREATE TABLE IF NOT EXISTS budget_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  
  -- Tipo de movimiento
  movement_type VARCHAR(50) NOT NULL,
  -- Valores: 'purchase_order', 'adjustment', 'refund'
  
  -- Monto
  amount DECIMAL(12, 2) NOT NULL,
  
  -- Referencia
  reference_type VARCHAR(50),
  reference_id UUID,
  reference_number VARCHAR(100),
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ÍNDICES PARA budget_movements
CREATE INDEX IF NOT EXISTS idx_budget_movements_budget_id 
  ON budget_movements(budget_id);
  
CREATE INDEX IF NOT EXISTS idx_budget_movements_license_id 
  ON budget_movements(license_id);
  
CREATE INDEX IF NOT EXISTS idx_budget_movements_created_at 
  ON budget_movements(created_at DESC);

-- 8. HABILITAR RLS EN budget_movements
ALTER TABLE budget_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budget movements from their license"
  ON budget_movements
  FOR SELECT
  USING (
    license_id IN (
      SELECT license_id FROM users 
      WHERE auth.uid() = users.id
    )
  );

CREATE POLICY "Users can create budget movements"
  ON budget_movements
  FOR INSERT
  WITH CHECK (
    license_id IN (
      SELECT license_id FROM users 
      WHERE auth.uid() = users.id
    )
  );

-- 9. GRANTS
GRANT SELECT ON budget_movements TO authenticated;
GRANT INSERT ON budget_movements TO authenticated;

-- ============================================================
-- CONFIRMACIÓN
-- ============================================================
SELECT 
  'TABLAS DE PRESUPUESTO CREADAS' as estado,
  'budgets' as tabla1,
  'budget_movements' as tabla2,
  NOW() as timestamp;
