# ⚡ PLAN DE ACCIÓN INMEDIATO - MAO 2026

**Tiempo Total Estimado: 1 hora**

---

## 🚀 RESUMEN EN 30 SEGUNDOS

Tu sistema MAO 2026 está 100% implementado en código y listo para ejecutar.

**Qué falta:** Ejecutar 3 archivos SQL en Supabase para que toda la lógica se active en BD.

**Resultado:** 
- ✅ Requisiciones aprobadas reducen stock AUTOMÁTICAMENTE
- ✅ Notificaciones en tiempo real (campanita + email)
- ✅ Auditoría completa e inmutable
- ✅ Todo en producción-ready

---

## 📋 ACCIÓN 1: VALIDAR CÓDIGO COMPILADO (5 min)

### En terminal (desde carpeta del proyecto)
```bash
npm run build
```

**Resultado esperado:**
```
✓ built in 45.23s
```

Si hay error, revisar browser console en `npm run dev`

---

## 🗄️ ACCIÓN 2: EJECUTAR SQL (30 min)

### Paso 1: Abrir Supabase

1. Ve a https://app.supabase.com
2. Elige tu proyecto MAO 2026
3. Click **SQL Editor** (lado izquierdo)

### Paso 2: Ejecutar SQL #1 (Crear Tablas)

1. Click **New Query**
2. Abre archivo local: `sql/create_notifications_and_inventory_movements.sql`
3. Copia TODO el contenido
4. Pega en Supabase SQL Editor
5. Click **Run** (⏯️ botón)
6. Esperar: "Query executed successfully"

**Verificar:**
```sql
-- Ejecuta esto al final para confirmar
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('notifications', 'inventory_movements')
```
Debe retornar 2 filas.

### Paso 3: Ejecutar SQL #2 (Seguridad RLS)

1. Click **New Query**
2. Abre archivo: `sql/policies_notifications_inventory_movements.sql`
3. Copia TODO, pega, **Run**
4. Esperar: "Query executed successfully"

**Verificar:**
```sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('notifications', 'inventory_movements')
```
Ambas deben tener `rowsecurity = true`

### Paso 4: Ejecutar SQL #3 (Lógica de Salidas) ⭐ MÁS IMPORTANTE

1. Click **New Query**
2. Abre archivo: `sql/inventory_exits_logic.sql`
3. Copia TODO, pega, **Run**
4. Esperar: "Query executed successfully"

**Verificar:**
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE 'process_%' OR routine_name LIKE 'revert_%'
```
Debe retornar 2 funciones.

---

## 🧪 ACCIÓN 3: TEST RÁPIDO (10 min)

### Test: Requisición → Stock Reduce

**En Supabase SQL Editor, ejecuta esto:**

```sql
-- 1. Inserta un item de prueba (REEMPLAZA uuid-ejemplo por tu license_id real)
INSERT INTO inventory_items 
  (id, license_id, name, code, current_stock)
VALUES 
  ('item-test-001', 'REEMPLAZA-CON-TU-LICENSE-ID', 'Papel (Test)', 'PAPEL-001', 100)
ON CONFLICT DO NOTHING;

-- 2. Inserta una requisición de prueba
INSERT INTO requisitions 
  (id, license_id, requisition_number, status, requested_by)
VALUES 
  ('req-test-001', 'REEMPLAZA-CON-TU-LICENSE-ID', 'REQ-TEST-001', 'pendiente', 'REEMPLAZA-CON-USER-UUID')
ON CONFLICT DO NOTHING;

-- 3. Inserta el item en la requisición
INSERT INTO requisition_items 
  (id, requisition_id, inventory_item_id, quantity_requested, quantity_approved)
VALUES 
  ('req-item-test-001', 'req-test-001', 'item-test-001', 20, 20)
ON CONFLICT DO NOTHING;

-- 4. VERIFICA STOCK INICIAL (debe ser 100)
SELECT current_stock FROM inventory_items WHERE id = 'item-test-001';

-- 5. APRUEBA REQUISICIÓN VIA RPC (esto reduce stock)
SELECT process_requisition_approval(
  'req-test-001',
  'REEMPLAZA-CON-TU-LICENSE-ID',
  'REEMPLAZA-CON-USER-UUID'
);

-- 6. VERIFICA STOCK BAJO (debe ser 80 = 100 - 20)
SELECT current_stock FROM inventory_items WHERE id = 'item-test-001';

-- 7. VERIFICA MOVIMIENTO REGISTRADO
SELECT type, change FROM inventory_movements 
WHERE inventory_item_id = 'item-test-001' 
ORDER BY created_at DESC LIMIT 1;
```

**Resultado esperado:**
- Query 4: `100`
- Query 6: `80` ✅ (¡STOCK REDUJO!)
- Query 7: `salida | 20` ✅

Si todo devuelve los valores esperados → ¡SQL funciona! 🎉

---

## ⚙️ ACCIÓN 4: CONFIGURAR EMAIL (10 min)

### Paso 1: Obtener API Key de SendGrid

1. Ve a https://app.sendgrid.com (crea cuenta si no tienes)
2. Login
3. Lado izquierdo → **Settings** → **API Keys**
4. Click **Create API Key**
5. Dale nombre: `MAO-2026-Production`
6. Copiar clave (formato: `SG.xxxxxxxxxxxx...`)

### Paso 2: Agregar a .env.local

En la raíz de tu proyecto, abre `.env.local` y agrega:

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
SENDGRID_FROM=noreply@tu-institucion.edu.gt
```

**Reemplaza:**
- `xxxxxxxxxxxx` con tu API key de SendGrid
- `tu-institucion.edu.gt` con tu dominio real

### Paso 3: Test Manual de Email

En terminal (raíz del proyecto):
```bash
npm run process:notifications
```

**Resultado esperado:**
```
✓ Email processor running...
✓ Found X pending notifications
✓ Processing...
✓ Done!
```

Si hay error, revisar `.env.local` tiene API key correcta.

---

## ⏰ ACCIÓN 5: PROGRAMAR EMAIL PROCESSOR (10 min)

Email se debe ejecutar automáticamente cada 5 minutos.

### Opción A: Linux/Mac (Crontab)

```bash
# Abre editor
crontab -e

# Agrega esta línea al final:
*/5 * * * * cd /ruta/completa/a/proyecto && npm run process:notifications >> /tmp/mao-notifications.log 2>&1

# Guardar: Ctrl+O, Enter, Ctrl+X (en nano)

# Verificar que se agregó:
crontab -l
```

### Opción B: Windows (Task Scheduler)

1. Abre **Task Scheduler** (búscalo en Start)
2. Panel derecho → **Create Basic Task...**
3. **General tab:**
   - Nombre: `MAO-Process-Notifications`
   - Descripción: `Envía notificaciones de email cada 5 minutos`
   
4. **Triggers tab:**
   - Click **New**
   - Begin: `At startup` o `On a schedule`
   - Repeat: Every `5 minutes`
   - Duration: Until `Indefinitely`
   - Click OK

5. **Actions tab:**
   - Click **New**
   - Program/script: `C:\Program Files\nodejs\node.exe` (ajusta si node está en otro lado)
   - Add arguments: `-e "require('/ruta/a/proyecto/scripts/processNotifications.mjs')"`
   - Start in: `C:\ruta\a\proyecto`
   - Click OK

6. Click **OK** final
7. Ir a Task Scheduler Library y verificar que la tarea aparece

---

## ✅ ACCIÓN 6: VALIDACIÓN FINAL (5 min)

### Checklist Visual

- [ ] Código compila sin errores (`npm run build` exitoso)
- [ ] 3 SQL files ejecutados en Supabase
- [ ] Tablas existen: notifications, inventory_movements, requisition_items
- [ ] Funciones RPC existen: process_requisition_approval, revert_requisition_rejection
- [ ] Test SQL pasó: Stock bajó de 100 a 80
- [ ] SendGrid configurado en .env.local
- [ ] Cron/Task Scheduler programado

### Test Funcional

En navegador (con servidor `npm run dev` corriendo):

1. Login como **jefe_compras**
2. Ve a `/dashboard/inventory-movements`
3. Si ves tabla con datos → ✅ (si está vacía es normal antes de requisiciones)
4. Ve a `/dashboard/requisitions`
5. Crea una requisición de prueba (no importa con qué items)
6. Apruébala (click Aprobar)
7. Debe aparecer notificación (campanita en arriba a derecha)
8. Ve a `/dashboard/inventory-movements` nuevamente
9. Debe haber una fila con tipo='salida'

Si todo lo anterior funciona → ✅ **SISTEMA LISTO PARA PRODUCCIÓN**

---

## 🎯 PRÓXIMA TAREA

Una vez validado:

1. **Comunicar al equipo:**
   - Profesor: Puede crear requisiciones normal
   - Jefe Compras: Cuando aprueba, stock se reduce automáticamente
   - Auditor: Puede ver historial en Movimientos

2. **Entrenar usuarios:**
   - Mostrar dónde aparecen notificaciones (campanita)
   - Explicar que stock se reduce automático

3. **Monitorear primeras 24h:**
   - Verificar que no hay errores en browser console
   - Confirmar que emails se envían

---

## ❓ DUDAS COMUNES

**P: ¿Qué pasa si apruebo una requisición?**
R: Stock reduce AUTOMÁTICAMENTE en <1 segundo. No necesitas hacer nada extra.

**P: ¿Cómo sé si el email se envió?**
R: Revisa Supabase → SQL Editor:
```sql
SELECT count(*), sent FROM email_notifications GROUP BY sent
```

**P: ¿Qué si rechazó después de aprobar?**
R: Stock se restaura automáticamente. El historial muestra ambas acciones.

**P: ¿Por qué la página de Movimientos está vacía?**
R: Es normal si no hay requisiciones aprobadas aún. Cuando apruebes una, aparecerá.

**P: ¿Si no configuro SendGrid, qué pasa?**
R: Email no se envía, pero CAMPANITA sigue funcionando (notificación in-app aparece en <1s).

---

## 📞 SOPORTE

### Si algo no funciona

1. **SQL error:** Revisar `GUIA_EJECUCION_SUPABASE.md` → Troubleshooting
2. **Código error:** Abrir DevTools (F12) → Console → Copiar error
3. **Email no se envía:** Verificar `.env.local` tiene `SENDGRID_API_KEY`
4. **Requisición no reduce stock:** Ejecutar `SELECT process_requisition_approval(...)`en SQL Editor manualmente

---

## 🎉 SIGUIENTES PASOS DESPUÉS DE GO-LIVE

1. **Semana 1:** Monitorear sistema, entrenar usuarios
2. **Semana 2:** Preparar reportes ejecutivos
3. **Semana 3:** Optimizar según feedback
4. **Semana 4+:** Agregar features adicionales

---

```
┌────────────────────────────────────────┐
│   ¡LISTA PARA DESPLEGARSE!            │
│                                        │
│  1. Ejecuta 3 SQL files        (30m) │
│  2. Configura SendGrid         (10m) │
│  3. Programa cron/scheduler    (10m) │
│  4. Valida funcionamiento       (5m) │
│                                        │
│  Total: 1 hora para GO-LIVE ✅       │
│                                        │
│  Status: PRODUCCIÓN LISTA 🚀         │
└────────────────────────────────────────┘
```

---

**Creado:** Implementación MAO 2026 Completa
**Estado:** ✅ Ready for Action
**Versión:** 1.0 Production

