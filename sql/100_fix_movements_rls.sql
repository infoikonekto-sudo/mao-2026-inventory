ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.inventory_movements;
CREATE POLICY "Enable insert for authenticated users" 
ON public.inventory_movements FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.inventory_movements;
CREATE POLICY "Enable select for authenticated users" 
ON public.inventory_movements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for anon users" ON public.inventory_movements;
CREATE POLICY "Enable insert for anon users" 
ON public.inventory_movements FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for anon users" ON public.inventory_movements;
CREATE POLICY "Enable select for anon users" 
ON public.inventory_movements FOR SELECT TO anon USING (true);
