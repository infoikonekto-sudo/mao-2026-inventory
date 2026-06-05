# ✅ Guía de Ejecución - Implementación en Supabase

## 📋 Tabla de Contenidos
1. Verificar archivos SQL
2. Ejecutar migraciones en orden
3. Validar que todo esté correctamente instalado
4. Test end-to-end
5. Configuración de producción

---

## 🔍 Paso 1: Verificar Archivos SQL

Tienes 3 archivos SQL que DEBEN ejecutarse EN ESTE ORDEN:

### ✓ Archivo 1: `sql/create_notifications_and_inventory_movements.sql`
**Qué hace:**
- Crea tabla `notifications` (campanita en app)
- Crea tabla `inventory_movements` (historial de entradas/salidas)
- Agrega `email` a tabla users si no existe
- Agrega realtime publication para ambas tablas

**Comandos a ejecutar:**
1. En el proyecto local: `code sql/create_notifications_and_inventory_movements.sql`
2. Copiar TODO el contenido
3. En Supabase Dashboard:
   - Ir a **SQL Editor** (lado izquierdo)
   - Click **"New Query"**
   - Pegar contenido
   - Click **"Run"** (⏯️ icon)
   - Esperar: "Query executed successfully"

### ✓ Archivo 2: `sql/policies_notifications_inventory_movements.sql`
**Qué hace:**
- Habilita RLS en ambas tablas
- Crea políticas de lectura/escritura por rol y license_id
- Asegura que solo veas TUS notificaciones

**Comandos a ejecutar:**
1. Copiar TODO el contenido de `policies_notifications_inventory_movements.sql`
2. En Supabase Dashboard → SQL Editor → **"New Query"**
3. Pegar contenido
4. Click **"Run"**
5. Esperar: "Query executed successfully"

### ✓ Archivo 3: `sql/inventory_exits_logic.sql`
**Qué hace:**
- Crea tabla `requisition_items` (links entre requisiciones e items)
- Crea función RPC `process_requisition_approval()` (reduce stock)
- Crea función RPC `revert_requisition_rejection()` (restaura stock)
- Crea vistas: `vw_inventory_current_stock` y `vw_inventory_movements_detail`
- Crea trigger para validar

**Comandos a ejecutar:**
1. Copiar TODO el contenido de `inventory_exits_logic.sql`
2. En Supabase Dashboard → SQL Editor → **"New Query"**
3. Pegar contenido
4. Click **"Run"**
5. Esperar: "Query executed successfully"

---

## ✅ Paso 2: Validar Instalación

Después de ejecutar los 3 archivos, verifica que TODO se creó correctamente:

### Verificar Tablas
```sql
-- Ejecuta esto en Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN (
  'notifications', 
  'inventory_movements', 
  'requisition_items'
)
ORDER BY table_name;
```

**Resultado esperado:** 3 filas (notifications, inventory_movements, requisition_items)

### Verificar Funciones RPC
```sql
-- Ejecuta esto en Supabase SQL Editor
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
AND routine_name LIKE '%requisition%' OR routine_name LIKE '%approval%'
ORDER BY routine_name;
```

**Resultado esperado:** 2 filas mínimo (process_requisition_approval, revert_requisition_rejection)

### Verificar Vistas
```sql
-- Ejecuta esto en Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'vw_%'
ORDER BY table_name;
```

**Resultado esperado:** 2+ filas (vw_inventory_current_stock, vw_inventory_movements_detail)

### Verificar RLS está habilitado
```sql
-- Ejecuta esto en Supabase SQL Editor
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('notifications', 'inventory_movements');
```

**Resultado esperado:** Ambas columnas `rowsecurity` deben ser `true`

---

## 🧪 Paso 3: Test End-to-End en Staging

### Escenario: Crear Requisición → Aprobar → Verificar Stock

#### 3.1 Preparar datos de prueba
```sql
-- Ejecuta esto en Supabase SQL Editor (reemplaza UUIDs si necesario)

-- Inserta un item de inventario de prueba
INSERT INTO inventory_items 
  (id, license_id, name, code, current_stock, unit_of_measure)
VALUES 
  ('test-item-001', 'tu-license-id-aqui', 'Papel A4 (Test)', 'PAPEL-001', 100, 'Resma')
ON CONFLICT DO NOTHING;

-- Inserta una requisición de prueba
INSERT INTO requisitions 
  (id, license_id, requisition_number, status, requested_by, created_at)
VALUES 
  ('test-req-001', 'tu-license-id-aqui', 'REQ-TEST-001', 'pendiente', 'user-uuid-aqui', now())
ON CONFLICT DO NOTHING;

-- Inserta el item en la requisición
INSERT INTO requisition_items 
  (id, requisition_id, inventory_item_id, quantity_requested, quantity_approved)
VALUES 
  ('test-req-item-001', 'test-req-001', 'test-item-001', 20, 20)
ON CONFLICT DO NOTHING;
```

#### 3.2 Verificar stock inicial
```sql
-- Stock DEBE ser 100
SELECT id, name, current_stock FROM inventory_items 
WHERE id = 'test-item-001';
```

**Resultado:** current_stock = 100

#### 3.3 Aprobar requisición (Simular via RPC)
```sql
-- Ejecuta para aprobar
SELECT process_requisition_approval(
  'test-req-001',           -- requisition_id
  'tu-license-id-aqui',     -- license_id
  'user-uuid-aqui'          -- user_id (jefe_compras)
);
```

#### 3.4 Verificar stock REDUJO
```sql
-- Stock DEBE ser 80 (100 - 20)
SELECT id, name, current_stock FROM inventory_items 
WHERE id = 'test-item-001';
```

**Resultado:** current_stock = 80 ✅

#### 3.5 Verificar movimiento registrado
```sql
-- DEBE haber una 'salida' registrada
SELECT id, type, change, related_type FROM inventory_movements 
WHERE inventory_item_id = 'test-item-001' 
ORDER BY created_at DESC LIMIT 1;
```

**Resultado:** type = 'salida', change = 20, related_type = 'requisition' ✅

#### 3.6 Ver vista de stock actual
```sql
-- VER STOCK ACTUALIZADO EN VISTA
SELECT item_id, current_stock, total_entries, total_exits 
FROM vw_inventory_current_stock 
WHERE item_id = 'test-item-001';
```

**Resultado:** current_stock = 80, total_exits = 20 ✅

---

## 🌐 Paso 4: Configuración para Producción

### 4.1 Configurar SendGrid (Email)

#### En SendGrid (https://app.sendgrid.com/)
1. Registrarse o loguear
2. Ir a **Settings** → **API Keys**
3. Click **Create API Key**
4. Copiar la clave (formato: `SG.xxxxxxxxxxxx`)

#### En tu proyecto (.env.local o .env)
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
SENDGRID_FROM=noreply@tuinsitucion.edu.gt
VITE_SUPABASE_URL=https://tu-project.supabase.co
VITE_SUPABASE_KEY=eyJxx...
```

#### Test: Enviar email manual
```bash
# En terminal, en la raíz del proyecto
npm run process:notifications
```

**Resultado esperado:**
- Si hay notificaciones pendientes: se envían vía SendGrid
- Si no hay: no pasa nada (log: "No pending notifications")

### 4.2 Programar Email Processor (Cada 5 minutos)

#### En Linux/Mac (Crontab)
```bash
# Abrir editor de cron
crontab -e

# Agregar esta línea (ejecuta cada 5 minutos)
*/5 * * * * cd /path/to/your/project && npm run process:notifications

# Guardar (Ctrl+O, Enter, Ctrl+X en nano)

# Verificar que se agregó:
crontab -l
```

#### En Windows (Task Scheduler)
1. Abrir **Task Scheduler** (buscar en Start)
2. Click derecho → **Create Basic Task...**
3. Nombre: `MAO-Process-Notifications`
4. Trigger: **Repetir cada 5 minutos** (Daily → repeat every 5 min)
5. Acción: 
   - Program: `C:\Program Files\nodejs\node.exe` (o tu path de node)
   - Arguments: `C:\ruta\a\proyecto\scripts\processNotifications.mjs`
   - Start in: `C:\ruta\a\proyecto`
6. Click **OK**

**Verificar:** Task Scheduler debe mostrar la tarea corriendo

### 4.3 Permitir notificaciones reales

#### En TopBar.tsx o donde uses NotificationBell
Verificar que:
1. Hook `useNotifications()` está activo
2. Componente `<NotificationBell />` está en TopBar
3. Usuario está logueado

**Para verificar en producción:**
1. Loguear como usuario
2. Debe aparecer icono de campanita (🔔) arriba a la derecha
3. Hacer algún cambio que genere notificación
4. Debe aparecer en campanita dentro de 1-2 segundos

---

## 🚨 Troubleshooting

### ❌ "Error: Column does not exist"
**Causa:** Ejecutaste archivos en orden incorrecto
**Solución:**
1. En Supabase SQL Editor, ejecuta:
   ```sql
   DROP TABLE IF EXISTS notifications, inventory_movements, requisition_items CASCADE;
   ```
2. Vuelve a ejecutar los 3 archivos EN ORDEN

### ❌ "RPC function not found"
**Causa:** No ejecutaste `inventory_exits_logic.sql`
**Solución:** Ejecuta ese archivo nuevamente

### ❌ "No veo campanita de notificación"
**Causa:** Múltiples posibles
**Solución:**
1. Verifica browser console (F12) para errores
2. Verifica que `useNotifications` hook está en el componente
3. Verifica que `create_notifications_and_inventory_movements.sql` se ejecutó

### ❌ "Email no se envía"
**Causa:** SendGrid no configurado o sin notificaciones pendientes
**Solución:**
1. Verifica `SENDGRID_API_KEY` en .env
2. Crea una notificación manualmente:
   ```sql
   INSERT INTO notifications 
     (license_id, recipient_user_id, title, message)
   VALUES 
     ('tu-license-id', 'user-uuid', 'Test', 'Email de prueba')
   ```
3. Ejecuta: `npm run process:notifications`
4. Check Supabase: column `sent` debe cambiar a true

### ❌ "Requisición aprobada pero stock no cambió"
**Causa:** RPC no se llamó o fallió silenciosamente
**Solución:**
1. Check browser console en DevTools
2. Busca `console.warn()` messages de updateRequisitionStatus
3. Verifica que `requisition_items` tiene data para esa requisición
4. Test manual con SQL:
   ```sql
   SELECT process_requisition_approval('req-id', 'license-id', 'user-id');
   ```

---

## 📊 Monitoreo en Producción

### Verificar salud del sistema cada semana

#### Logs de emails enviados
```sql
SELECT count(*), created_at::date 
FROM email_notifications 
WHERE sent = true 
GROUP BY created_at::date 
ORDER BY created_at DESC LIMIT 7;
```

#### Stock bajo alertas
```sql
SELECT 
  ii.name,
  vics.current_stock,
  ii.minimum_stock
FROM vw_inventory_current_stock vics
JOIN inventory_items ii ON vics.item_id = ii.id
WHERE vics.current_stock < (ii.minimum_stock OR 10)
ORDER BY vics.current_stock ASC;
```

#### Movimientos de hoy
```sql
SELECT 
  count(*) as total,
  type,
  related_type
FROM inventory_movements
WHERE created_at::date = today()
GROUP BY type, related_type;
```

---

## 🎉 Checklist de Validación Final

- [ ] Ejecuté `create_notifications_and_inventory_movements.sql`
- [ ] Ejecuté `policies_notifications_inventory_movements.sql`
- [ ] Ejecuté `inventory_exits_logic.sql`
- [ ] Verifiqué que 3 tablas existen
- [ ] Verifiqué que 2 funciones RPC existen
- [ ] Verifiqué que 2+ vistas existen
- [ ] Verifiqué que RLS está habilitado
- [ ] Hice test end-to-end (requisición → stock redujo)
- [ ] Configuré SendGrid API key
- [ ] Programé email processor en crontab/Task Scheduler
- [ ] Probé notificaciones en app (campanita aparece)
- [ ] Probé envío de email (cron ejecutó y se envió)
- [ ] Verifiqué página de Movimientos carga datos reales

---

## 📞 Próximos Pasos

Si todo pasa validación:
1. ✅ Ir a producción
2. ✅ Monitorear emails y notificaciones por 1 semana
3. ✅ Crear documentación de usuario
4. ✅ Capacitar al personal

Si hay errores:
1. Revisar troubleshooting arriba
2. Contactar soporte técnico con error específico

---

**Última actualización:** Implementación completa
**Estado:** Listo para testing y producción

