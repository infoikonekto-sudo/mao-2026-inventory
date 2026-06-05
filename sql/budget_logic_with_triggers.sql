-- ============================================================
-- LÓGICA DE DESCUENTO DE PRESUPUESTO
-- Cuando se crea/actualiza una orden de compra, resta del presupuesto
-- ============================================================

-- Asegurar extensión para generación de UUIDs (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Crear tabla `budgets` si no existe (definición segura sin FK estrictos)
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  spent_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'activo',
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para consultas por licencia
CREATE INDEX IF NOT EXISTS idx_budgets_license_id ON public.budgets(license_id);


-- 1. Agregar columna budget_id a purchase_orders (si no existe)
ALTER TABLE IF EXISTS public.purchase_orders
ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL;

-- 2. Crear función para actualizar presupuesto al crear orden
CREATE OR REPLACE FUNCTION public.update_budget_on_order_create()
RETURNS TRIGGER AS $$
DECLARE
  v_budget_amount DECIMAL(12,2);
  v_new_spent DECIMAL(12,2);
BEGIN
  -- Si se especifica un presupuesto, actualizar spent_amount y remaining_amount
  IF NEW.budget_id IS NOT NULL AND NEW.total_amount > 0 THEN
    -- Obtener monto actual del presupuesto
    SELECT spent_amount INTO v_budget_amount
    FROM public.budgets
    WHERE id = NEW.budget_id;
    
    IF v_budget_amount IS NOT NULL THEN
      -- Calcular nuevo gastado
      v_new_spent := v_budget_amount + NEW.total_amount;
      
      -- Actualizar presupuesto
      UPDATE public.budgets
      SET 
        spent_amount = v_new_spent,
        remaining_amount = total_amount - v_new_spent,
        updated_at = now()
      WHERE id = NEW.budget_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear función para revertir presupuesto al eliminar orden
CREATE OR REPLACE FUNCTION public.revert_budget_on_order_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_budget_amount DECIMAL(12,2);
  v_new_spent DECIMAL(12,2);
BEGIN
  -- Si había presupuesto asignado, revertir
  IF OLD.budget_id IS NOT NULL AND OLD.total_amount > 0 THEN
    SELECT spent_amount INTO v_budget_amount
    FROM public.budgets
    WHERE id = OLD.budget_id;
    
    IF v_budget_amount IS NOT NULL THEN
      -- Restar del gastado
      v_new_spent := GREATEST(0, v_budget_amount - OLD.total_amount);
      
      UPDATE public.budgets
      SET 
        spent_amount = v_new_spent,
        remaining_amount = total_amount - v_new_spent,
        updated_at = now()
      WHERE id = OLD.budget_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear función para actualizar presupuesto al modificar orden
CREATE OR REPLACE FUNCTION public.update_budget_on_order_update()
RETURNS TRIGGER AS $$
DECLARE
  v_old_amount DECIMAL(12,2);
  v_new_amount DECIMAL(12,2);
  v_budget_amount DECIMAL(12,2);
  v_difference DECIMAL(12,2);
BEGIN
  -- Si el monto cambió o el presupuesto cambió
  IF (NEW.total_amount != OLD.total_amount) OR (NEW.budget_id != OLD.budget_id) THEN
    
    -- Primero, revertir del presupuesto anterior si existía
    IF OLD.budget_id IS NOT NULL AND OLD.total_amount > 0 THEN
      SELECT spent_amount INTO v_budget_amount
      FROM public.budgets
      WHERE id = OLD.budget_id;
      
      IF v_budget_amount IS NOT NULL THEN
        UPDATE public.budgets
        SET 
          spent_amount = GREATEST(0, spent_amount - OLD.total_amount),
          remaining_amount = total_amount - GREATEST(0, spent_amount - OLD.total_amount),
          updated_at = now()
        WHERE id = OLD.budget_id;
      END IF;
    END IF;
    
    -- Luego, agregar al nuevo presupuesto si existe
    IF NEW.budget_id IS NOT NULL AND NEW.total_amount > 0 THEN
      SELECT spent_amount INTO v_budget_amount
      FROM public.budgets
      WHERE id = NEW.budget_id;
      
      IF v_budget_amount IS NOT NULL THEN
        UPDATE public.budgets
        SET 
          spent_amount = spent_amount + NEW.total_amount,
          remaining_amount = total_amount - (spent_amount + NEW.total_amount),
          updated_at = now()
        WHERE id = NEW.budget_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear triggers
DROP TRIGGER IF EXISTS trg_budget_on_order_create ON public.purchase_orders;
CREATE TRIGGER trg_budget_on_order_create
  AFTER INSERT ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_on_order_create();

DROP TRIGGER IF EXISTS trg_budget_on_order_delete ON public.purchase_orders;
CREATE TRIGGER trg_budget_on_order_delete
  AFTER DELETE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_budget_on_order_delete();

DROP TRIGGER IF EXISTS trg_budget_on_order_update ON public.purchase_orders;
CREATE TRIGGER trg_budget_on_order_update
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_on_order_update();

-- 6. Crear vista de resumen de presupuestos
DROP VIEW IF EXISTS public.vw_budget_summary CASCADE;
CREATE VIEW public.vw_budget_summary AS
SELECT 
  b.id,
  b.license_id,
  b.name,
  b.category,
  b.total_amount,
  b.spent_amount,
  b.remaining_amount,
  ROUND((b.spent_amount::NUMERIC / NULLIF(b.total_amount, 0)) * 100, 2) as utilization_percent,
  b.status,
  b.start_date,
  b.end_date,
  COUNT(po.id) as purchase_orders_count,
  COALESCE(SUM(po.total_amount), 0) as purchase_orders_total
FROM public.budgets b
LEFT JOIN public.purchase_orders po ON po.budget_id = b.id AND po.status IN ('en_transito', 'completada')
GROUP BY b.id, b.license_id, b.name, b.category, b.total_amount, b.spent_amount, b.remaining_amount, b.status, b.start_date, b.end_date;
