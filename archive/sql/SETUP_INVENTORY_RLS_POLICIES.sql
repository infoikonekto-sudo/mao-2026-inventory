-- Script para configurar políticas RLS en tablas de inventario
-- Ejecutar esto en Supabase SQL Editor

-- ===============================
-- 1. INVENTORY_IMPORTS - Políticas RLS Permisivas
-- ===============================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Allow authenticated inserts" ON inventory_imports;
DROP POLICY IF EXISTS "Allow authenticated reads" ON inventory_imports;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON inventory_imports;
DROP POLICY IF EXISTS "Allow all inserts" ON inventory_imports;

-- Crear política permisiva para SELECT (lectura)
CREATE POLICY "Allow all reads on inventory_imports"
ON inventory_imports FOR SELECT
USING (true);

-- Crear política permisiva para INSERT
CREATE POLICY "Allow all inserts on inventory_imports"
ON inventory_imports FOR INSERT
WITH CHECK (true);

-- Crear política permisiva para UPDATE
CREATE POLICY "Allow all updates on inventory_imports"
ON inventory_imports FOR UPDATE
USING (true)
WITH CHECK (true);

-- Crear política permisiva para DELETE
CREATE POLICY "Allow all deletes on inventory_imports"
ON inventory_imports FOR DELETE
USING (true);

-- ===============================
-- 2. INVENTORY_COLUMN_MAPPINGS - Políticas RLS Permisivas
-- ===============================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Allow authenticated inserts" ON inventory_column_mappings;
DROP POLICY IF EXISTS "Allow authenticated reads" ON inventory_column_mappings;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON inventory_column_mappings;
DROP POLICY IF EXISTS "Allow all inserts" ON inventory_column_mappings;

-- Crear política permisiva para SELECT
CREATE POLICY "Allow all reads on inventory_column_mappings"
ON inventory_column_mappings FOR SELECT
USING (true);

-- Crear política permisiva para INSERT
CREATE POLICY "Allow all inserts on inventory_column_mappings"
ON inventory_column_mappings FOR INSERT
WITH CHECK (true);

-- Crear política permisiva para UPDATE
CREATE POLICY "Allow all updates on inventory_column_mappings"
ON inventory_column_mappings FOR UPDATE
USING (true)
WITH CHECK (true);

-- Crear política permisiva para DELETE
CREATE POLICY "Allow all deletes on inventory_column_mappings"
ON inventory_column_mappings FOR DELETE
USING (true);

-- ===============================
-- 3. INVENTORY_ITEMS - Políticas RLS Permisivas
-- ===============================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Allow authenticated inserts" ON inventory_items;
DROP POLICY IF EXISTS "Allow authenticated reads" ON inventory_items;
DROP POLICY IF EXISTS "Allow authenticated updates" ON inventory_items;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON inventory_items;
DROP POLICY IF EXISTS "Allow all inserts" ON inventory_items;

-- Crear política permisiva para SELECT
CREATE POLICY "Allow all reads on inventory_items"
ON inventory_items FOR SELECT
USING (true);

-- Crear política permisiva para INSERT
CREATE POLICY "Allow all inserts on inventory_items"
ON inventory_items FOR INSERT
WITH CHECK (true);

-- Crear política permisiva para UPDATE
CREATE POLICY "Allow all updates on inventory_items"
ON inventory_items FOR UPDATE
USING (true)
WITH CHECK (true);

-- Crear política permisiva para DELETE
CREATE POLICY "Allow all deletes on inventory_items"
ON inventory_items FOR DELETE
USING (true);

-- ===============================
-- 4. VERIFICACIÓN
-- ===============================

-- Verificar que las políticas fueron creadas
SELECT 
  tablename, 
  COUNT(*) as num_policies
FROM pg_policies 
WHERE tablename IN ('inventory_imports', 'inventory_column_mappings', 'inventory_items')
GROUP BY tablename
ORDER BY tablename;

-- Ver todas las políticas por tabla
SELECT 
  tablename,
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE tablename IN ('inventory_imports', 'inventory_column_mappings', 'inventory_items')
ORDER BY tablename, policyname;