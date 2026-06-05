-- ============================================================
-- REQUISITIONS ENHANCEMENT: COST CENTERS & MULTI-ITEM SUPPORT
-- ============================================================

-- 1. CREATE COST CENTERS TABLE
CREATE TABLE IF NOT EXISTS public.cost_centers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    budget_allocated NUMERIC DEFAULT 0,
    budget_spent NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(license_id, code)
);

-- Índices para cost_centers
CREATE INDEX IF NOT EXISTS idx_cost_centers_license ON public.cost_centers(license_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_active ON public.cost_centers(is_active) WHERE is_active = true;

-- RLS para cost_centers
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cost_centers_view_all" ON public.cost_centers;
CREATE POLICY "cost_centers_view_all" ON public.cost_centers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.license_id = cost_centers.license_id
        )
    );

DROP POLICY IF EXISTS "cost_centers_manage_finance" ON public.cost_centers;
CREATE POLICY "cost_centers_manage_finance" ON public.cost_centers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.license_id = cost_centers.license_id
            AND u.role IN ('finanzas', 'admin', 'super_admin')
        )
    );

-- 2. CREATE REQUISITION ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.requisition_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requisition_id UUID NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES public.inventory_items(id),
    item_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit_of_measure TEXT NOT NULL,
    estimated_unit_cost NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para requisition_items
CREATE INDEX IF NOT EXISTS idx_requisition_items_requisition ON public.requisition_items(requisition_id);
CREATE INDEX IF NOT EXISTS idx_requisition_items_inventory ON public.requisition_items(inventory_item_id);

-- RLS para requisition_items (hereda permisos de requisitions)
ALTER TABLE public.requisition_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requisition_items_view" ON public.requisition_items;
CREATE POLICY "requisition_items_view" ON public.requisition_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.requisitions r
            JOIN public.users u ON u.license_id = r.license_id
            WHERE r.id = requisition_items.requisition_id
            AND u.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "requisition_items_manage" ON public.requisition_items;
CREATE POLICY "requisition_items_manage" ON public.requisition_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.requisitions r
            JOIN public.users u ON u.license_id = r.license_id
            WHERE r.id = requisition_items.requisition_id
            AND u.id = auth.uid()
            AND (u.role IN ('admin', 'super_admin', 'jefe_compras') OR r.user_id = u.id)
        )
    );

-- 3. ADD COST CENTER FIELDS TO REQUISITIONS
DO $$
BEGIN
    -- Add cost_center_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='requisitions' AND column_name='cost_center_id'
    ) THEN
        ALTER TABLE public.requisitions ADD COLUMN cost_center_id UUID REFERENCES public.cost_centers(id);
    END IF;

    -- Add cost_center_code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='requisitions' AND column_name='cost_center_code'
    ) THEN
        ALTER TABLE public.requisitions ADD COLUMN cost_center_code TEXT;
    END IF;

    -- Add cost_center_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='requisitions' AND column_name='cost_center_name'
    ) THEN
        ALTER TABLE public.requisitions ADD COLUMN cost_center_name TEXT;
    END IF;
END $$;

-- Índice para búsquedas por centro de costo
CREATE INDEX IF NOT EXISTS idx_requisitions_cost_center ON public.requisitions(cost_center_id);

-- 4. INSERT DEFAULT COST CENTERS (for existing licenses)
-- Insertar centros de costo predeterminados para cada licencia existente
INSERT INTO public.cost_centers (license_id, code, name, description, budget_allocated, is_active)
SELECT 
    l.id,
    'GENERAL',
    'Centro de Costo General',
    'Centro de costo por defecto para gastos generales',
    0,
    true
FROM public.licenses l
WHERE NOT EXISTS (
    SELECT 1 FROM public.cost_centers cc 
    WHERE cc.license_id = l.id AND cc.code = 'GENERAL'
);

-- 5. GRANT PERMISSIONS
GRANT ALL ON TABLE public.cost_centers TO authenticated;
GRANT ALL ON TABLE public.requisition_items TO authenticated;
