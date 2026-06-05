# 📊 PLAN INTEGRAL PARA PANEL DE CONTROL CON LÓGICA REAL

## FASE 1: DIAGNÓSTICO ✅
**ACCIÓN INMEDIATA:**
1. Abre Supabase SQL Editor
2. Copia y ejecuta: `DIAGNOSTICO_SUPABASE.sql`
3. Comparteme los resultados

---

## FASE 2: INFRAESTRUCTURA BASE (Crear tablas si faltan)

### A. Crear tabla `inventory_movements` (Rastreo de entradas/salidas)
```sql
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  
  -- Tipo de movimiento
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'purchase_in',      -- Entrada por compra
    'requisition_out',  -- Salida por requisición
    'return',          -- Devolución
    'adjustment',      -- Ajuste de inventario
    'transfer'         -- Transferencia entre ubicaciones
  )),
  
  -- Cantidad (positiva=entrada, negativa=salida)
  quantity DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(12,2),
  
  -- Referencia
  reference_type TEXT,  -- purchase_order, requisition, etc
  reference_id UUID,
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_inventory_movements_item_id ON inventory_movements(inventory_item_id);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
```

### B. Actualizar tabla `inventory_items` si le faltan campos
```sql
-- Verificar que exista current_stock
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS current_stock DECIMAL(12,2) DEFAULT 0;

-- Campo para hacer cálculos
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS minimum_stock DECIMAL(12,2) DEFAULT 10;

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS maximum_stock DECIMAL(12,2) DEFAULT 1000;
```

### C. Crear VISTA SQL para obtener stock actual
```sql
CREATE OR REPLACE VIEW v_inventory_current_stock AS
SELECT 
  ii.id,
  ii.code,
  ii.name,
  ii.category,
  ii.unit_cost,
  COALESCE(SUM(im.quantity), 0) as current_stock,
  ii.minimum_stock,
  ii.maximum_stock,
  ii.location,
  CASE 
    WHEN COALESCE(SUM(im.quantity), 0) <= ii.minimum_stock THEN true 
    ELSE false 
  END as is_low_stock
FROM inventory_items ii
LEFT JOIN inventory_movements im ON ii.id = im.inventory_item_id
GROUP BY ii.id, ii.code, ii.name, ii.category, ii.unit_cost, 
         ii.minimum_stock, ii.maximum_stock, ii.location;
```

### D. Crear VISTA SQL para requisiciones pendientes
```sql
CREATE OR REPLACE VIEW v_requisitions_summary AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) as total_count
FROM requisitions;
```

### E. Crear VISTA SQL para órdenes de compra
```sql
CREATE OR REPLACE VIEW v_purchase_orders_summary AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COALESCE(SUM(total_amount) FILTER (WHERE status IN ('pending','active')), 0) as pending_amount,
  COUNT(*) as total_count
FROM purchase_orders;
```

---

## FASE 3: CREAR FUNCIONES SUPABASE

### A. Función para registrar movimiento de inventario
```sql
CREATE OR REPLACE FUNCTION fn_record_inventory_movement(
  p_item_id UUID,
  p_movement_type TEXT,
  p_quantity DECIMAL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS inventory_movements AS $$
DECLARE
  v_movement inventory_movements;
  v_item RECORD;
BEGIN
  -- Validar que el item existe
  SELECT * INTO v_item FROM inventory_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item no encontrado: %', p_item_id;
  END IF;
  
  -- Crear movimiento
  INSERT INTO inventory_movements (
    inventory_item_id, movement_type, quantity, 
    reference_type, reference_id, notes, created_by
  )
  VALUES (
    p_item_id, p_movement_type, p_quantity,
    p_reference_type, p_reference_id, p_notes, auth.uid()
  )
  RETURNING * INTO v_movement;
  
  -- Actualizar current_stock en inventory_items
  UPDATE inventory_items
  SET current_stock = (
    SELECT COALESCE(SUM(quantity), 0) 
    FROM inventory_movements 
    WHERE inventory_item_id = p_item_id
  )
  WHERE id = p_item_id;
  
  RETURN v_movement;
END;
$$ LANGUAGE plpgsql;
```

### B. Función para crear requisición
```sql
CREATE OR REPLACE FUNCTION fn_create_requisition(
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS requisitions AS $$
DECLARE
  v_requisition requisitions;
BEGIN
  INSERT INTO requisitions (
    status, notes, created_at
  )
  VALUES (
    'pending', p_notes, NOW()
  )
  RETURNING * INTO v_requisition;
  
  -- TODO: Insertar items en requisition_items table
  
  RETURN v_requisition;
END;
$$ LANGUAGE plpgsql;
```

---

## FASE 4: ACTUALIZAR AdminDashboard.tsx

Cambiar consultas de:
```typescript
// ❌ INCORRECTO - No consulta movimientos
const { data: inventoryItems } = await supabase
  .from('inventory_items')
  .select('*')

// ✅ CORRECTO - Usa vista con cálculos
const { data: inventoryItems } = await supabase
  .from('v_inventory_current_stock')
  .select('*')

// ✅ CORRECTO - Usa vista de requisiciones
const { data: reqSummary } = await supabase
  .from('v_requisitions_summary')
  .select('*')
  .single()

// ✅ CORRECTO - Usa vista de órdenes
const { data: orderSummary } = await supabase
  .from('v_purchase_orders_summary')
  .select('*')
  .single()
```

---

## FASE 5: IMPLEMENTAR LÓGICA DE MOVIMIENTOS

### Cuando se RECIBE una orden de compra:
```typescript
// En PurchaseOrdersPage.tsx
async function confirmPurchaseOrderReceipt(orderId: string, items: any[]) {
  for (const item of items) {
    // Registrar entrada de inventario
    await supabase.rpc('fn_record_inventory_movement', {
      p_item_id: item.inventory_item_id,
      p_movement_type: 'purchase_in',
      p_quantity: item.quantity,
      p_reference_type: 'purchase_order',
      p_reference_id: orderId,
      p_notes: `Recepción OC-${orderId}`
    })
  }
  
  // Actualizar estado de la orden
  await supabase
    .from('purchase_orders')
    .update({ status: 'completed' })
    .eq('id', orderId)
}
```

### Cuando se APRUEBA una requisición:
```typescript
// En RequisitionsPage.tsx
async function approveRequisition(reqId: string, items: any[]) {
  for (const item of items) {
    // Registrar salida de inventario
    await supabase.rpc('fn_record_inventory_movement', {
      p_item_id: item.inventory_item_id,
      p_movement_type: 'requisition_out',
      p_quantity: -item.quantity,  // NEGATIVO para salida
      p_reference_type: 'requisition',
      p_reference_id: reqId,
      p_notes: `Despacho REQ-${reqId}`
    })
  }
  
  // Actualizar estado
  await supabase
    .from('requisitions')
    .update({ status: 'approved' })
    .eq('id', reqId)
}
```

---

## 📋 RESUMEN DE PASOS

| # | Paso | Tiempo | Prioridad |
|---|------|--------|-----------|
| 1 | Ejecutar DIAGNOSTICO_SUPABASE.sql | 5 min | 🔴 AHORA |
| 2 | Crear tabla inventory_movements | 2 min | 🔴 AHORA |
| 3 | Crear vistas SQL (v_inventory_current_stock, etc) | 5 min | 🔴 AHORA |
| 4 | Crear función fn_record_inventory_movement | 3 min | 🔴 AHORA |
| 5 | Actualizar AdminDashboard para usar vistas | 10 min | 🟡 PRÓXIMO |
| 6 | Implementar lógica en PurchaseOrdersPage | 15 min | 🟡 PRÓXIMO |
| 7 | Implementar lógica en RequisitionsPage | 15 min | 🟡 PRÓXIMO |
| 8 | Crear triggers automáticos en Supabase | 10 min | 🟢 OPCIONAL |

---

## 🎯 RESULTADO FINAL

✅ Panel de Control mostrará:
- ✅ Items en inventario (calculado desde movements)
- ✅ Stock bajo (comparar current_stock vs minimum_stock)
- ✅ Requisiciones pendientes (count desde vista)
- ✅ Órdenes activas (count desde vista)
- ✅ Valor total (sum de unit_cost × current_stock)
- ✅ Gráficos con datos reales
- ✅ Actividad reciente (últimos movimientos)

✅ Sistema será consistente porque:
- Cada entrada/salida se registra en inventory_movements
- current_stock siempre actualizado automáticamente
- Vistas SQL garantizan datos frescos
- Funciones previenen errores de lógica
