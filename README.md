# 📖 MAO 2026 - Sistema de Gestión de Requisiciones y Compras

Bienvenido al **Sistema MAO 2026** - Sistema integral de gestión de requisiciones, solicitudes de compra y órdenes de compra.

---

## 🎯 Características Implementadas (4/4 ✅)

### 1. ✅ Botones para Aprobar/Rechazar Requisiciones
- Interfaz intuitiva con botones de acción
- Modal para agregar comentarios al rechazar
- Validación por rol (solo jefe_compras y admin)
- Estados visuales con colores e iconos
- Notificaciones en tiempo real

### 2. ✅ Crear Órdenes de Compra desde Solicitudes
- Formulario para crear nuevas órdenes
- Selección automática de solicitudes aprobadas
- Generación automática de número de orden (ORD-2026-XXXX)
- Filtros por estado con contadores
- Vinculación automática con proveedor

### 3. ✅ Notificaciones por Email
- Registro automático de notificaciones
- Tabla email_notifications en BD
- Panel de administración
- Filtros por estado (pendientes, enviados, errores)
- Estadísticas en tiempo real

### 4. ✅ Reportes y Exportación a CSV
- Exportación de requisiciones
- Exportación de solicitudes de compra
- Exportación de órdenes de compra
- Descarga automática con fecha
- Formato CSV con manejo de caracteres especiales

---

## 📚 Documentación Disponible

### Para Usuarios
📄 **[MANUAL_DE_USO.md](MANUAL_DE_USO.md)**
- Guía paso a paso
- Procedimientos para cada feature
- Solución de problemas
- Tips y mejores prácticas

### Para Desarrolladores
📄 **[REFERENCIA_TECNICA.md](REFERENCIA_TECNICA.md)**
- APIs y funciones
- Estructura del código
- Ejemplos de uso
- Puntos de extensión

### Para Project Managers
📄 **[FEATURES_IMPLEMENTED.md](FEATURES_IMPLEMENTED.md)**
- Resumen de implementación
- Archivos modificados
- Estadísticas de cambios
- Control de acceso

### Verificación
📄 **[CHECKLIST_IMPLEMENTACION.md](CHECKLIST_IMPLEMENTACION.md)**
- Todos los requisitos
- Lista de verificación
- Estado final

---

## 🚀 Inicio Rápido

### 1. Configuración Inicial
```bash
# Ejecutar script SQL en Supabase
# Ir a SQL Editor y copiar todo de: EMAIL_NOTIFICATIONS_TABLE.sql
```

### 2. Instalar y Ejecutar
```bash
cd "c:\Users\Usuario\Downloads\mao 2026"
npm install
npm run dev
```

### 3. Acceder
```
Abrir navegador: http://localhost:5173
```

---

## 📁 Nuevos Archivos

### Creados
- ✨ `src/utils/exportUtils.ts` - Funciones de exportación CSV
- ✨ `src/pages/EmailNotificationsPanel.tsx` - Panel de notificaciones
- ✨ `EMAIL_NOTIFICATIONS_TABLE.sql` - Script de BD

### Modificados
- 🔄 `src/services/supabaseClient.ts` - +11 funciones
- 🔄 `src/pages/RequisitionsPage.tsx` - Botones de aprobación
- 🔄 `src/pages/PurchaseRequestsPage.tsx` - Botones de aprobación
- 🔄 `src/pages/PurchaseOrdersPage.tsx` - Completamente reescrito

---

## 🔐 Control de Acceso

| Acción | Admin | Jefe Compras | Usuario |
|--------|-------|------------|---------|
| Aprobar/Rechazar | ✅ | ✅ | ❌ |
| Crear Órdenes | ✅ | ✅ | ❌ |
| Ver Notificaciones | ✅ | ✅ | ❌ |
| Exportar Reportes | ✅ | ✅ | ✅ |

---

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| Nuevas Funciones API | 11 |
| Funciones Exportación | 5 |
| Líneas de Código | ~1160 |
| Archivos Modificados | 4 |
| Archivos Creados | 3 |

---

## 🛠️ Stack Tecnológico

- **React 18** + TypeScript
- **Vite** build tool
- **Tailwind CSS** estilos
- **Zustand** estado
- **React Router v6** ruteo
- **Lucide React** iconos
- **React Hot Toast** notificaciones
- **Supabase** backend

---

## 📋 Flujo de Trabajo

```
Usuario Crea Requisición
    ↓
Jefe Compras Aprueba/Rechaza
    ↓
Si Aprobada → Crear Solicitud Compra
    ↓
Solicitud se Aprueba
    ↓
Crear Orden de Compra
    ↓
Cambiar Estados de Orden
    ↓
Exportar Reportes
```

---

## ❓ Preguntas Frecuentes

**P: ¿Necesito ejecutar algo?**  
R: Sí, el script `EMAIL_NOTIFICATIONS_TABLE.sql` en Supabase.

**P: ¿Dónde veo las notificaciones?**  
R: Panel de Email Notifications (solo admin/jefe_compras).

**P: ¿Puedo exportar sin aprobar?**  
R: Sí, el botón Exportar está disponible para todos.

**P: ¿Cómo rechazo una requisición?**  
R: Click en botón "Rechazar", agregar comentario, confirmar.

---

## 📞 Documentación

- 📖 **MANUAL_DE_USO.md** - Cómo usar el sistema
- 🔧 **REFERENCIA_TECNICA.md** - API y código
- ✅ **CHECKLIST_IMPLEMENTACION.md** - Verificación
- 📋 **FEATURES_IMPLEMENTED.md** - Qué se hizo

---

**Estado:** ✅ Completo y Funcional  
**Versión:** 1.0  
**Fecha:** 27 de enero de 2026

### Backend & Database
- **Supabase** (PostgreSQL)
- **Supabase Auth** para autenticación
- **Supabase Storage** para archivos
- **Supabase Realtime** para actualizaciones en vivo
- **Row Level Security (RLS)** para seguridad

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd mao-2026-inventory
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crear archivo `.env.local`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Iniciar servidor de desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── layouts/        # Layouts principales
│   ├── navigation/     # Sidebar, TopBar
│   └── ui/            # Componentes UI base
├── pages/              # Páginas principales
│   ├── auth/          # Autenticación y login
│   └── dashboards/    # Dashboards por rol
├── hooks/             # Custom hooks
├── stores/            # Estado global (Zustand)
├── types/             # Tipos TypeScript
├── utils/             # Funciones utilitarias
├── constants/         # Constantes de la app
└── index.css          # Estilos globales
```

## 🔐 Seguridad

- **Licencias Encriptadas**: License keys con SHA-256
- **Auth Codes Únicos**: 12 caracteres alfanuméricos por usuario
- **Row Level Security**: Políticas RLS en Supabase
- **JWT Tokens**: Sesiones seguras con expiración
- **Rate Limiting**: Protección contra abuso de API
- **Sanitización de Inputs**: Validación en cliente y servidor
- **Logs de Auditoría**: Registro inmutable de actividades

## 📊 Roles y Permisos

### Super Admin
- Gestión de licencias de múltiples colegios
- Estadísticas globales
- Monitoreo completo del sistema

### Admin
- Gestión de usuarios
- Configuración del sistema
- Reportes globales

### Jefe de Compras
- Gestión completa de inventario
- Aprobación de requisiciones
- Gestión de órdenes de compra

### Finanzas
- Visualización de inventario
- Registro de compras de emergencia
- Reportes financieros

### Gerente
- Aprobación de solicitudes
- Aprobación de órdenes
- Reportes ejecutivos

### Profesor
- Creación de requisiciones
- Visualización de mis solicitudes
- Seguimiento de órdenes

### Auditor
- Auditoría de inventario
- Análisis de compras
- Reportes de auditoría

## 🎨 Paleta de Colores

- **Primario**: #1E40AF (Azul Institucional)
- **Secundario**: #3B82F6
- **Éxito**: #10B981
- **Advertencia**: #F59E0B
- **Error**: #EF4444
- **Información**: #3B82F6

## 💰 Configuración Monetaria

- **Moneda**: Quetzales Guatemaltecos (GTQ / Q)
- **IVA**: 12%
- **Formato**: Q 1,234.56

## 📦 Comandos Disponibles

```bash
# Desarrollo
npm run dev           # Inicia servidor de desarrollo

# Build
npm run build         # Genera build optimizado
npm run preview       # Previsualiza build en local

# Calidad de código
npm run lint          # Ejecuta ESLint
npm run type-check    # Verifica tipos TypeScript
```

## 🔄 Flujos Principales

### Requisición
1. Profesor crea requisición
2. Sistema genera REQ-YYYY-0001
3. Jefe de Compras aprueba/rechaza
4. Si aprobada: se registra salida de inventario
5. Stock se actualiza automáticamente

### Solicitud de Compra
1. Profesor/Usuario crea solicitud
2. Sistema genera SOL-YYYY-0001
3. Gerente aprueba/rechaza
4. Si aprobada: Jefe de Compras crea orden
5. Se solicitan cotizaciones
6. Gerente selecciona ganadora
7. Orden aprobada y en proceso

### Compra de Emergencia
1. Finanzas registra compra
2. Sube factura como evidencia
3. Sistema registra en logs
4. Se impacta presupuesto y reportes

## 🌐 Integración con Supabase

### Tablas Principales
- `licenses` - Gestión de licencias
- `users` - Usuarios del sistema
- `inventory_categories` - Categorías
- `suppliers` - Proveedores
- `inventory_items` - Items de inventario
- `inventory_movements` - Historial de movimientos
- `requisitions` - Requisiciones
- `purchase_requests` - Solicitudes de compra
- `purchase_orders` - Órdenes de compra
- `quotations` - Cotizaciones
- `activity_logs` - Logs de auditoría
- `notifications` - Notificaciones

### Row Level Security (RLS)
Todas las tablas implementan RLS para:
- Usuarios solo ven datos de su licencia
- Profesores solo ven sus propios registros
- Super Admin ve todo
- Logs inmutables

## 📱 Responsividad

- **Desktop (>1024px)**: Grid 2-4 columnas, sidebar fijo
- **Tablet (768-1024px)**: Grid 2 columnas, sidebar colapsable
- **Mobile (<768px)**: Stack vertical, bottom nav

## 🧪 Testing

```bash
npm run test          # Ejecuta pruebas unitarias
npm run test:e2e      # Ejecuta pruebas E2E
```

## 📖 Documentación

Ver `/docs` para documentación completa:
- Manual de usuario por rol
- Guía de instalación
- Documentación técnica
- Diagrama de base de datos (ERD)
- Diagrama de flujos

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es propiedad del Colegio Manos a la Obra.

## 📞 Soporte

Para soporte técnico, contactar al administrador del sistema o al equipo de desarrollo.

## 🎓 Créditos

Desarrollado por el equipo de sistemas del Colegio Manos a la Obra.

---

**Última actualización**: 27 de enero de 2026
