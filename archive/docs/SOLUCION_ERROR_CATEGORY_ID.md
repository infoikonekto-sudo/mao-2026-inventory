# ✅ SOLUCIÓN - ERROR EN VISTA inventory_exits_logic.sql

## 🔴 Error Recibido
```
Error: Failed to run sql query: ERROR: 42703: column ii.category_id does not exist
LINE 156: ii.category_id,
HINT: Perhaps you meant to reference the column "ii.category".
```

## ✅ Causa del Error

La tabla `inventory_items` tiene la columna llamada `category` (no `category_id`).

El archivo SQL hacía referencia a:
```sql
ii.category_id  ❌ (no existe)
```

Debería ser:
```sql
ii.category  ✅ (correcto)
```

## 🔧 Solución Aplicada

He corregido la vista `vw_inventory_current_stock` en el archivo:
```
sql/inventory_exits_logic.sql
```

### Cambios Realizados

**Antes (línea 156):**
```sql
SELECT 
  ii.id,
  ii.license_id,
  ii.item_code,
  ii.name,
  ii.category_id,              -- ❌ ERROR
  ii.unit_of_measure,
  ...
GROUP BY ii.id, ii.license_id, ii.item_code, ii.name, ii.category_id, ...  -- ❌ ERROR
```

**Ahora:**
```sql
SELECT 
  ii.id,
  ii.license_id,
  ii.item_code,
  ii.name,
  ii.category,                 -- ✅ CORRECTO
  ii.unit_of_measure,
  ...
GROUP BY ii.id, ii.license_id, ii.item_code, ii.name, ii.category, ...    -- ✅ CORRECTO
```

---

## 🚀 Cómo Ejecutar Nuevamente

### Paso 1: Abrir Supabase SQL Editor
1. Ve a https://app.supabase.com
2. Selecciona tu proyecto MAO 2026
3. Click **SQL Editor** → **New Query**

### Paso 2: Copiar contenido corregido
1. Abre archivo: `sql/inventory_exits_logic.sql`
2. Copia TODO el contenido
3. Pega en Supabase SQL Editor
4. Click **Run**

**Resultado esperado:**
```
Query executed successfully ✅
```

---

## ✅ Verificar que Funcionó

Ejecuta esta query:

```sql
-- Verificar que las funciones existen
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND (routine_name LIKE 'process_%' OR routine_name LIKE 'revert_%')
ORDER BY routine_name;
```

**Resultado esperado - 2 funciones:**
```
routine_name
--------------------------------------
process_requisition_approval
revert_requisition_rejection
```

---

### Verificar vistas

```sql
-- Verificar que las vistas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'VIEW'
  AND table_name LIKE 'vw_inventory%'
ORDER BY table_name;
```

**Resultado esperado - 2 vistas:**
```
table_name
--------------------------
vw_inventory_current_stock
vw_inventory_movements_detail
```

---

### Verificar tabla requisition_items

```sql
-- Verificar que la tabla existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'requisition_items';
```

**Resultado esperado:**
```
table_name
------------------
requisition_items
```

---

## 📋 RESUMEN DE CORRECCIONES

| Elemento | Error | Corrección |
|----------|-------|-----------|
| Vista | `ii.category_id` | `ii.category` |
| GROUP BY | `ii.category_id` | `ii.category` |
| Ubicación | Línea 156 | Línea 156 |

---

## 📚 Qué Crea Este Script SQL

1. **Tabla `requisition_items`**
   - Vincula items específicos a cada requisición
   - Registra cantidad solicitada de cada item

2. **Función `process_requisition_approval()`**
   - Ejecuta cuando se aprueba una requisición
   - Reduce stock automáticamente
   - Registra movimiento de SALIDA

3. **Función `revert_requisition_rejection()`**
   - Si una requisición aprobada se rechaza
   - Restaura el stock (ENTRADA)
   - Registra reversión en historial

4. **Vista `vw_inventory_current_stock`**
   - Muestra stock actual de cada item
   - Calcula entradas/salidas totales
   - Fecha del último movimiento

5. **Vista `vw_inventory_movements_detail`**
   - Historial de todos los movimientos
   - Detalles de qué requisición originó el movimiento
   - Nombre del usuario que lo registró

6. **Trigger `trg_check_requisition_items`**
   - Valida que una requisición tenga al menos 1 item antes de aprobar

---

## ✅ ORDEN DE EJECUCIÓN CORRECTO

Ejecuta en Supabase en este orden exacto:

1️⃣ **SQL Editor → New Query**
   - Contenido: `sql/create_notifications_and_inventory_movements.sql`
   - Click Run

2️⃣ **SQL Editor → New Query**
   - Contenido: `sql/policies_notifications_inventory_movements.sql`
   - Click Run

3️⃣ **SQL Editor → New Query**
   - Contenido: `sql/inventory_exits_logic.sql` (CORREGUIDO)
   - Click Run

**Esperado:**
```
Query executed successfully ✅
Query executed successfully ✅
Query executed successfully ✅
```

---

## 🎉 Siguiente Paso

Una vez ejecutados los 3 SQL files correctamente:

✅ Tablas creadas (notifications, inventory_movements, requisition_items)
✅ Políticas RLS configuradas
✅ Funciones de lógica de negocio activas
✅ Vistas con datos listos

**El sistema está completamente operativo en base de datos.**

Ahora prueba en la aplicación:
- Login como PROFESOR
- Crear REQUISICIÓN
- Login como JEFE_COMPRAS
- APROBAR requisición
- Verificar que stock bajó automáticamente

