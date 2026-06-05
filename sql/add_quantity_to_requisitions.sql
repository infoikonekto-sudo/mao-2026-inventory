-- ============================================================
-- Agregar campo "quantity" a la tabla requisitions
-- ============================================================

-- Agregar columna quantity (opcional)
ALTER TABLE IF EXISTS public.requisitions 
ADD COLUMN IF NOT EXISTS quantity INTEGER;

-- Agregar comentario descriptivo
COMMENT ON COLUMN public.requisitions.quantity IS 'Cantidad del material solicitado (opcional)';

-- Crear índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_requisitions_quantity ON public.requisitions(quantity);
