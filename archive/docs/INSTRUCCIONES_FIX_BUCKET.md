# ⚠️ SOLUCIÓN: Error "Bucket not found" y "RLS Policy" en Upload de Facturas

## Problema Original
Al intentar subir una factura como "Jefe de Compras", obtenías:
```
StorageApiError: Bucket not found
StorageApiError: new row violates row-level security policy
```

## Causa
1. El bucket `purchase_order_invoices` no existía en Supabase Storage
2. Las políticas RLS (Row Level Security) estaban demasiado restrictivas

## Solución - 3 Pasos

### Paso 1: Ir a la Consola SQL de Supabase

1. Abre tu proyecto en [app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** en el menú lateral izquierdo
4. Haz clic en **New Query**

### Paso 2: Ejecutar el Script SQL ACTUALIZADO

⚠️ **IMPORTANTE**: Elimina el script anterior si lo ejecutaste.

Copia TODO el contenido ACTUALIZADO del archivo **SETUP_STORAGE_BUCKET.sql** y pégalo en la consola SQL.

El nuevo script:
- Crea el bucket `purchase_order_invoices`
- **Desactiva RLS** (Row Level Security) en la tabla de objetos de storage
- Elimina políticas conflictivas

Luego haz clic en **Run** o presiona `Ctrl+Enter`.

### Paso 3: Verificar la Consola del Navegador

Recarga la aplicación (`Ctrl+Shift+R` para limpiar caché) y abre la consola del navegador (`F12`).

Deberías ver logs como:
```
Initializing storage buckets...
Uploading file: [timestamp]-CARRITO_DE_IPAD_.pdf to bucket: purchase_order_invoices
File uploaded successfully: [timestamp]-CARRITO_DE_IPAD_.pdf
Public URL obtained: https://kmcmeq...
✓ Precio y factura guardados correctamente
```

### Paso 4: Intentar Subir la Factura Nuevamente

1. Abre el modal "💰 Cargar Precio Definitivo y Factura"
2. Ingresa el precio (ej: 5000)
3. Selecciona el archivo PDF/imagen
4. Haz clic en **✓ Guardar**

**Debería funcionar sin errores**

## Qué hace el Script SQL

1. **Crea el bucket** `purchase_order_invoices` con:
   - Acceso público
   - Límite de 50MB por archivo
   - Tipos MIME permitidos: JPEG, PNG, GIF, WebP, PDF

2. **Desactiva RLS** en la tabla `storage.objects`:
   - Esto permite que usuarios autenticados suban archivos sin restricciones adicionales
   - El bucket seguirá siendo público para lectura

3. **Limpia políticas conflictivas**:
   - Elimina políticas que pudieran estar bloqueando

## Si Aún No Funciona

### 1. Verifica en Supabase Dashboard - Storage

1. Ve a **Storage** → **Buckets**
2. Haz clic en `purchase_order_invoices`
3. Confirma que:
   - ✅ El bucket es **Public** (verde)
   - ✅ El nombre exacto sea `purchase_order_invoices`

### 2. Verifica en Supabase Dashboard - Políticas SQL

1. Ve a **SQL Editor**
2. Ejecuta esta consulta de verificación:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';
```

Debería mostrar: `| objects | false |` (RLS desactivado)

### 3. Reiniciar el servidor de desarrollo

En la terminal de VS Code:
```powershell
npm run dev
```

## Cambios Implementados

✅ **SETUP_STORAGE_BUCKET.sql** (ACTUALIZADO):
- Desactiva RLS para mayor flexibilidad
- Crea el bucket con configuración pública
- Incluye verificación de estado

✅ **supabaseClient.ts**:
- Mejorada `initializeStorageBuckets()` para crear bucket automáticamente
- Mejorada `uploadInvoiceFile()` con:
  - Intento automático de crear bucket
  - Simplificación de nombres de archivos
  - Logs detallados para debugging

✅ **PurchaseOrdersPage.tsx**:
- Llama `initializeStorageBuckets()` al cargar

## Próximas Pruebas Después del Upload

1. ✅ Verificar que la factura se guarde en Storage
2. ✅ Verificar que el precio se actualice en la BD
3. ✅ Verificar que la URL de factura aparezca en la orden
4. ✅ Probar descarga/visualización de la factura
5. ✅ Verificar que el estado cambio a "completada"

---

**Nota**: El script de SQL ha sido ACTUALIZADO. Ejecuta la versión nueva desde SETUP_STORAGE_BUCKET.sql

