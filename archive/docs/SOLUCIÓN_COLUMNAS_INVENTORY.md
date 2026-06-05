# ✅ Solución: Columnas Faltantes en inventory_items

## Problema
Al intentar importar inventario, recibes:
```
Error: Could not find the 'code' column of 'inventory_items' in the schema cache
```

## Causa
La tabla `inventory_items` en tu base de datos está faltando varias columnas necesarias para almacenar los datos del inventario.

## Solución ✅

### Paso 1: Ejecutar el Script SQL

1. Ve a **Supabase Dashboard** → **SQL Editor** → **New Query**
2. Copia TODO el contenido de **ADD_INVENTORY_COLUMNS.sql**
3. Pega en la consola
4. Ejecuta con `Ctrl+Enter`

### Paso 2: Verificación

El script mostrará todas las columnas de `inventory_items`. Deberías ver estas 14 columnas:

```
| code               | character varying     |
| sku                | character varying     |
| name               | character varying     |
| description        | text                  |
| category           | character varying     |
| quantity           | numeric               |
| unit               | character varying     |
| unit_cost          | numeric               |
| location           | character varying     |
| current_stock      | numeric               |
| reorder_level      | numeric               |
| last_imported      | timestamp with time zone |
| import_reference   | character varying     |
```

### Paso 3: Recarga la Aplicación

- Presiona `Ctrl+Shift+R` en el navegador

### Paso 4: Intenta Importar Nuevamente

1. Ve a **📥 Importar Inventario**
2. Sigue estos pasos:
   - Descarga la plantilla
   - Rellena con datos
   - Sube el archivo
   - Mapea columnas (asigna tus columnas a las del sistema)
   - Confirma importación

**Debería funcionar sin errores** ✅

## Estructura de Columnas Ahora

### Identificadores
- `code` - Código único del producto
- `sku` - SKU del proveedor

### Información Básica
- `name` - Nombre del producto
- `description` - Descripción detallada
- `category` - Categoría del producto
- `unit` - Unidad de medida (caja, pieza, metro, etc)

### Inventario
- `quantity` - Cantidad original al importar
- `current_stock` - Stock actual (actualizado automáticamente)
- `unit_cost` - Costo unitario
- `location` - Ubicación física del producto
- `reorder_level` - Cantidad mínima para reorden

### Auditoría
- `last_imported` - Timestamp de última importación
- `import_reference` - Referencia a la importación

## Próximas Pruebas

Una vez funcione la importación:

1. ✅ **Importa un archivo Excel con 5-10 productos**
2. ✅ **Ve a 📦 Inventario**
3. ✅ **Filtra por productos recientes**
4. ✅ **Verifica cantidades y detalles**
5. ✅ **Intenta crear una requisición con esos productos**

## Si Aún No Funciona

### Opción 1: Verificar Columnas Manualmente

Ejecuta en SQL Editor:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inventory_items'
ORDER BY ordinal_position;
```

Debería mostrar mínimo 14 columnas.

### Opción 2: Verificar Mapeo de Columnas

Cuando importas, el sistema te pide "Mapear Columnas" - asegúrate de:
1. Tu Excel tiene columnas como: `Code`, `Name`, `Quantity`, etc.
2. Las mapeas correctamente a los campos del sistema
3. Especialmente asegúrate de mapear `Code` (obligatorio)

### Opción 3: Revisar Permisos RLS

Las políticas RLS en `inventory_items` deben permitir INSERT/UPDATE/SELECT.
Ya ejecutaste `SETUP_INVENTORY_RLS_POLICIES.sql`, así que deberían estar bien.

---

**Resumen**: Solo necesitas ejecutar `ADD_INVENTORY_COLUMNS.sql` en Supabase SQL Editor.
