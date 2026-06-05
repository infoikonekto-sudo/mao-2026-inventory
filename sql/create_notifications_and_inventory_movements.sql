-- Crear tabla de notificaciones in-app
-- Migration seguro para crear/alterar tablas de notificaciones y movimientos de inventario
-- 1) Asegura extensión para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Crear tabla notifications si no existe
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id uuid NOT NULL,
  recipient_user_id uuid,
  recipient_role text,
  title text NOT NULL,
  message text NOT NULL,
  related_type text,
  related_id uuid,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Asegurar columnas existentes (si la tabla ya existía con un esquema distinto)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notifications' AND column_name='recipient_role'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN recipient_role text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notifications' AND column_name='recipient_user_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN recipient_user_id uuid;
  END IF;
END$$;

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON public.notifications (recipient_role);

-- 3) Crear tabla inventory_movements si no existe
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id uuid NOT NULL,
  item_id uuid NOT NULL,
  item_code text,
  change numeric NOT NULL,
  type text NOT NULL, -- 'entrada' | 'salida'
  related_type text,
  related_id uuid,
  user_id uuid,
  note text,
  created_at timestamptz DEFAULT now()
);

-- Añadir columnas faltantes de forma segura si la tabla existía con otra estructura
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='item_id'
  ) THEN
    ALTER TABLE public.inventory_movements ADD COLUMN item_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='license_id'
  ) THEN
    ALTER TABLE public.inventory_movements ADD COLUMN license_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='change'
  ) THEN
    ALTER TABLE public.inventory_movements ADD COLUMN change numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='type'
  ) THEN
    ALTER TABLE public.inventory_movements ADD COLUMN type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='inventory_movements' AND column_name='created_at'
  ) THEN
    ALTER TABLE public.inventory_movements ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END$$;

-- Índices para inventory_movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON public.inventory_movements (item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_license ON public.inventory_movements (license_id);

-- 4) (Opcional) Intentar añadir tablas a la publicación de realtime si corresponde
DO $$
DECLARE
  pub_oid oid;
  add_list text := '';
BEGIN
  SELECT oid INTO pub_oid FROM pg_catalog.pg_publication WHERE pubname='supabase_realtime';
  IF pub_oid IS NOT NULL THEN
    -- comprobar si public.notifications ya está en la publicación
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_publication_rel pr
      JOIN pg_class c ON pr.prrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE pr.prpubid = pub_oid AND n.nspname = 'public' AND c.relname = 'notifications'
    ) THEN
      add_list := add_list || 'public.notifications';
    END IF;

    -- comprobar inventory_movements
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_publication_rel pr
      JOIN pg_class c ON pr.prrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE pr.prpubid = pub_oid AND n.nspname = 'public' AND c.relname = 'inventory_movements'
    ) THEN
      IF add_list <> '' THEN
        add_list := add_list || ', ';
      END IF;
      add_list := add_list || 'public.inventory_movements';
    END IF;

    IF add_list <> '' THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %s', add_list);
      RAISE NOTICE 'Added to publication supabase_realtime: %', add_list;
    ELSE
      RAISE NOTICE 'No tables to add to publication supabase_realtime';
    END IF;
  ELSE
    RAISE NOTICE 'Publication supabase_realtime not found; skipping';
  END IF;
END$$;
