DROP VIEW IF EXISTS public.vw_inventory_movements_detail CASCADE;
CREATE OR REPLACE VIEW public.vw_inventory_movements_detail AS
SELECT 
  im.id,
  im.license_id,
  COALESCE(im.item_id, im.inventory_item_id) as item_id,
  im.item_code,
  COALESCE(im.change, im.quantity) as change,
  COALESCE(im.type, im.movement_type) as type,
  COALESCE(im.related_type, im.reference_type) as related_type,
  COALESCE(im.related_id, im.reference_id) as related_id,
  COALESCE(im.user_id, im.created_by) as user_id,
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
    WHEN COALESCE(im.related_type, im.reference_type) = 'requisition' THEN 'Requisición'
    WHEN COALESCE(im.related_type, im.reference_type) = 'purchase_order' THEN 'Orden de Compra'
    WHEN COALESCE(im.related_type, im.reference_type) = 'requisition_reversal' THEN 'Reversión'
    WHEN COALESCE(im.related_type, im.reference_type) = 'manual_adjustment' THEN 'Ajuste Manual'
    WHEN COALESCE(im.related_type, im.reference_type) = 'inventory_edit' THEN 'Edición de Inventario'
    WHEN COALESCE(im.related_type, im.reference_type) = 'entrega_ventanilla' THEN 'Despacho Ventanilla'
    ELSE COALESCE(im.related_type, im.reference_type, 'Manual')
  END as related_type_label
FROM public.inventory_movements im
LEFT JOIN public.inventory_items ii ON COALESCE(im.item_id, im.inventory_item_id) = ii.id
LEFT JOIN public.users u ON COALESCE(im.user_id, im.created_by) = u.id
ORDER BY im.created_at DESC;

GRANT SELECT ON public.vw_inventory_movements_detail TO authenticated;
GRANT SELECT ON public.vw_inventory_movements_detail TO anon;
GRANT SELECT ON public.vw_inventory_movements_detail TO service_role;
