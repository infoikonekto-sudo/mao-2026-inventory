-- SCRIPT DE ESTABILIDAD FINAL - MAO 2026 v1.5
-- 0. ELIMINAR VISTA PREVIA (Para evitar errores de estructura 42P16)
DROP VIEW IF EXISTS public.v_recent_activity CASCADE;

-- 1. REPARAR TABLA audit_logs
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'license_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN license_id UUID;
    END IF;
END $$;

-- 2. ACTUALIZAR FUNCIÓN DE AUDITORÍA
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_user_id UUID;
    v_license_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF (TG_OP = 'DELETE') THEN
        BEGIN v_license_id := OLD.license_id; EXCEPTION WHEN OTHERS THEN v_license_id := NULL; END;
    ELSE
        BEGIN v_license_id := NEW.license_id; EXCEPTION WHEN OTHERS THEN v_license_id := NULL; END;
    END IF;

    IF (v_license_id IS NULL AND v_user_id IS NOT NULL) THEN
        SELECT u.license_id INTO v_license_id FROM public.users u WHERE u.id = v_user_id;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by, license_id)
        VALUES (TG_TABLE_NAME, NEW.id::text, 'MODIFICAR', v_old_data, v_new_data, v_user_id, v_license_id);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        v_old_data := to_jsonb(OLD);
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by, license_id)
        VALUES (TG_TABLE_NAME, OLD.id::text, 'ELIMINAR', v_old_data, v_user_id, v_license_id);
        RETURN OLD;
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_data := to_jsonb(NEW);
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by, license_id)
        VALUES (TG_TABLE_NAME, NEW.id::text, 'CREAR', v_new_data, v_user_id, v_license_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREAR VISTA FINAL: v_recent_activity
CREATE VIEW public.v_recent_activity AS
SELECT 
    id,
    license_id,
    created_at,
    'audit' as activity_type,
    CASE 
        WHEN action = 'CREAR' THEN 'Se creó un registro en ' || table_name
        WHEN action = 'MODIFICAR' THEN 'Se modificó un registro en ' || table_name
        WHEN action = 'ELIMINAR' THEN 'Se eliminó el registro ' || record_id || ' de ' || table_name
        ELSE action || ' en ' || table_name
    END as description
FROM public.audit_logs
UNION ALL
SELECT 
    id,
    license_id,
    created_at,
    'movement' as activity_type,
    'Movimiento de ' || type || ': ' || change || ' unidades' as description
FROM public.inventory_movements;

-- 4. PERMISOS
GRANT SELECT ON public.v_recent_activity TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- 5. NOTIFICAR ÉXITO
COMMENT ON VIEW public.v_recent_activity IS 'Vista de actividad sincronizada v1.5';
