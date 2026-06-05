-- Script para crear tabla de historial de exportaciones de reportes

CREATE TABLE IF NOT EXISTS report_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('requisitions', 'requests', 'orders', 'inventory')),
  format TEXT NOT NULL CHECK (format IN ('PDF', 'XLSX', 'CSV')),
  exported_by UUID REFERENCES users(id),
  exported_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_report_exports_license_id ON report_exports(license_id);
CREATE INDEX idx_report_exports_exported_at ON report_exports(exported_at);
CREATE INDEX idx_report_exports_type ON report_exports(report_type);

-- RLS (Row Level Security)
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exports from their license"
  ON report_exports
  FOR SELECT
  USING (
    license_id IN (
      SELECT license_id FROM users WHERE auth.uid() = users.id
    )
  );

CREATE POLICY "Users can insert export records"
  ON report_exports
  FOR INSERT
  WITH CHECK (
    license_id IN (
      SELECT license_id FROM users WHERE auth.uid() = users.id
    )
  );
