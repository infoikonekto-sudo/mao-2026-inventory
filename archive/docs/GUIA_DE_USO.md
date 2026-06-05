# 🚀 GUÍA DE USO - MAO 2026 Sistema de Gestión

## Acceso al Sistema

**URL:** `http://localhost:5176`

### Códigos de Prueba (Disponibles):
- `MAR-7K2Q9` - Profesor
- `JEF-9B3X1` - Jefe de Compras  
- `ADM-5K8L2` - Administrador

---

## 📑 ÍNDICE DE CARACTERÍSTICAS

### ✅ 4 Características Principales Implementadas

1. **Flujo de Aprobación de Requisiciones**
   - Crear requisiciones
   - Aprobar/Rechazar
   - Reducción automática de inventario
   - Historial completo

2. **Sistema de Órdenes de Compra**
   - Crear órdenes desde solicitudes
   - Estados: Borrador → Pendiente → En Tránsito → Completada
   - Seguimiento de entregas
   - Historial de costos

3. **Notificaciones por Email**
   - Automático en cambios de estado
   - Historial de notificaciones
   - Registros en audit_logs

4. **Exportación de Reportes**
   - CSV, PDF, XLSX
   - Múltiples tipos de datos
   - Historial de descargas

---

## 🎯 GUÍA PASO A PASO

### 1. GESTIÓN DE USUARIOS (Admin Only)

**Acceso:** Dashboard → 👥 Usuarios

**Crear un Usuario:**
1. Clic en "Nuevo Usuario"
2. Llenar datos:
   - Nombre Completo
   - Email (opcional)
   - Rol (Profesor, Jefe de Compras, Admin)
   - Departamento (opcional)
3. Generar código (🎲 botón) o escribir uno
4. Guardar

**Editar Usuario:**
1. Clic en icono ✏️ en la tabla
2. Modificar datos
3. Guardar

**Eliminar Usuario:**
1. Clic en icono 🗑️
2. Confirmar eliminación

---

### 2. INVENTARIO

**Acceso:** Dashboard → 📦 Inventario

**Ver Inventario:**
- Tabla con todos los items
- Código, nombre, stock actual/mínimo
- Precio unitario y valor total
- Indicador de stock bajo (rojo)

**Crear Item:**
1. Clic en "+ Nuevo Item"
2. Campos:
   - Código (único)
   - Nombre
   - Categoría (Librería, Mobiliario, Herramientas, etc.)
   - Stock actual
   - Stock mínimo
   - Costo unitario
   - Ubicación (opcional)
3. Guardar

**Editar Item:**
1. Clic en ✏️
2. Modificar datos
3. Guardar

**Eliminar Item:**
1. Clic en 🗑️
2. Confirmar

**Funcionalidad Realtime:**
- Los cambios aparecen automáticamente en otros dispositivos
- No hay necesidad de refrescar

---

### 3. REQUISICIONES

**Acceso:** Dashboard → 📋 Requisiciones

**Crear Requisición:**
1. Clic en "+ Nueva Requisición"
2. Llenar:
   - Descripción
   - Cantidad
   - Prioridad (Baja, Media, Alta, Urgente)
   - Notas (opcional)
3. Enviar

**Estados:**
- 📝 Pendiente - Esperando revisión
- 🔄 En Revisión - Siendo evaluada
- ✅ Aprobada - Inventario reducido
- ❌ Rechazada - Denegada

**Acciones (Jefe de Compras):**
- Aprobar → Reduce inventario automáticamente
- Rechazar → Se queda en historial
- Enviar a Revisión → Solicita más info

---

### 4. SOLICITUDES DE COMPRA

**Acceso:** Dashboard → 🛒 Solicitudes de Compra

**Crear Solicitud:**
1. Clic en "+ Nueva Solicitud"
2. Datos:
   - Descripción del producto/servicio
   - Monto estimado
   - Prioridad
   - Justificación (opcional)
3. Enviar

**Aprobación:**
- Jefe de Compras aprueba
- Se puede convertir en Orden de Compra
- Email de notificación automático

---

### 5. ÓRDENES DE COMPRA

**Acceso:** Dashboard → 📑 Órdenes de Compra

**Crear desde Solicitud Aprobada:**
1. Seleccionar solicitud
2. Clic en "+ Crear Orden"
3. Asignar proveedor
4. Definir monto final
5. Guardar

**Estados de Orden:**
- 📝 Borrador
- ⏳ Pendiente
- 🔍 En Revisión  
- 📦 En Tránsito
- ✅ Completada
- ❌ Cancelada

---

### 6. PROVEEDORES

**Acceso:** Dashboard → 🏢 Proveedores

**Crear Proveedor:**
1. Clic en "+ Nuevo Proveedor"
2. Datos:
   - Nombre
   - Email
   - Teléfono
   - Dirección
   - Contacto
   - Rating (1-5)
3. Guardar

**Gestión:**
- Editar información
- Ver historial de órdenes
- Calificación automática (5⭐ por defecto)

---

### 7. REPORTES PROFESIONALES (Nuevo)

**Acceso:** Dashboard → 📊 Reportes Profesionales

**Tipos de Reportes:**

#### A. Requisiciones
- Tabla con solicitante, descripción, cantidad, prioridad, estado
- Filtrable por fecha
- Descargable en PDF y XLSX

#### B. Solicitudes de Compra
- Información de solicitudes
- Montos y estado de aprobación
- Historial de cambios

#### C. Órdenes de Compra
- Órdenes por proveedor
- Montos totales
- Fechas de entrega
- Estados

#### D. Inventario
- Listado completo con stock
- Valuación total
- Items con stock bajo marcados
- Total por categoría

**Descargar:**
1. Seleccionar tipo de reporte
2. Revisar datos en "Vista Previa"
3. Clic en "Descargar PDF" o "Descargar Excel"
4. Se guarda automáticamente en historial

**Historial:**
- Fecha de descarga
- Tipo y formato
- Usuario que descargó
- Accesible en la BD

---

### 8. VERIFICACIÓN DE CONEXIONES (Admin Only)

**Acceso:** Dashboard → 🔗 Verificación de Conexiones

**Ejecutar Pruebas:**
1. Clic en "Ejecutar Pruebas de Conexión"
2. Esperar a que se completen (< 10 segundos)
3. Ver resultados:
   - ✅ Verde = Conexión exitosa
   - ❌ Rojo = Error detectado
   - ⏱️ Tiempo de respuesta en ms

**Pruebas Incluidas:**
- Supabase principal
- 10 tablas de la base de datos
- Realtime (suscripciones)
- RLS (Seguridad)
- Auditoría

**Información del Sistema:**
- Usuario actual
- Rol asignado
- ID de Licencia

---

### 9. AUDITORÍA

**Acceso:** Dashboard → 🔍 Auditoría

**Registros:**
- Todas las acciones del sistema
- Usuario que las realizó
- Timestamp exacto
- Detalles de cambios

**Filtros:**
- Por tipo de acción
- Por usuario
- Por fecha
- Por módulo

---

### 10. CONFIGURACIÓN (Admin)

**Acceso:** Dashboard → ⚙️ Configuración

**Opciones:**
- Datos de la licencia
- Ajustes del sistema
- Políticas de privacidad
- Información técnica

---

## 🔐 SISTEMA DE PERMISOS

### 👤 Profesor
```
✅ Ver Dashboard
✅ Ver Inventario (solo lectura)
✅ Crear Requisiciones
✅ Ver mis Requisiciones
✅ Descargar Reportes (solo mis datos)
✅ Ver Perfil
❌ Gestionar Usuarios
❌ Crear Órdenes
❌ Acceder a Auditoría
```

### 👔 Jefe de Compras
```
✅ Todas de Profesor +
✅ Crear/Editar/Eliminar Inventario
✅ Crear Solicitudes de Compra
✅ Crear Órdenes de Compra
✅ Gestionar Proveedores
✅ Aprobar/Rechazar Requisiciones
✅ Descargar Reportes (todos)
✅ Ver Auditoría
❌ Gestionar Usuarios
❌ Acceder a Verificación
```

### 🔐 Administrador
```
✅ Acceso Total +
✅ Gestionar Usuarios (CRUD)
✅ Verificar Conexiones a Supabase
✅ Gestionar Configuración
✅ Ver todos los Reportes
✅ Acceso a Auditoría Completa
```

---

## 💾 DATOS EN TIEMPO REAL (Realtime)

**¿Cómo funciona?**
- Cuando alguien hace un cambio en una tabla
- Todos los usuarios conectados reciben la actualización automáticamente
- Latencia: < 1 segundo
- No requiere refrescar la página

**Tablas con Realtime:**
- 📦 Inventario
- 👥 Usuarios (para admin)
- 📋 Requisiciones
- 🛒 Solicitudes de Compra
- 📑 Órdenes de Compra
- 🏢 Proveedores

**Ejemplo:**
1. Usuario A crea un nuevo item en Inventario
2. Usuario B ve el nuevo item automáticamente
3. Ambos pueden editar sin conflictos (versión final prevalece)

---

## 📧 NOTIFICACIONES AUTOMÁTICAS

**Cuándo se envían:**
- ✅ Requisición aprobada
- ❌ Requisición rechazada
- 🛒 Solicitud de compra creada
- 📑 Orden de compra creada
- 📦 Inventario bajo stock

**Destinatarios:**
- Solicitante principal
- Jefe de Compras (si aplica)
- Administrador (si es crítico)

**Registro:**
- Todas guardadas en `email_notifications`
- Consultable en historial

---

## 🛡️ SEGURIDAD

### Autenticación
- Código único por usuario
- No hay contraseñas (seguridad simplificada)
- Session management automático

### Autorización (RLS)
- Row Level Security en todas las tablas
- Usuarios solo ven datos de su licencia
- Administradores ven todo

### Auditoría
- Todas las acciones registradas
- Quién, cuándo, qué
- No se pueden eliminar logs (append-only)

### Backup
- Supabase maneja automáticamente
- Disponible en panel de administración

---

## ⚡ CONSEJOS DE PRODUCTIVIDAD

### Búsqueda Rápida
- Usar Ctrl+K para abrir el búsqueda (cuando esté disponible)
- Filtros en todas las tablas

### Atajos
- 🔄 Realtime: Cambios automáticos
- 📋 Copiar tabla: Seleccionar y copiar
- 📥 Importar: Cargar CSV (futuro)

### Organización
1. Crear requisiciones regularmente
2. Revisar stock bajo semanalmente
3. Descargar reportes mensualmente
4. Verificar conexiones regularmente

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### "No aparecen cambios en tiempo real"
1. Verificar conexión a internet
2. Ir a Verificación de Conexiones
3. Ejecutar pruebas
4. Refrescar página (F5)

### "Conexión rechazada a Supabase"
1. Verificar credenciales en .env
2. Verificar que Supabase no está en mantenimiento
3. Ejecutar Verificación de Conexiones
4. Contactar administrador

### "Usuario no puede crear requisiciones"
1. Verificar rol del usuario (debe ser >= Profesor)
2. Verificar que está activo
3. Revisar permisos en BD

### "Reporte no se descarga"
1. Verificar conexión
2. Revisar que hay datos en la tabla
3. Intentar en formato diferente (PDF vs XLSX)

---

## 📞 CONTACTO Y SOPORTE

**Administrador:** Contactar a través del sistema  
**Email:** [Configure en settings]  
**Manual Técnico:** Disponible en documentación completa  

---

## 📊 ESTADÍSTICAS DEL SISTEMA

**Última Verificación:** [Hoy]
- Usuarios activos: Cantidad
- Requisiciones: Cantidad
- Órdenes: Cantidad
- Inventario total: Cantidad items

---

## ✨ VERSIÓN

**MAO 2026**  
**Versión:** 1.0 Production Ready  
**Última actualización:** [Hoy]  
**Estado:** ✅ Operativo  

¡Disfruta del sistema! 🎉
