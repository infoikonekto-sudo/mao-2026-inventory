-- =============================================================================
-- FIX: get_next_requisition_number (MENSUAL)
-- Genera el número de requisición con el formato REQ-YYYYMM-XXXX.
-- Esto permite reiniciar el correlativo a 0001 automáticamente cada inicio de mes,
-- evitando colisiones de UNIQUE CONSTRAINT con meses anteriores.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_next_requisition_number(p_license_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year_month TEXT;
  v_prefix TEXT;
  v_last_number TEXT;
  v_last_num_int INTEGER;
  v_next_num_int INTEGER;
  v_next_number TEXT;
BEGIN
  -- 1. Get current year and month (YYYYMM)
  v_year_month := TO_CHAR(NOW(), 'YYYYMM');
  v_prefix := 'REQ-' || v_year_month || '-';
  
  -- 2. Find the highest existing requisition number for this month and license
  -- Using substring to extract the numeric part (everything after REQ-YYYYMM-)
  -- Format is REQ-202606-0001 (16 characters total, suffix starts at 12)
  SELECT requisition_number INTO v_last_number
  FROM public.requisitions
  WHERE license_id = p_license_id
    AND requisition_number LIKE v_prefix || '%'
  ORDER BY requisition_number DESC
  LIMIT 1;
  
  -- 3. Determine next sequence number
  IF v_last_number IS NULL THEN
    v_next_num_int := 1;
  ELSE
    -- Extract numeric part (0001 -> 1)
    BEGIN
      v_last_num_int := (substring(v_last_number from 12))::INTEGER;
      v_next_num_int := v_last_num_int + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Fallback if parsing fails for some reason
      v_next_num_int := 1;
    END;
  END IF;
  
  -- 4. Format the number: REQ-202606-0001
  v_next_number := v_prefix || LPAD(v_next_num_int::TEXT, 4, '0');
  
  RETURN v_next_number;
END;
$$;

-- Ensure execution permissions
GRANT EXECUTE ON FUNCTION public.get_next_requisition_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_requisition_number(UUID) TO anon;
