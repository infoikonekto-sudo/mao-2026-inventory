
-- Recalculate budget_spent for ALL cost centers based on Purchase Orders
-- This fixes any drift caused by missed updates or legacy data

WITH calculated_spend AS (
  SELECT 
    cost_center_id, 
    SUM(total_amount) as actual_spent
  FROM purchase_orders
  WHERE 
    cost_center_id IS NOT NULL 
    AND total_amount > 0 
    AND status NOT IN ('rechazada', 'cancelada') -- Exclude cancelled/rejected
  GROUP BY cost_center_id
)
UPDATE cost_centers cc
SET budget_spent = COALESCE(cs.actual_spent, 0)
FROM calculated_spend cs
WHERE cc.id = cs.cost_center_id;

-- Also set budget_spent to 0 for those with NO orders
UPDATE cost_centers
SET budget_spent = 0
WHERE id NOT IN (SELECT DISTINCT cost_center_id FROM purchase_orders WHERE cost_center_id IS NOT NULL AND total_amount > 0 AND status NOT IN ('rechazada', 'cancelada'));
