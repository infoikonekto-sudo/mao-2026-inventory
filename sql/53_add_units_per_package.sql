-- ============================================================
-- MIGRACIÓN 53: AGREGAR COLUMNA units_per_package A EXPRESS ITEMS
-- ============================================================
-- Cuando la unidad es Caja, Paquete, etc. el usuario puede indicar
-- cuántas unidades trae cada caja/paquete para calcular el precio
-- por unidad correctamente.
-- ============================================================

ALTER TABLE public.express_order_items
ADD COLUMN IF NOT EXISTS units_per_package NUMERIC(15,3) DEFAULT 1;

COMMENT ON COLUMN public.express_order_items.units_per_package
IS 'Unidades por caja/paquete. Ej: si una caja trae 24 unidades, aquí va 24.';
