-- =====================================================================
-- LINK COST CENTERS TO BUDGETS (Financial Hierarchy)
-- =====================================================================

-- 1. Add budget_id column to cost_centers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='cost_centers' AND column_name='budget_id'
    ) THEN
        ALTER TABLE public.cost_centers ADD COLUMN budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Create index on budget_id for performance
CREATE INDEX IF NOT EXISTS idx_cost_centers_budget ON public.cost_centers(budget_id);

-- 3. Trigger/Logic (Optional in SQL, implemented in APP first)
-- We will enforce the logic in the application layer first:
-- - Assigning a Cost Center to a Budget validates capability.
-- - Spending on a Cost Center updates Cost Center AND checks Budget via App logic.

-- Verifiication Query
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cost_centers' AND column_name = 'budget_id';
