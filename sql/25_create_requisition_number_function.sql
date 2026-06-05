-- =============================================================================
-- FUNCIÓN: get_next_requisition_number
-- Genera el siguiente número de requisición en formato REQ-YYYY-XXXX
-- =============================================================================

-- Eliminar función existente si existe
DROP FUNCTION IF EXISTS public.get_next_requisition_number(UUID);

CREATE OR REPLACE FUNCTION public.get_next_requisition_number(p_license_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  -- Obtener el año actual
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Contar requisiciones del año actual para esta licencia
  SELECT COUNT(*) INTO v_count
  FROM public.requisitions
  WHERE license_id = p_license_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  -- Incrementar el contador
  v_count := v_count + 1;
  
  -- Formatear el número: REQ-2026-0001
  v_number := 'REQ-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
  
  RETURN v_number;
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.get_next_requisition_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_requisition_number(UUID) TO anon;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Función get_next_requisition_number creada exitosamente';
END $$;
