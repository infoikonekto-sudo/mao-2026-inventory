# ✅ Solución: Columnas Faltantes en purchase_orders

## Problema
El archivo se subió correctamente a Supabase Storage, pero al intentar guardar el precio y la URL de la factura, recibiste:

```
Error: Could not find the 'invoice_url' column of 'purchase_orders' in the schema cache
```

## Causa
La tabla `purchase_orders` en tu base de datos **NO tiene las columnas necesarias** para almacenar:
- `invoice_url` - URL de la factura en Storage
- `price_confirmed_at` - Timestamp de cuando se confirmó el precio

## Solución ✅

### Paso 1: Ejecutar el Script SQL

1. Ve a **Supabase Dashboard** → **SQL Editor** → **New Query**
2. Copia TODO el contenido de **ADD_INVOICE_COLUMNS.sql**
3. Pega en la consola SQL
4. Ejecuta con `Ctrl+Enter`

### Paso 2: Verificación

El script mostrará estas 2 columnas:

```
| invoice_url | text | 
| price_confirmed_at | timestamp with time zone |
```

### Paso 3: Recarga la Aplicación

- Presiona `Ctrl+Shift+R` para limpiar caché
- Abre la consola (`F12`)

### Paso 4: Intenta Subir la Factura Nuevamente

1. Abre "💰 Cargar Precio Definitivo y Factura"
2. Ingresa precio: `5000`
3. Selecciona archivo: `CARRITO DE IPAD.pdf`
4. Haz clic en **✓ Guardar**

**Debería funcionar correctamente ahora** ✅

## Qué Hace el Script

```sql
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS invoice_url TEXT,
ADD COLUMN IF NOT EXISTS price_confirmed_at TIMESTAMP WITH TIME ZONE;
```

- `invoice_url TEXT` - Almacena la URL pública de Supabase Storage
- `price_confirmed_at TIMESTAMP WITH TIME ZONE` - Registra cuándo se confirmó el precio

La cláusula `IF NOT EXISTS` es segura: si las columnas ya existen, no hace nada.

## Estructura de Datos Ahora

### Tabla: purchase_orders

```
id                      UUID (primary key)
order_number            VARCHAR
supplier_id             UUID (foreign key)
status                  VARCHAR (pending, en_revision, etc)
delivery_date           DATE
created_at              TIMESTAMP
total_amount            NUMERIC (nuevo)
invoice_url             TEXT ← NUEVA COLUMNA
price_confirmed_at      TIMESTAMP ← NUEVA COLUMNA
```

## Flujo Completo Ahora

1. ✅ **Archivo**: Se sube a Supabase Storage → retorna URL pública
2. ✅ **Base de Datos**: Se guarda la URL en `invoice_url`
3. ✅ **Timestamp**: Se registra `price_confirmed_at`
4. ✅ **Estado**: La orden se marca como "completada"

## Próximas Pruebas

Una vez que funcione el upload:

1. ✅ Verifica que el precio se guardó en `total_amount`
2. ✅ Verifica que la URL se guardó en `invoice_url`
3. ✅ Verifica que el estado es "completada"
4. ✅ Haz clic en "Ver Detalles" y confirma que ves la URL de la factura
5. ✅ Haz clic en el link "📄 Ver Documento" para abrir la factura

## Si Aún No Funciona

### Opción 1: Verificar Columnas Manualmente

Ejecuta esta consulta en SQL Editor:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
ORDER BY ordinal_position;
```

Deberías ver ambas columnas en los resultados.

### Opción 2: Revisar Permisos de RLS

Si aún no puedes actualizar, podría haber una política RLS restrictiva:

```sql
-- Ver políticas en purchase_orders
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'purchase_orders';
```

### Opción 3: Reiniciar

```powershell
npm run dev
```

Recarga el navegador con `Ctrl+Shift+R`

---

**Resumen**: Solo necesitas ejecutar `ADD_INVOICE_COLUMNS.sql` en Supabase SQL Editor. Es una operación segura y sin riesgos.
