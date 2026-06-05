-- ============================================================
-- MIGRACIÓN: CAMPOS ADICIONALES PARA ÓRDENES DE COMPRA
-- ============================================================

-- 1. Agregar columnas nuevas si no existen
DO $$
BEGIN
    -- Método de pago (Crédito, Contado, Transferencia, Cheque)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'payment_method') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN payment_method TEXT;
    END IF;

    -- Notas internas (Para uso administrativo, no visibles en impresión oficial necesariamente)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'internal_notes') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN internal_notes TEXT;
    END IF;

    -- Bloqueo de edición (Para evitar cambios pos-aprobación/completado)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'is_locked') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Actualizar triggers de auditoría para incluir estos campos (El trigger genérico ya debería capturarlos en NEW/OLD data, pero verificamos)
-- El trigger `log_audit_event` usa `to_jsonb(NEW)`, por lo que capturará automáticamente las nuevas columnas.

-- 3. Crear política (o asegurar) que solo Finanzas/Jefe Compras puedan tocar 'is_locked' (Opcional, por ahora se maneja en lógica de app)
