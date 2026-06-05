-- Script para agregar columnas faltantes a la tabla inventory_items
-- Ejecutar esto en Supabase SQL Editor

-- Agregar columnas si no existen
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS code VARCHAR UNIQUE,
ADD COLUMN IF NOT EXISTS sku VARCHAR,
ADD COLUMN IF NOT EXISTS name VARCHAR NOT NULL,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR,
ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit VARCHAR,
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC,
ADD COLUMN IF NOT EXISTS location VARCHAR,
ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reorder_level NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_imported TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS import_reference VARCHAR;

-- Verificar que las columnas fueron creadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory_items'
ORDER BY ordinal_position;