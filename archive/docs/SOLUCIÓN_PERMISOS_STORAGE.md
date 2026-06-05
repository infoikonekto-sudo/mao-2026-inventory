# 🔐 Solución: Error "must be owner of table objects"

## Problema
Al ejecutar el script SQL anterior, recibiste:
```
ERROR: 42501: must be owner of table objects
```

## Causa
Intentábamos desactivar RLS con `ALTER TABLE`, lo que requiere permisos de propietario (owner) de la tabla. En Supabase, la tabla `storage.objects` pertenece a Supabase, no a tu usuario.

## Solución ✅
El nuevo script SQL **NO intenta desactivar RLS**, sino que **crea políticas MÁS PERMISIVAS** que permiten:
- ✅ Lectura pública para todos
- ✅ Inserts para usuarios autenticados Y anónimos
- ✅ Deletes para usuarios autenticados Y anónimos
- ✅ Updates para usuarios autenticados Y anónimos

## Pasos a Ejecutar

### 1. Abre Supabase Console
- Ve a [app.supabase.com](https://app.supabase.com)
- Selecciona tu proyecto
- Ve a **SQL Editor** → **New Query**

### 2. Copia el Script Actualizado
Copia TODO el contenido de `SETUP_STORAGE_BUCKET.sql` (la versión nueva sin ALTER TABLE)

### 3. Ejecuta en la Consola SQL
- Pega el script en la consola
- Haz clic en **Run** o presiona `Ctrl+Enter`

### 4. Deberías Ver Estos Resultados

**Resultado PASO 7** (Bucket creado):
```
| purchase_order_invoices | purchase_order_invoices | true | 52428800 |
```

**Resultado PASO 8** (Políticas creadas):
```
| 4 |
```

Si ves estos resultados, ¡todo está correcto! ✅

### 5. Recarga la Aplicación
- Presiona `Ctrl+Shift+R` para limpiar caché
- Abre la consola (`F12`)

### 6. Intenta Subir la Factura
1. Haz clic en "💰 Cargar Precio Definitivo y Factura"
2. Ingresa el precio
3. Selecciona el archivo
4. Haz clic en "✓ Guardar"

**Debería funcionar sin errores** ✅

## Qué Hacen las Nuevas Políticas

| Política | Acción | Quién | Restricción |
|----------|--------|-------|------------|
| Allow all public reads | SELECT | Todos | Ninguna (público) |
| Allow authenticated inserts | INSERT | Auth + Anon | Ninguna |
| Allow authenticated deletes | DELETE | Auth + Anon | Ninguna |
| Allow authenticated updates | UPDATE | Auth + Anon | Ninguna |

Estas políticas son lo suficientemente permisivas para permitir uploads desde la aplicación sin requerir permisos de owner.

## Si Aún No Funciona

1. **Verifica en Storage Dashboard**:
   - Ve a **Storage** → **Buckets**
   - Confirma que existe `purchase_order_invoices`
   - Verifica que esté público (verde)

2. **Verifica las Políticas**:
   - Ve a **Authentication** → **Policies** → **storage.objects**
   - Deberías ver 4 políticas nuevas

3. **Reinicia el servidor**:
   ```powershell
   npm run dev
   ```

4. **Abre consola del navegador** (`F12`):
   - Intenta subir la factura
   - Mira los logs en la consola para errores adicionales

## Cambios de Código

El código de TypeScript ya está configurado correctamente en:
- ✅ `supabaseClient.ts` - Función `uploadInvoiceFile()`
- ✅ `PurchaseOrdersPage.tsx` - Llama `initializeStorageBuckets()`

Solo necesitabas ejecutar el script SQL correcto.

---

**Versión anterior problemática**: `ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY` (requiere permisos owner)

**Versión nueva (funciona)**: Crear 4 políticas RLS permisivas (no requiere permisos owner)
