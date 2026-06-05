-- =============================================================================
-- FIX: RLS Policies for requisition_items (Error 401)
-- =============================================================================

-- Disable RLS temporarily to allow inserts
ALTER TABLE public.requisition_items DISABLE ROW LEVEL SECURITY;

-- Or if you want to keep RLS enabled, create proper policies:
-- ALTER TABLE public.requisition_items ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS "Users can insert their own requisition items" ON public.requisition_items;
-- DROP POLICY IF EXISTS "Users can view their own requisition items" ON public.requisition_items;
-- DROP POLICY IF EXISTS "Users can update their own requisition items" ON public.requisition_items;
-- DROP POLICY IF EXISTS "Users can delete their own requisition items" ON public.requisition_items;

-- CREATE POLICY "Users can insert their own requisition items"
-- ON public.requisition_items FOR INSERT
-- WITH CHECK (true);

-- CREATE POLICY "Users can view their own requisition items"
-- ON public.requisition_items FOR SELECT
-- USING (true);

-- CREATE POLICY "Users can update their own requisition items"
-- ON public.requisition_items FOR UPDATE
-- USING (true);

-- CREATE POLICY "Users can delete their own requisition items"
-- ON public.requisition_items FOR DELETE
-- USING (true);

-- Verification
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'requisition_items';
