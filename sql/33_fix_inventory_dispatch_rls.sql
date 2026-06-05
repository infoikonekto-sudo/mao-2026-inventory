-- =====================================================================
-- Fix Inventory RLS Policy for Dispatch
-- Allows jefe_compras to update inventory_items when dispatching requisitions
-- =====================================================================

-- Drop existing restrictive update policy if exists
DROP POLICY IF EXISTS "inventory_update_admin_only" ON public.inventory_items;

-- Drop policy if it already exists to avoid errors on re-run
DROP POLICY IF EXISTS "inventory_update_jefe_admin" ON public.inventory_items;

-- Create new policy allowing jefe_compras and admin to update inventory
CREATE POLICY "inventory_update_jefe_admin"
ON public.inventory_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.license_id = inventory_items.license_id
    AND users.role IN ('admin', 'jefe_compras')
    AND users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.license_id = inventory_items.license_id
    AND users.role IN ('admin', 'jefe_compras')
    AND users.is_active = true
  )
);

-- Verify policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'inventory_items' AND cmd = 'UPDATE';
