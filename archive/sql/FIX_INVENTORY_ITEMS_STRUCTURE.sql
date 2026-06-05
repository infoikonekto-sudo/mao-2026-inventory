-- Script para verificar y corregir la estructura de inventory_items
-- Ejecutar esto en Supabase SQL Editor

-- PASO 1: Ver la estructura actual ANTES
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inventory_items'
ORDER BY ordinal_position;

-- PASO 2: Hacer item_code nullable
ALTER TABLE inventory_items
ALTER COLUMN item_code DROP NOT NULL;

-- PASO 3: Agregar todas las columnas necesarias
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS code VARCHAR,
ADD COLUMN IF NOT EXISTS sku VARCHAR,
ADD COLUMN IF NOT EXISTS name VARCHAR,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR,
ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS minimum_stock NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit VARCHAR,
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC,
ADD COLUMN IF NOT EXISTS location VARCHAR,
ADD COLUMN IF NOT EXISTS last_imported TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS import_reference VARCHAR;

-- PASO 4: Copiar valores de item_code a code si existen
UPDATE inventory_items 
SET code = item_code 
WHERE code IS NULL AND item_code IS NOT NULL;

-- PASO 5: Ver estructura DESPUÉS
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory_items'
ORDER BY ordinal_position;