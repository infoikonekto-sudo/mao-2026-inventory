-- ============================================================
-- CREAR USUARIO ADMINISTRADOR EN SUPABASE
-- ============================================================
-- Requisitos:
-- 1. Necesitas tener el LICENSE_ID de tu licencia
-- 2. Ejecutar esto en Supabase SQL Editor como super_admin
-- ============================================================

-- OPCIÓN 1: Crear usuario ADMIN con registro manual en tabla `users`
-- (Sin crear en auth.users de Supabase, solo en tabla pública)

-- Paso 1: Reemplaza estos valores con los tuyos:
-- - 'TU-LICENSE-ID' → UUID de tu licencia (ejemplo: '123e4567-e89b-12d3-a456-426614174000')
-- - 'ADMIN-XXXX-XXXX' → Código único para el admin (se genera con UUID corto)
-- - 'admin@ejemplo.com' → Email del admin

INSERT INTO public.users (
  license_id,
  auth_code,
  full_name,
  email,
  role,
  department,
  is_active
)
VALUES (
  'TU-LICENSE-ID',                      -- Reemplaza con tu license_id
  'ADMIN-' || substring(md5(random()::text), 1, 12),  -- Genera código único
  'Administrador Principal',             -- Nombre
  'admin@ejemplo.com',                   -- Email
  'admin',                               -- Rol
  'Administración',                      -- Departamento
  true                                   -- Activo
)
RETURNING id, auth_code, email, role, full_name;

-- ============================================================

-- OPCIÓN 2: Ver los códigos de usuarios ya existentes
SELECT 
  id,
  auth_code,
  full_name,
  email,
  role,
  is_active,
  created_at
FROM public.users
WHERE role IN ('admin', 'super_admin')
ORDER BY created_at DESC;

-- ============================================================

-- OPCIÓN 3: Listar TODOS los usuarios con sus códigos
SELECT 
  id,
  auth_code as "CÓDIGO USUARIO",
  full_name as "NOMBRE",
  email,
  role as "ROL",
  department as "DEPARTAMENTO",
  is_active as "ACTIVO",
  created_at as "CREADO"
FROM public.users
ORDER BY created_at DESC;

-- ============================================================

-- OPCIÓN 4: Actualizar rol de un usuario existente a ADMIN
-- (Si ya existe un usuario que quieres convertir a admin)
-- Reemplaza 'COMPRA-8N6T-2Y5W' con el código del usuario
UPDATE public.users
SET role = 'admin'
WHERE auth_code = 'COMPRA-8N6T-2Y5W'
RETURNING id, auth_code, full_name, role;

-- ============================================================

-- OPCIÓN 5: Ver el LICENSE_ID de tu escuela
-- (Necesitas esto para crear usuarios)
SELECT 
  id as "LICENSE_ID",
  school_code as "CÓDIGO ESCUELA",
  is_active as "ACTIVA",
  max_users as "MÁXIMO USUARIOS",
  expiration_date as "VENCIMIENTO"
FROM public.licenses
LIMIT 5;

-- ============================================================
-- INSTRUCCIONES DE USO:
-- ============================================================
-- 1. Copia la OPCIÓN 5 abajo y ejecuta en Supabase
--    → Verás tu LICENSE_ID
--
-- 2. Copia la OPCIÓN 1, REEMPLAZA:
--    - 'TU-LICENSE-ID' → tu license_id real
--    - 'admin@ejemplo.com' → tu email
--    - 'Administrador Principal' → tu nombre
--
-- 3. Ejecuta en Supabase SQL Editor
--    → Verás el nuevo auth_code generado (ej: ADMIN-a7f3b2c9e4d1)
--
-- 4. USA ESE CÓDIGO para ingresar al sistema
--
-- 5. (OPCIONAL) Si tienes un usuario existente que quieres 
--    convertir a admin, usa OPCIÓN 4
-- ============================================================
