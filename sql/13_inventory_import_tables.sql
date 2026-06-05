-- Tabla para historial de importaciones de inventario
CREATE TABLE IF NOT EXISTS inventory_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  imported_by UUID REFERENCES users(id),
  filename TEXT NOT NULL,
  total_rows INTEGER,
  success_rows INTEGER,
  error_rows INTEGER,
  status TEXT CHECK (status IN ('pendiente', 'en_progreso', 'completada', 'fallida')),
  error_report JSONB,
  mapping_used JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  can_undo BOOLEAN DEFAULT true,
  undo_data JSONB
);

-- Tabla para mapeos personalizados guardados
CREATE TABLE IF NOT EXISTS inventory_column_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  mapping_name TEXT NOT NULL,
  mapping_config JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para errores de importación detallados
CREATE TABLE IF NOT EXISTS inventory_import_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_id UUID NOT NULL REFERENCES inventory_imports(id) ON DELETE CASCADE,
  row_number INTEGER,
  error_message TEXT,
  error_type TEXT,
  row_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_inventory_imports_license_id ON inventory_imports(license_id);
CREATE INDEX idx_inventory_imports_created_at ON inventory_imports(created_at);
CREATE INDEX idx_inventory_imports_status ON inventory_imports(status);
CREATE INDEX idx_inventory_column_mappings_license_id ON inventory_column_mappings(license_id);
CREATE INDEX idx_inventory_import_errors_import_id ON inventory_import_errors(import_id);

-- RLS (Row Level Security)
ALTER TABLE inventory_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_column_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_import_errors ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para inventory_imports
CREATE POLICY "Users can view imports from their license"
  ON inventory_imports
  FOR SELECT
  USING (
    license_id IN (
      SELECT license_id FROM users WHERE auth.uid() = users.id
    )
  );

CREATE POLICY "Users can insert import records"
  ON inventory_imports
  FOR INSERT
  WITH CHECK (
    license_id IN (
      SELECT license_id FROM users WHERE auth.uid() = users.id
    )
  );

CREATE POLICY "Users can update import records"
  ON inventory_imports
  FOR UPDATE
  USING (
    license_id IN (
      SELECT license_id FROM users WHERE auth.uid() = users.id
    )
  );

-- Políticas RLS para column_mappings
CREATE POLICY "Users can view mappings from their license"
  ON inventory_column_mappings
  FOR SELECT
  USING (
    license_id IN (
      SELECT license_id FROM users WHERE auth.uid() = users.id
    )
  );

CREATE POLICY "Users can create mappings"
  ON inventory_column_mappings
  FOR INSERT
  WITH CHECK (
    license_id IN (
      SELECT license_id FROM users WHERE auth.uid() = users.id
    )
  );

-- Políticas RLS para import_errors
CREATE POLICY "Users can view errors from their imports"
  ON inventory_import_errors
  FOR SELECT
  USING (
    import_id IN (
      SELECT id FROM inventory_imports WHERE license_id IN (
        SELECT license_id FROM users WHERE auth.uid() = users.id
      )
    )
  );

CREATE POLICY "Users can create error records"
  ON inventory_import_errors
  FOR INSERT
  WITH CHECK (
    import_id IN (
      SELECT id FROM inventory_imports WHERE license_id IN (
        SELECT license_id FROM users WHERE auth.uid() = users.id
      )
    )
  );
