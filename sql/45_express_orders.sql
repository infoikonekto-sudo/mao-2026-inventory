-- 45_express_orders.sql

-- Habilitar extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLA PRINCIPAL: express_purchase_orders
-- ==========================================
CREATE TABLE IF NOT EXISTS public.express_purchase_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES public.licenses(id),
  
  -- Identificación
  order_number TEXT NOT NULL, -- EXP-2025-001
  
  -- Relaciones
  created_by UUID NOT NULL REFERENCES public.users(id),
  department TEXT,
  
  -- Estados: draft, pending_approval, approved, rejected, in_purchase, purchased, completed, cancelled
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 
    'pending_approval', 
    'approved', 
    'rejected', 
    'in_purchase', 
    'purchased', 
    'completed', 
    'cancelled'
  )),
  
  -- Montos
  estimated_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  real_total NUMERIC(15,2) DEFAULT NULL,
  difference_amount NUMERIC(15,2) DEFAULT NULL,
  difference_percentage NUMERIC(5,2) DEFAULT NULL,
  difference_justification TEXT,
  
  -- Configuración
  max_allowed_amount NUMERIC(15,2) DEFAULT 1100.00,
  
  -- Método de Pago
  payment_method TEXT CHECK (payment_method IN ('cheque', 'transferencia', 'efectivo', 'tarjeta')),
  cheque_number TEXT,
  transfer_reference TEXT,
  payment_date DATE,
  
  -- Textos
  justification TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  purchase_meeting_date DATE,
  purchase_notes TEXT,
  
  -- Control
  is_locked BOOLEAN DEFAULT FALSE,
  fully_approved_at TIMESTAMP WITH TIME ZONE,
  receipt_files TEXT[], -- Array de URLs
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_express_order_number UNIQUE (license_id, order_number)
);

-- ==========================================
-- 2. TABLA ITEMS: express_order_items
-- ==========================================
CREATE TABLE IF NOT EXISTS public.express_order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  express_order_id UUID NOT NULL REFERENCES public.express_purchase_orders(id) ON DELETE CASCADE,
  
  item_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  specifications TEXT,
  
  quantity NUMERIC(15,3) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'unidad',
  
  -- Proveedor por ítem
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT, -- En caso de no estar en catálogo o ser temporal
  
  -- Montos
  estimated_unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  estimated_subtotal NUMERIC(15,2) GENERATED ALWAYS AS (quantity * estimated_unit_price) STORED,
  
  real_unit_price NUMERIC(15,2),
  real_subtotal NUMERIC(15,2), -- Calculado en aplicación o trigger si se desea, por ahora manual
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. TABLA COTIZACIONES: express_item_quotes
-- ==========================================
CREATE TABLE IF NOT EXISTS public.express_item_quotes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  express_item_id UUID NOT NULL REFERENCES public.express_order_items(id) ON DELETE CASCADE,
  
  quote_number INTEGER NOT NULL DEFAULT 1,
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT,
  
  unit_price NUMERIC(15,2) NOT NULL,
  total_price NUMERIC(15,2) NOT NULL,
  
  delivery_time TEXT,
  payment_terms TEXT,
  warranty TEXT,
  quote_document_url TEXT,
  
  is_selected BOOLEAN DEFAULT FALSE,
  evaluation_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. MODIFICACIÓN: purchase_order_approvals
-- ==========================================
-- Si la columna ya existe, esto no fallará. Si no, la crea.
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_order_approvals' AND column_name = 'express_order_id') THEN
    ALTER TABLE public.purchase_order_approvals 
    ADD COLUMN express_order_id UUID REFERENCES public.express_purchase_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Constraint check (uno u otro, no ambos)
-- Nota: esto puede requerir borrar constraint previo si existía con otro nombre
-- ALTER TABLE public.purchase_order_approvals DROP CONSTRAINT IF EXISTS check_order_type;
-- ALTER TABLE public.purchase_order_approvals 
-- ADD CONSTRAINT check_order_type CHECK (
--   (purchase_order_id IS NOT NULL AND express_order_id IS NULL) OR
--   (purchase_order_id IS NULL AND express_order_id IS NOT NULL)
-- );


-- ==========================================
-- 5. POLÍTICAS RLS (Row Level Security)
-- ==========================================

-- Habilitar RLS
ALTER TABLE public.express_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.express_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.express_item_quotes ENABLE ROW LEVEL SECURITY;

-- Policies para express_purchase_orders
CREATE POLICY "Permitir lectura a autenticados" ON public.express_purchase_orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir insertar a autenticados" ON public.express_purchase_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Permitir actualizar a autenticados" ON public.express_purchase_orders
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir borrar a creador o admin" ON public.express_purchase_orders
  FOR DELETE USING (
    auth.uid() = created_by OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Policies para items y quotes (heredan acceso si tienen acceso a la orden)
CREATE POLICY "Acceso a items" ON public.express_order_items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Acceso a quotes" ON public.express_item_quotes
  FOR ALL USING (auth.role() = 'authenticated');


-- ==========================================
-- 6. TRIGGERS Y FUNCIONES
-- ==========================================

-- Función para recalcular estimated_total de la ORDEN cuando cambian sus ITEMS
CREATE OR REPLACE FUNCTION public.calculate_express_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.express_purchase_orders
  SET estimated_total = (
    SELECT COALESCE(SUM(estimated_subtotal), 0)
    FROM public.express_order_items 
    WHERE express_order_id = NEW.express_order_id
  ),
  updated_at = NOW()
  WHERE id = NEW.express_order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger al insertar/actualizar/borrar items
DROP TRIGGER IF EXISTS update_express_order_total ON public.express_order_items;
CREATE TRIGGER update_express_order_total
AFTER INSERT OR UPDATE OR DELETE ON public.express_order_items
FOR EACH ROW
EXECUTE FUNCTION public.calculate_express_order_total();

-- Función para validar límite de 1100 (Opcional en BD, pero bueno tenerlo)
-- Se puede dejar a nivel de aplicación para mejor UX (mensajes de advertencia vs error)
-- CREATE OR REPLACE FUNCTION check_express_order_limit() ...

