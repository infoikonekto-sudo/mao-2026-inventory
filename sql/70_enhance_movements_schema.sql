-- ============================================================
-- MEJORA DE TRAZABILIDAD: JUSTIFICACIÓN Y PROPÓSITO
-- ============================================================

-- 1) Agregar columnas a inventory_movements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='justification'
  ) THEN
    ALTER TABLE public.inventory_movements ADD COLUMN justification text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='purpose'
  ) THEN
    ALTER TABLE public.inventory_movements ADD COLUMN purpose text;
  END IF;
END $$;

-- 2) Actualizar la vista de detalles para incluir los nuevos campos
DROP VIEW IF EXISTS public.vw_inventory_movements_detail CASCADE;
CREATE OR REPLACE VIEW public.vw_inventory_movements_detail AS
SELECT 
  im.id,
  im.license_id,
  im.item_id,
  im.item_code,
  im.change,
  im.type,
  im.related_type,
  im.related_id,
  im.user_id,
  im.notes,
  im.justification,
  im.purpose,
  im.created_at,
  -- Información del Item (JOIN para facilidad en el frontend)
  ii.name as item_name,
  ii.barcode as item_barcode,
  -- Información del Usuario
  u.full_name as user_name,
  -- Información de referencia estructurada
  CASE 
    WHEN im.related_type = 'requisition' THEN 'Requisición'
    WHEN im.related_type = 'purchase_order' THEN 'Orden de Compra'
    WHEN im.related_type = 'requisition_reversal' THEN 'Reversión'
    WHEN im.related_type = 'manual_adjustment' THEN 'Ajuste Manual'
    WHEN im.related_type = 'inventory_edit' THEN 'Edición de Inventario'
    ELSE COALESCE(im.related_type, 'Manual')
  END as related_type_label
FROM public.inventory_movements im
LEFT JOIN public.inventory_items ii ON im.item_id = ii.id
LEFT JOIN public.users u ON im.user_id = u.id
ORDER BY im.created_at DESC;

-- 3) Otorgar permisos (asegurar acceso para roles estándar)
GRANT SELECT ON public.vw_inventory_movements_detail TO authenticated;
GRANT SELECT ON public.vw_inventory_movements_detail TO anon;
GRANT SELECT ON public.vw_inventory_movements_detail TO service_role;
