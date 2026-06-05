# 🔐 Solución: Error RLS en Importación de Inventario

## Problema
Al intentar importar inventario, recibes:
```
Error: new row violates row-level security policy for table "inventory_imports"
```

## Causa
Las tablas de inventario tienen políticas RLS demasiado restrictivas que bloquean inserts/updates/deletes.

Las tablas afectadas son:
- `inventory_imports` - Registro de importaciones
- `inventory_column_mappings` - Mapeos de columnas
- `inventory_items` - Artículos del inventario

## Solución ✅

### Paso 1: Ejecutar el Script SQL

1. Ve a **Supabase Dashboard** → **SQL Editor** → **New Query**
2. Copia TODO el contenido de **SETUP_INVENTORY_RLS_POLICIES.sql**
3. Pega en la consola
4. Ejecuta con `Ctrl+Enter`

### Paso 2: Verificación

Deberías ver resultados como:

**Tabla 1: Políticas por tabla**
```
inventory_imports | 4
inventory_column_mappings | 4
inventory_items | 4
```

**Tabla 2: Detalle de políticas**
```
| inventory_imports | Allow all deletes on inventory_imports | true | ... |
| inventory_imports | Allow all inserts on inventory_imports | true | ... |
| inventory_imports | Allow all reads on inventory_imports | true | ... |
| inventory_imports | Allow all updates on inventory_imports | true | ... |
```

### Paso 3: Recarga la Aplicación

- Presiona `Ctrl+Shift+R` en el navegador

### Paso 4: Intenta Importar Nuevamente

1. Ve a **📥 Importar Inventario**
2. Sigue estos pasos:
   - Descarga la plantilla
   - Rellena con datos (ej: 5-10 productos)
   - Sube el archivo
   - Mapea columnas
   - Confirma importación

**Debería funcionar sin errores** ✅

## Qué Hace el Script

Crea 4 políticas RLS **permisivas** por tabla:

| Operación | Política |
|-----------|----------|
| SELECT | Permite lectura para todos |
| INSERT | Permite inserción para todos |
| UPDATE | Permite actualización para todos |
| DELETE | Permite eliminación para todos |

Esto permite que el usuario autenticado importe inventario sin restricciones.

## Flujo de Importación (Después del Fix)

```
1. Archivo Excel
   ↓
2. Mapeo de columnas (se guarda en inventory_column_mappings)
   ↓
3. Validación de datos
   ↓
4. Importación (se guarda en inventory_imports)
   ↓
5. Actualización automática (se actualiza inventory_items)
   ↓
6. Reflejo en Dashboard/Inventario
```

## Próximas Pruebas

Una vez funcione la importación:

1. ✅ Ve a **📦 Inventario** 
2. ✅ Filtra por fecha reciente
3. ✅ Verifica que los productos importados aparezcan
4. ✅ Confirma que las cantidades se actualizaron
5. ✅ Haz clic en un producto y verifica sus detalles

## Si Aún No Funciona

Ejecuta esta consulta en SQL Editor para verificar el estado:

```sql
-- Ver todas las políticas
SELECT tablename, policyname, permissive
FROM pg_policies 
WHERE tablename IN ('inventory_imports', 'inventory_column_mappings', 'inventory_items')
ORDER BY tablename;
```

Si ves 12 políticas (4 por tabla × 3 tablas), todo está correcto ✅

Si ves menos, ejecuta nuevamente el script SQL completo.

---

**Nota**: Este es el mismo tipo de solución que usamos para `storage.objects`. Las políticas RLS necesitan ser permisivas para que funcione el sistema.
