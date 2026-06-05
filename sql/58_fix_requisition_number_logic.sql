-- =============================================================================
-- FIX: get_next_requisition_number
-- Generates the next requisition number using MAX() instead of COUNT()
-- to prevent collisions when records are deleted or sequences have gaps.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_next_requisition_number(p_license_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year TEXT;
  v_prefix TEXT;
  v_last_number TEXT;
  v_last_num_int INTEGER;
  v_next_num_int INTEGER;
  v_next_number TEXT;
BEGIN
  -- 1. Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_prefix := 'REQ-' || v_year || '-';
  
  -- 2. Find the highest existing requisition number for this year and license
  -- Using substring to extract the numeric part (everything after REQ-YYYY-)
  -- Format is REQ-2026-0001 (14 characters total, suffix starts at 10)
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
      v_last_num_int := (substring(v_last_number from 10))::INTEGER;
      v_next_num_int := v_last_num_int + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Fallback if parsing fails for some reason
      v_next_num_int := 1;
    END;
  END IF;
  
  -- 4. Format the number: REQ-2026-0001
  v_next_number := v_prefix || LPAD(v_next_num_int::TEXT, 4, '0');
  
  RETURN v_next_number;
END;
$$;

-- Ensure execution permissions
GRANT EXECUTE ON FUNCTION public.get_next_requisition_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_requisition_number(UUID) TO anon;
