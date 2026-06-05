# 🎯 PRÓXIMOS PASOS - ORDEN EXACTO

## PASO 1️⃣: VERIFICAR LO QUE EXISTE (5 minutos)

### En Supabase SQL Editor:
1. Abre: https://supabase.com/dashboard
2. Ve a: SQL Editor
3. Copia y ejecuta el contenido de: `DIAGNOSTICO_SUPABASE.sql`
4. **CAPTURA SCREENSHOT de los resultados y comparte conmigo**

**Busca especialmente:**
- ¿Existen las tablas: requisitions, purchase_orders, inventory_items?
- ¿Hay datos en esas tablas?
- ¿Existen: requisition_items, purchase_order_items?
- ¿Qué columnas tiene cada tabla?

---

## PASO 2️⃣: EJECUTAR SCRIPTS EN ORDEN (10 minutos)

Una vez confirmes en el diagnóstico, **ejecuta en esta secuencia exacta:**

### Script 1 - Crear tabla de movimientos:
```
Archivo: 1_CREATE_INVENTORY_MOVEMENTS.sql
Lugar: SQL Editor de Supabase
Tiempo: ~30 segundos
```

### Script 2 - Crear vistas:
```
Archivo: 2_CREATE_VIEWS.sql
Lugar: SQL Editor de Supabase
Tiempo: ~1 minuto
```

### Script 3 - Crear funciones:
```
Archivo: 3_CREATE_FUNCTIONS.sql
Lugar: SQL Editor de Supabase
Tiempo: ~1 minuto
```

---

## PASO 3️⃣: CREAR DATOS DE EJEMPLO (2 minutos)

Para que el dashboard muestre datos, necesitamos movimientos:

```sql
-- Copiar y ejecutar esto en SQL Editor

-- 1. Buscar un item de ejemplo
SELECT id, name FROM inventory_items LIMIT 1;

-- 2. Luego insertar movimientos (reemplaza el UUID)
SELECT fn_record_inventory_movement(
  p_item_id := 'TU-UUID-AQUI',
  p_movement_type := 'purchase_in',
  p_quantity := 100,
  p_notes := 'Entrada inicial de prueba'
);

-- 3. Verificar que se creó
SELECT * FROM inventory_movements LIMIT 5;
SELECT * FROM v_inventory_current_stock LIMIT 5;
```

---

## PASO 4️⃣: ACTUALIZAR AdminDashboard.tsx (15 minutos)

Una vez funcione todo en Supabase, actualizaré el código TypeScript para:
- Usar `v_inventory_current_stock` en lugar de `inventory_items`
- Usar `v_requisitions_summary` para requisiciones pendientes
- Usar `v_purchase_orders_summary` para órdenes activas
- Usar `v_recent_activity` para actividad reciente

---

## ❓ PREGUNTAS PARA TI

Responde mientras haces el diagnóstico:

1. **¿Existen estas tablas?**
   - [ ] requisitions
   - [ ] purchase_orders
   - [ ] inventory_items
   - [ ] requisition_items
   - [ ] purchase_order_items
   - [ ] audit_logs

2. **¿Qué tan antiguos son los datos?** 
   - ¿Fecha más antigua de una requisición?
   - ¿Fecha más antigua de una orden?

3. **¿Hay conflictos de nombres?**
   - Alguna tabla con columna `stock` en lugar de `current_stock`?
   - Alguna tabla con `qty` en lugar de `quantity`?

---

## ✅ RESULTADO QUE OBTENDRÁS

Después de estos pasos:

```
✅ Panel de Control mostrará:
   - 842 Items en Inventario (real)
   - 15 con Stock Bajo (real)
   - Q 487,250 Valor Total (calculado real)
   - 15 Requisiciones Pendientes (real)
   - 5 Órdenes Activas (real)

✅ Gráficos funcionarán:
   - Pie Chart de categorías
   - Bar Chart de requisiciones por mes
   - Line Chart de gastos
   - Actividad reciente

✅ Sistema será consistente:
   - Cada compra suma stock
   - Cada requisición resta stock
   - Totales siempre correctos
```

---

## 🚀 PRÓXIMA TAREA (Después confirmes los pasos anteriores)

Una vez funcione, implementaremos:
1. Lógica en PurchaseOrdersPage para registrar entrada al recibir
2. Lógica en RequisitionsPage para restar stock al despachar
3. Botón "Recibir Orden" que ejecute fn_record_purchase_receipt()
4. Botón "Despachar Requisición" que ejecute fn_record_requisition_dispatch()

---

## 📞 SIGUIENTE

**Ahora: Ve a Supabase y ejecuta el diagnóstico**
**Luego comparteme los resultados**

¿Listo para empezar? 🚀
