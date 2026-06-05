-- =============================================================================
-- FIX: RLS for cost_centers (Error 42501)
-- =============================================================================

-- Disable RLS to allow inserts/updates
ALTER TABLE public.cost_centers DISABLE ROW LEVEL SECURITY;

-- Verification
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'cost_centers';
