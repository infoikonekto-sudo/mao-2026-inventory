# 📲 GUÍA VISUAL - Cómo Activar la Importación Enterprise

## 🎬 Video-Guía en Texto

### PASO 1: Ejecutar SQL en Supabase (2 minutos)

#### 1.1 Abre Supabase Dashboard
```
URL: https://app.supabase.com/
→ Abre en tu navegador
```

#### 1.2 Selecciona el Proyecto
```
En el panel izquierdo:
→ Busca "MAO 2026"
→ Click en él
```

#### 1.3 Ve a SQL Editor
```
En el menú lateral:
→ SQL Editor (en la sección "Development")
→ Click en "New query"
```

#### 1.4 Copia el SQL
```
Opción A (Recomendado):
→ Abre el archivo: SQL_EJECUTAR_EN_SUPABASE.sql
→ Copia TODO el contenido (Ctrl+A → Ctrl+C)

Opción B (Copiar/Pegar aquí abajo):
```

#### 1.5 Pega en el Editor
```
En el editor de Supabase:
→ Click en el textarea
→ Ctrl+A (para seleccionar todo si hay algo)
→ Ctrl+V (pega el SQL)
```

#### 1.6 Ejecuta el SQL
```
Button "Run" (esquina superior derecha del editor)
→ Espera a que termine
→ Deberías ver: "Success. No rows returned"
```

#### 1.7 Verifica que las Tablas se Crearon
```
En el menú lateral:
→ Table Editor (o "Tables")
→ Deberías ver 3 nuevas tablas:
   ✓ inventory_imports
   ✓ inventory_column_mappings
   ✓ inventory_import_errors
```

---

### PASO 2: Reiniciar el Servidor (1 minuto)

#### 2.1 Abre Terminal en VS Code
```
Ctrl+Ñ (o Ctrl+`)
→ Se abre terminal abajo
```

#### 2.2 Detén el servidor anterior (si está corriendo)
```
Si hay algo corriendo:
→ Ctrl+C (para detener)
```

#### 2.3 Navega a la carpeta del proyecto
```
Terminal:
cd "c:\Users\Usuario\Downloads\mao 2026"
→ Presiona Enter
```

#### 2.4 Inicia el servidor
```
npm run dev
→ Presiona Enter
→ Espera a que termine
→ Deberías ver: "Local: http://localhost:5176"
```

---

### PASO 3: Abre la Aplicación (1 minuto)

#### 3.1 Abre el navegador
```
URL: http://localhost:5176
→ Enter
```

#### 3.2 Login
```
Usar usuario con rol:
→ Admin, O
→ Jefe de Compras
```

#### 3.3 Navega al Dashboard
```
Una vez logeado, deberías estar en el Dashboard
```

---

### PASO 4: Accede a Importación (1 minuto)

#### 4.1 Busca el Menu Item
```
En el Sidebar (lado izquierdo):
→ Busca "📥 Importar Inventario"
→ Está después de "Inventario" (📦)
```

#### 4.2 Click
```
→ Click en "📥 Importar Inventario"
→ Se abre la página de importación
```

---

### PASO 5: Prueba la Importación (10 minutos)

#### 5.1 Descarga la Plantilla
```
En la página de Importación:
→ Botón "Descargar Plantilla"
→ Se descarga: template_inventario.xlsx
```

#### 5.2 Llena la Plantilla
```
Abre el archivo Excel descargado:
→ Llena con datos de prueba:

| SKU    | Código | Nombre           | Descripción      | Cantidad | Precio |
|--------|--------|------------------|------------------|----------|--------|
| TEST01 | 001    | Item de Prueba 1 | Descripción 1    | 10       | 100.00 |
| TEST02 | 002    | Item de Prueba 2 | Descripción 2    | 5        | 50.00  |
| TEST03 | 003    | Item de Prueba 3 | Descripción 3    | 20       | 75.00  |

→ Guarda (Ctrl+S)
```

#### 5.3 Vuelve a la Página
```
En la navegador (si cerraste):
→ http://localhost:5176/dashboard/inventory-import
```

#### 5.4 STEP 1: Upload
```
Opción A (Drag-Drop):
→ Arrastra el archivo Excel a la zona de DROP

Opción B (Click):
→ Click en "Click aquí para seleccionar"
→ Selecciona el archivo

→ El archivo se carga
→ Verás el nombre del archivo
```

#### 5.5 STEP 2: Column Mapping
```
Deberías ver:
→ Columnas detectadas: SKU, Código, Nombre, Descripción, Cantidad, Precio
→ Status: "✓ Todas las columnas mapeadas"

Si auto-mapping falla:
→ Mapea manualmente usando los dropdowns
→ Select: "SKU" para la columna SKU
→ Select: "Código" para la columna Código
→ etc.

Opcional:
→ Click "Guardar este Mapeo"
→ Nombre: "Plantilla Estándar"
→ Click "Guardar"
```

#### 5.6 STEP 3: Preview
```
Verás:
→ Primeras filas mapeadas
→ "Total de filas: 3"
→ "Campos requeridos mapeados: ✓"
→ "Validación: PASS ✓"

Debajo:
→ "Mapeo guardado como: Plantilla Estándar" (si lo guardaste)

Click:
→ Botón "Siguiente" o "Importar"
```

#### 5.7 STEP 4: Importing
```
Se activa:
→ Barra de progreso: 0% → 100%
→ Contador: "1 de 3", "2 de 3", "3 de 3"
→ Status: "Importando 3 items..."

Espera a que termine (debería ser rápido: < 5 seg)
```

#### 5.8 STEP 5: Results
```
Verás:
→ "✓ 3 items importados exitosamente"
→ "Éxito: 3"
→ "Errores: 0"
→ "Tasa de éxito: 100%"

Botones disponibles:
→ "Deshacer esta importación" (para probar undo)
→ "NuevaImportación" (para importar más)
```

---

### PASO 6: Verifica en Supabase (5 minutos)

#### 6.1 Abre Supabase Dashboard
```
URL: https://app.supabase.com
```

#### 6.2 Ve a inventory_items
```
SQL Editor o Table Editor:
→ Busca tabla "inventory_items"
→ Deberías ver los 3 items que importaste
```

#### 6.3 Ve a inventory_imports
```
→ Tabla "inventory_imports"
→ Deberías ver 1 fila con:
   - filename: "template_inventario.xlsx"
   - total_rows: 3
   - success_rows: 3
   - error_rows: 0
   - status: "completada"
```

#### 6.4 Ve a inventory_column_mappings
```
→ Tabla "inventory_column_mappings"
→ Si guardaste el mapeo, deberías ver 1 fila
```

---

### PASO 7: Prueba Undo (Opcional - 5 minutos)

#### 7.1 Vuelve a la Página de Importación
```
http://localhost:5176/dashboard/inventory-import
```

#### 7.2 Ve al STEP 1
```
Deberías ver el historial:
→ "template_inventario.xlsx" (3 items)
→ Botón rojo "🗑️ Deshacer" (trash icon)
```

#### 7.3 Click Deshacer
```
→ Click en "🗑️ Deshacer"
→ Confirmación: "¿Estás seguro?"
→ Click "Sí, deshacer"
```

#### 7.4 Verifica
```
En Supabase, tabla inventory_items:
→ Los 3 items deberían haber desaparecido

En inventory_imports:
→ El status debe cambiar a "revertida"
→ O puede haber una nueva entrada de undo
```

---

## 🎯 Pruebas con Errores (Opcional)

### Prueba 1: Campo Requerido Faltante
```
Descarga plantilla nuevamente
En Excel, deja la columna "SKU" vacía para una fila
→ Importa
→ Deberías ver error: "SKU requerido"
```

### Prueba 2: Duplicados
```
En Excel, repite el mismo SKU en 2 filas
→ Importa
→ Deberías ver error: "SKU duplicado"
```

### Prueba 3: Formato Inválido
```
En Excel, en la columna "Cantidad" pon texto (ej: "abc")
→ Importa
→ Deberías ver error: "Formato inválido"
```

---

## 📋 Checklist de Éxito

- [ ] SQL ejecutado en Supabase sin errores
- [ ] 3 tablas nuevas visibles en Supabase
- [ ] Servidor corriendo (npm run dev)
- [ ] Menu item "📥 Importar Inventario" visible
- [ ] Plantilla descargable
- [ ] Importación exitosa de 3 items
- [ ] Items visibles en inventory_items
- [ ] Historial visible en inventory_imports
- [ ] Undo funciona (items desaparecen)
- [ ] Errores capturados correctamente

---

## 🚨 Troubleshooting

### Problema: "Menu item no aparece"
**Solución:**
- Verifica que el usuario sea Admin o Jefe de Compras
- Recarga la página (F5)
- Reinicia el servidor (npm run dev)

### Problema: "Página en blanco"
**Solución:**
- Abre la consola (F12) y busca errores rojos
- Reinicia servidor
- Verifica que las tablas SQL existen

### Problema: "Error al subir archivo"
**Solución:**
- El archivo debe ser .xlsx o .csv
- Verifica que tiene headers en la primera fila
- Intenta descargando la plantilla primero

### Problema: "No puedo hacer undo"
**Solución:**
- Verifica que status = "completada" (no "fallida")
- Verifica que can_undo = true en Supabase
- Intenta actualizar la página

### Problema: "Items no aparecen en inventory_items"
**Solución:**
- Recarga la página de Inventario (F5)
- Verifica que el import status = "completada"
- Abre la consola para ver errores

---

## 📞 Información de Contacto

Si algo no funciona:
1. Verifica esta guía
2. Busca en el troubleshooting
3. Revisa los errores en console (F12)
4. Verifica Supabase Dashboard directamente

---

## ✅ ¡LISTO!

Una vez completados todos los pasos, tienes un **sistema enterprise de importación de inventario** completamente funcional con:

✅ Carga de archivos Excel/CSV
✅ Mapeo personalizado de columnas
✅ Validación compleja
✅ Historial completo
✅ Deshacer (undo)
✅ Notificaciones en tiempo real
✅ Reportes de errores
✅ Plantillas descargables
✅ Todo en Supabase (0% local)

**¡Felicidades! 🎉**

