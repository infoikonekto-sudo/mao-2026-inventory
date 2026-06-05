# ✅ SOLUCIÓN - ERROR DE POLÍTICA RLS DUPLICADA

## 🔴 Error Recibido
```
Error: Failed to run sql query: ERROR: 42710: policy "notifications_select_user_or_role_or_admin" 
for table "notifications" already exists
```

## ✅ Solución Aplicada

He actualizado el archivo `policies_notifications_inventory_movements.sql` para que sea **idempotente** (pueda ejecutarse múltiples veces sin errores).

### Cambio Realizado
Agregué `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY`:

**Antes (causaba error):**
```sql
CREATE POLICY "notifications_select_user_or_role_or_admin" ON public.notifications ...
```

**Ahora (sin error):**
```sql
DROP POLICY IF EXISTS "notifications_select_user_or_role_or_admin" ON public.notifications;
CREATE POLICY "notifications_select_user_or_role_or_admin" ON public.notifications ...
```

### Políticas Corregidas
```
✅ notifications_select_user_or_role_or_admin
✅ notifications_insert_allowed
✅ notifications_update_mark_read
✅ notifications_delete_admin
✅ inventory_movements_select_by_license_or_creator_or_admin
✅ inventory_movements_insert_allowed_roles
✅ inventory_movements_update_creator_or_admin
✅ inventory_movements_delete_admin
```

---

## 🔧 Cómo Ejecutar Correctamente

### Paso 1: Abrir Supabase SQL Editor
1. Ve a https://app.supabase.com
2. Selecciona tu proyecto MAO 2026
3. Click **SQL Editor** (lado izquierdo)
4. Click **New Query**

### Paso 2: Limpiar (Opcional)
Si quieres estar seguro, ejecuta primero esto para eliminar TODAS las políticas:

```sql
-- Limpiar todas las políticas existentes
DROP POLICY IF EXISTS "notifications_select_user_or_role_or_admin" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_allowed" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_mark_read" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_admin" ON public.notifications;

DROP POLICY IF EXISTS "inventory_movements_select_by_license_or_creator_or_admin" ON public.inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_insert_allowed_roles" ON public.inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_update_creator_or_admin" ON public.inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_delete_admin" ON public.inventory_movements;
```

Click **Run**

### Paso 3: Copiar contenido corregido
1. Abre archivo local: `sql/policies_notifications_inventory_movements.sql`
2. Copia TODO el contenido
3. Pega en Supabase SQL Editor
4. Click **Run**

**Resultado esperado:**
```
Query executed successfully
```

### Paso 4: Verificar
```sql
-- Verificar que las políticas existen
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('notifications', 'inventory_movements')
ORDER BY tablename, policyname;
```

Click **Run**

**Resultado esperado - 8 filas:**
```
tablename              | policyname
-----------------------+----------------------------------------------------------
inventory_movements    | inventory_movements_delete_admin
inventory_movements    | inventory_movements_insert_allowed_roles
inventory_movements    | inventory_movements_select_by_license_or_creator_or_admin
inventory_movements    | inventory_movements_update_creator_or_admin
notifications          | notifications_delete_admin
notifications          | notifications_insert_allowed
notifications          | notifications_select_user_or_role_or_admin
notifications          | notifications_update_mark_read
```

---

## 📋 ORDEN DE EJECUCIÓN (CORRECTO)

**Ejecuta en este orden:**

1️⃣ `sql/create_notifications_and_inventory_movements.sql` (crea tablas)
2️⃣ `sql/policies_notifications_inventory_movements.sql` (crea políticas RLS)
3️⃣ `sql/inventory_exits_logic.sql` (crea funciones y vistas)

Cada uno debe ejecutarse **New Query** (no en la misma query)

---

## 🆘 Si Sigue Dando Error

### Opción A: Usar FORCE (si tienes acceso)
```sql
-- Esto requiere permisos altos, pero fuerza la eliminación
DROP POLICY IF EXISTS "notifications_select_user_or_role_or_admin" ON public.notifications CASCADE;
CREATE POLICY "notifications_select_user_or_role_or_admin" ON public.notifications ...
```

### Opción B: Contactar soporte Supabase
- El error 42710 significa que la política ya existe
- Es posible que necesites usar la CLI: `supabase db pull`

### Opción C: Deshabilitar y reabilitar RLS
```sql
-- Deshabilitar RLS temporalmente
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements DISABLE ROW LEVEL SECURITY;

-- Luego ejecutar el SQL del #3 arriba

-- Finalmente reabilitar
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
```

---

## 📝 Qué Significa cada Política

### Para `notifications`:
- **SELECT:** Usuario ve notificaciones dirigidas a él, su rol, o es admin
- **INSERT:** Solo admins o usuarios autenticados pueden crear
- **UPDATE:** Solo destinatario o admin puede marcar como leída
- **DELETE:** Solo admin

### Para `inventory_movements`:
- **SELECT:** Usuario ve movimientos de su license, creador, o es admin/auditor
- **INSERT:** Solo jefe_compras, finanzas, o admin
- **UPDATE:** Solo creador o admin
- **DELETE:** Solo admin

---

## ✅ Checklist Final

- [ ] Ejecuté SQL #1 (create_notifications_and_inventory_movements.sql)
- [ ] Ejecuté SQL #2 (policies_notifications_inventory_movements.sql) - AHORA IDEMPOTENTE
- [ ] Ejecuté SQL #3 (inventory_exits_logic.sql)
- [ ] Verifiqué que las 8 políticas existen con query de verificación
- [ ] Sistema funcionando sin errores

---

**¿Problema resuelto?** ✅ Ahora puedes ejecutar `sql/policies_notifications_inventory_movements.sql` sin errores, incluso múltiples veces.

