-- 1. Create departments table (Áreas)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    budget_limit DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'activo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Policies for departments
CREATE POLICY "Users can view departments from their license" 
ON public.departments FOR SELECT 
USING (license_id IN (SELECT license_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage departments" 
ON public.departments FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND license_id = departments.license_id 
        AND role IN ('superadmin', 'admin', 'jefe_compras', 'gerente')
    )
);

-- 2. Add department_id to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 3. Add department_id to cost_centers
ALTER TABLE public.cost_centers ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 4. Add department_id to requisitions
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 5. Add department_id to purchase_requests
ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 6. Add department_id to inventory_movements (for tracking express deliveries by area)
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 7. Insert the default areas specified by the user for the current license
-- (We will assume there is only 1 license or we insert for all active licenses just to be safe)
DO $$
DECLARE
    lic RECORD;
    areas TEXT[] := ARRAY[
        'Recepción', 'Garita', 'Transportes', 'Admisiones', 'Recursos Humanos',
        'Pre Primaria', 'Secundaria Primaria', 'Superior Primaria', 'Elemental',
        'PAE Primaria', 'PAE Secundaria', 'Emociones Primaria', 'Emociones Secundaria',
        'Cafetería', 'Administración', 'Club MAO', 'Enfermería', 'Homeschool',
        'Contabilidad', 'Compras'
    ];
    area TEXT;
BEGIN
    FOR lic IN SELECT id FROM public.licenses LOOP
        FOREACH area IN ARRAY areas LOOP
            INSERT INTO public.departments (license_id, name, status)
            VALUES (lic.id, area, 'activo')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
