-- Script para agregar columnas necesarias a la tabla purchase_orders
-- Ejecutar esto en Supabase SQL Editor

-- Agregar columna invoice_url si no existe
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS invoice_url TEXT,
ADD COLUMN IF NOT EXISTS price_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Verificar que las columnas fueron creadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND (column_name = 'invoice_url' OR column_name = 'price_confirmed_at')
ORDER BY column_name;