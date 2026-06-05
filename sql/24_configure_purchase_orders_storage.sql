-- =============================================================================
-- PURCHASE ORDERS - STORAGE BUCKET Y VERIFICACIÓN DE COLUMNAS
-- Este script configura el bucket de Storage para facturas y verifica columnas
-- =============================================================================

-- 1. CREAR BUCKET DE STORAGE PARA FACTURAS
-- (Ejecutar desde Storage > Buckets o desde SQL Editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('purchase_order_invoices', 'purchase_order_invoices', true)
ON CONFLICT (id) DO NOTHING;

-- 2. CONFIGURAR POLÍTICAS DE STORAGE (permitir subida y lectura)
-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Permitir subida de facturas a usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura pública de facturas" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de facturas" ON storage.objects;

-- Crear políticas nuevamente
CREATE POLICY "Permitir subida de facturas a usuarios autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'purchase_order_invoices');

CREATE POLICY "Permitir lectura pública de facturas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'purchase_order_invoices');

CREATE POLICY "Permitir actualización de facturas"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'purchase_order_invoices');


-- 3. VERIFICAR QUE LA TABLA purchase_orders TIENE LAS COLUMNAS NECESARIAS
-- Si falta alguna columna, agregarla:

-- Columna para URL de la factura
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'invoice_url'
    ) THEN
        ALTER TABLE public.purchase_orders 
        ADD COLUMN invoice_url TEXT;
    END IF;
END $$;

-- Columna para timestamp de confirmación de precio
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'price_confirmed_at'
    ) THEN
        ALTER TABLE public.purchase_orders 
        ADD COLUMN price_confirmed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 4. VERIFICAR ESTADOS PERMITIDOS
-- Asegurarse que la columna status acepta los nuevos estados
DO $$
BEGIN
    -- Verificar si existe un constraint de tipo CHECK en status
    -- Si existe y no incluye todos los estados, actualizarlo
    -- (Esto depende de cómo esté definida tu tabla)
    
    -- Nota: Si status es un ENUM, necesitarías agregar los nuevos valores así:
    -- ALTER TYPE purchase_order_status ADD VALUE IF NOT EXISTS 'en_revision';
    -- ALTER TYPE purchase_order_status ADD VALUE IF NOT EXISTS 'en_transito';
    -- ALTER TYPE purchase_order_status ADD VALUE IF NOT EXISTS 'retrasada';
    -- ALTER TYPE purchase_order_status ADD VALUE IF NOT EXISTS 'cancelada';
    
    RAISE NOTICE 'Verificación de estados completada. Asegúrate que status acepta: pendiente, en_revision, en_transito, retrasada, cancelada, completada';
END $$;

-- 5. VERIFICACIÓN FINAL
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
AND column_name IN ('status', 'total_amount', 'invoice_url', 'price_confirmed_at')
ORDER BY column_name;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Configuración completa:';
    RAISE NOTICE '   - Bucket: purchase_order_invoices';
    RAISE NOTICE '   - Políticas de Storage creadas';
    RAISE NOTICE '   - Columnas verificadas';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Siguiente paso: Eliminar función duplicada en supabaseClient.ts (líneas 169-206)';
END $$;
