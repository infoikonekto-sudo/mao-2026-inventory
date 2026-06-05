-- ============================================================
-- FIX: SCHEMA CACHE & MISSING COLUMN
-- ============================================================

-- 1. Asegurar que la columna existe (Re-verificación)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cost_centers' AND column_name = 'budget_id'
    ) THEN
        ALTER TABLE public.cost_centers ADD COLUMN budget_id UUID REFERENCES public.budgets(id);
        CREATE INDEX IF NOT EXISTS idx_cost_centers_budget_id ON public.cost_centers(budget_id);
    END IF;
END $$;

-- 2. Forzar recarga de la caché de Supabase/PostgREST
-- Esto es necesario cuando se agregan columnas y la API no las ve inmediatamente.
NOTIFY pgrst, 'reload config';
