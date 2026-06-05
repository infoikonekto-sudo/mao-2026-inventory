-- ============================================================
-- SISTEMA DE AUDITORÍA REAL - VERSIÓN CORREGIDA
-- (Sin tablas de items que no existen)
-- ============================================================

-- 0. EXTENSIÓN UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. LIMPIEZA PREVIA
DROP VIEW IF EXISTS public.v_audit_logs_details;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- 2. Crear tabla de logs de auditoría
CREATE TABLE public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'CREAR', 'MODIFICAR', 'ELIMINAR'
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id),
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de seguridad (RLS)
-- Permitir ver logs a roles autorizados
CREATE POLICY "Ver logs de auditoría" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'super_admin', 'auditor', 'finanzas')
        )
    );

-- 5. Función Trigger Automática
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF (TG_OP = 'UPDATE') THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id::text, 'MODIFICAR', v_old_data, v_new_data, v_user_id);
        RETURN NEW;
        
    ELSIF (TG_OP = 'DELETE') THEN
        v_old_data := to_jsonb(OLD);
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id::text, 'ELIMINAR', v_old_data, v_user_id);
        RETURN OLD;
        
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_data := to_jsonb(NEW);
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id::text, 'CREAR', v_new_data, v_user_id);
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Aplicar Triggers a las tablas PRINCIPALES (Excluyendo items inexistentes)

-- Inventario Items
DROP TRIGGER IF EXISTS audit_inventory_items ON public.inventory_items;
CREATE TRIGGER audit_inventory_items
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Requisiciones
DROP TRIGGER IF EXISTS audit_requisitions ON public.requisitions;
CREATE TRIGGER audit_requisitions
AFTER INSERT OR UPDATE OR DELETE ON public.requisitions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Ordenes de Compra
DROP TRIGGER IF EXISTS audit_purchase_orders ON public.purchase_orders;
CREATE TRIGGER audit_purchase_orders
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Solicitudes de Compra
DROP TRIGGER IF EXISTS audit_purchase_requests ON public.purchase_requests;
CREATE TRIGGER audit_purchase_requests
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_requests
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Presupuestos (Si existe la tabla budgets)
DROP TRIGGER IF EXISTS audit_budgets ON public.budgets;
CREATE TRIGGER audit_budgets
AFTER INSERT OR UPDATE OR DELETE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Movimientos de Inventario (Si existe)
DROP TRIGGER IF EXISTS audit_inventory_movements ON public.inventory_movements;
CREATE TRIGGER audit_inventory_movements
AFTER INSERT OR UPDATE OR DELETE ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 7. Crear vista enriquecida con nombre de usuario
CREATE OR REPLACE VIEW public.v_audit_logs_details AS
SELECT 
    a.*,
    u.full_name as user_name,
    u.role as user_role
FROM public.audit_logs a
LEFT JOIN public.users u ON a.changed_by = u.id;
