# 🔧 Solución: Importar Inventario Denegado para Rol de Compras

## Problema
Al iniciar sesión como "Jefe de Compras", el botón de "📥 Importar Inventario" está denegado con el mensaje:
```
⛔ Solo Jefes de Compra y Administradores pueden importar inventario
```

## Causa Probable
Tu usuario podría tener un rol diferente al que espera. Los posibles nombres de rol son:
- `jefe_compras` ✅
- `compras`
- `admin` ✅
- `purchasing_manager`
- `procurement_manager`

## Solución - Verificar tu Rol

### Opción 1: Ver la Consola del Navegador (Más Fácil)

1. Abre tu navegador en la aplicación
2. Presiona **F12** para abrir Developer Tools
3. Ve a la pestaña **Console**
4. Pega este código y presiona Enter:

```javascript
// Ver el rol del usuario actual
const authStore = JSON.parse(localStorage.getItem('auth-store'));
console.log('Tu rol actual:', authStore?.state?.user?.role);
console.log('Usuario:', authStore?.state?.user?.full_name);
console.log('Datos completos:', authStore?.state?.user);
```

Debería mostrarte algo como:
```
Tu rol actual: jefe_compras
Usuario: Juan Pérez
```

### Opción 2: Ver en el Sidebar

En el sidebar izquierdo, debajo de tu nombre y foto, aparece tu rol.
Nota exactamente qué dice ahí (puede ser con espacios, en minúsculas, etc).

## Cambios Realizados en el Código

He actualizado `InventoryImportPage.tsx` para permitir estos roles adicionales:
- ✅ `jefe_compras`
- ✅ `compras`
- ✅ `admin`
- ✅ `purchasing_manager`

Ahora debería verse así en el archivo:
```typescript
if (!user?.role || (user.role !== 'jefe_compras' && user.role !== 'compras' && user.role !== 'admin' && user.role !== 'purchasing_manager')) {
  return <div className="text-center py-10 text-error">⛔ Solo Jefes de Compra y Administradores pueden importar inventario</div>
}
```

## Próximos Pasos

1. **Recarga la aplicación** (Ctrl+Shift+R)
2. **Abre la consola** (F12)
3. **Ejecuta el código de verificación** para ver tu rol exacto
4. **Intenta acceder a "📥 Importar Inventario"**

Si aún está denegado, **cuéntame exactamente qué rol mostraba la consola** y lo haré compatible.

## Funcionalidad Esperada

Una vez tengas acceso a "Importar Inventario":

### 1. **Cargar Excel**
   - Descarga la plantilla
   - Rellena con tus productos
   - Sube el archivo

### 2. **Mapear Columnas**
   - Asigna las columnas del Excel a los campos del sistema
   - Valida datos

### 3. **Importar**
   - Confirma la importación
   - Los cambios se reflejan **automáticamente** en Inventario

### 4. **Verificar**
   - Ve a **Inventario** → **Productos**
   - Deberías ver los nuevos ítems/cantidades actualizada

## Flujo Automático de Actualización de Inventario

Cuando importas inventario desde el rol de Compras:

1. **Archivo Excel** → Sube a Storage
2. **Mapeo de columnas** → Validación de datos
3. **Importación** → Se guardan en `inventory_imports` table
4. **Procesamiento automático** → Se actualizan las cantidades en `inventory_items`
5. **Reflejo en Dashboard** → El inventario se actualiza automáticamente en tiempo real

## Si Aún No Funciona

Cuéntame:
1. ¿Exactamente qué rol mostraba la consola?
2. ¿Qué dice en el sidebar bajo tu nombre?
3. ¿Hay un error en la consola?

Y lo haré compatible inmediatamente.

---

**Nota**: El cambio ya está implementado en el código. Solo necesitas verificar tu rol exacto.
