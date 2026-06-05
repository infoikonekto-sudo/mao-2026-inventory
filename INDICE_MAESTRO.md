# 📑 ÍNDICE MAESTRO - NAVEGACIÓN DEL PROYECTO

## 🎯 ¿POR DÓNDE EMPEZAR?

Depende de tu rol:

### 👤 SOY USUARIO (Profesor/Jefe)
→ **No necesitas técnico**  
→ Tu IT te mostrará how to use  
→ Lee: Ninguno (nada técnico)

### 👨‍💻 SOY DESARROLLADOR (Voy a programar)
1. Lee primero (5 min): [MANUAL_TECNICO_DESARROLLADORES.md#🚀-GUÍA-RÁPIDA-PARA-EMPEZAR](MANUAL_TECNICO_DESARROLLADORES.md)
2. Entiendo arquitectura (10 min): [ANALISIS_COMPLETO_PROYECTO.md#🎯-EXECUTIVE-SUMMARY](ANALISIS_COMPLETO_PROYECTO.md)
3. Veo flujos visuales (5 min): [DIAGRAMAS_FLUJOS_VISUALES.md](DIAGRAMAS_FLUJOS_VISUALES.md)
4. Crear feature completamente (30 min): [MANUAL_TECNICO_DESARROLLADORES.md#🔧-CÓMO-AGREGAR-UNA-FEATURE-NUEVA](MANUAL_TECNICO_DESARROLLADORES.md)
5. ¡Empezar a code! 🚀

### 🔧 SOY ADMINISTRADOR TÉCNICO (Voy a deployar/mantener)
1. Lee: [ANALISIS_COMPLETO_PROYECTO.md#⚙️-CONFIGURACIÓN-Y-DEPLOYMENT](ANALISIS_COMPLETO_PROYECTO.md)
2. Ejecuta scripts SQL (60 min): Ver `sql/` folder
3. Configura variables entorno: `.env` file
4. Deploy a Vercel/Netlify: `npm run build`
5. Monitor: Supabase dashboard

### 📊 SOY DIRECTIVO (Quiero entender qué tengo)
→ Lee: [ANALISIS_COMPLETO_PROYECTO.md#⚡-CICLO-DE-VIDA-DE-UNA-ACCIÓN](ANALISIS_COMPLETO_PROYECTO.md)  
→ Ver: [DIAGRAMAS_FLUJOS_VISUALES.md#📊-Diagrama-1-ARQUITECTURA-GENERAL](DIAGRAMAS_FLUJOS_VISUALES.md)  
→ Resumen: Sistema enterprise de gestión de inventario, requisiciones y compras. Multi-tenant, seguro, auditable.

---

## 📚 GUÍA COMPLETA DE DOCUMENTOS

### Documentación Oficial del Proyecto

#### 📖 Para Entender QUÉ es el Proyecto
- **[README.md](README.md)** - Resumen general características
- **[RESUMEN_EJECUTIVO_VISUAL.md](RESUMEN_EJECUTIVO_VISUAL.md)** - Problema → Solución visual
- **[README_SISTEMA_COMPLETO.md](README_SISTEMA_COMPLETO.md)** - Sistema completo explicado

#### 📖 Para Empezar RÁPIDO
- **[START_HERE.md](START_HERE.md)** - 2 minutos, qué hacer primero
- **[QUICK_START_DASHBOARD.md](QUICK_START_DASHBOARD.md)** - Panel de control en 4 pasos
- **[GUIA_VISUAL_PASO_A_PASO.md](GUIA_VISUAL_PASO_A_PASO.md)** - Paso a paso visual

#### 📖 Para Refencia RÁPIDA
- **[REFERENCIA_RAPIDA.md](REFERENCIA_RAPIDA.md)** - Cheatsheet de muchas cosas

#### 📖 Para ARQUITECTURA
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Arquitectura detallada
- **[ANALISIS_COMPLETO_PROYECTO.md](ANALISIS_COMPLETO_PROYECTO.md)** ⭐ **← LEER ESTO**
  - 📑 Estructura del proyecto
  - 🔐 Roles y permisos
  - 🔄 Flujos principales (requisiciones, compras, órdenes)
  - 🗄️ Base de datos detallada
  - 📱 Componentes React
  - 📡 Comunicación Backend-Frontend
  - 🛠️ Tecnologías usadas

#### 📖 Para VER Flujos Visuales
- **[DIAGRAMAS_FLUJOS_VISUALES.md](DIAGRAMAS_FLUJOS_VISUALES.md)** ⭐ **← LEER ESTO**
  - 📊 Diagrama arquitectura general
  - 🔄 Flujo requisición completo (ASCII)
  - 🛒 Flujo orden de compra (ASCII)
  - ⚡ Sistema aprobación triple (ASCII)
  - 📱 Notificaciones en tiempo real
  - 🔒 Row Level Security
  - 🎯 Ciclo diario del sistema
  - 🔐 Flujo autenticación

#### 📖 Para PROGRAMAR
- **[MANUAL_TECNICO_DESARROLLADORES.md](MANUAL_TECNICO_DESARROLLADORES.md)** ⭐ **← LEER ESTO**
  - 🚀 Guía rápida para empezar
  - 📁 Estructura carpetas detallada
  - 🔧 Cómo agregar feature (paso a paso)
  - ⚡ Patrones comunes (3+ ejemplos)
  - 🔒 Checklist seguridad
  - 🚨 Errores comunes
  - 🛠️ Herramientas y comandos

---

## 🗺️ MAPA DE ARCHIVOS CLAVE

### Punto de Entrada
```
index.html          ← HTML donde React se monta
src/main.tsx        ← Bootstrap React
src/App.tsx         ← Routing base
```

### Núcleo del Proyecto
```
src/services/supabaseClient.ts    ← 150+ funciones de BD (CRÍTICO)
src/stores/authStore.ts           ← Estado global usuario
src/types/index.ts                ← 20+ interfaces TypeScript
```

### Páginas Principales
```
src/pages/dashboards/
  ├── AdminDashboard.tsx          ← Para admin (métricas globales)
  ├── ProfessorDashboard.tsx       ← Para profesor (mis datos)
  └── ChiefsDashboard.tsx          ← Para jefes (aprobaciones)

src/pages/
  ├── RequisitionsPage.tsx         ← CRUD requisiciones
  ├── PurchaseRequestsPage.tsx     ← CRUD solicitudes compra
  ├── PurchaseOrdersPage.tsx       ← CRUD órdenes compra
  ├── InventoryPage.tsx            ← Gestión inventario
  ├── InventoryImportPage.tsx      ← Importar Excel/CSV
  ├── InventoryMovementsPage.tsx   ← Ver movimientos
  ├── SuppliersPage.tsx            ← Proveedores
  ├── BudgetsPage.tsx              ← Presupuestos
  ├── CostCentersPage.tsx          ← Centros costo
  ├── ExpressOrdersPage.tsx        ← Órdenes urgentes
  ├── WindowDeliveryPage.tsx       ← Despachos en ventana
  ├── AuditPage.tsx                ← Log auditoría
  ├── UsersManagementPage.tsx      ← Admin usuarios
  ├── ProfessionalReportsPage.tsx  ← Reportes
  └── ... (20+ más)
```

### Base de Datos
```
sql/
  ├── 13_inventory_import_tables.sql      ← Importación
  ├── 41_implement_triple_approval_system.sql ← Aprobaciones
  ├── 45_express_orders.sql              ← Órdenes express
  ├── 57_requisition_delivery_system.sql ← Despachos
  └── ... (60+ archivos migration)
```

### Utilidades
```
src/utils/
  ├── supabaseClient.ts      ← Cliente Supabase
  ├── exportUtils.ts         ← Exportar CSV
  ├── pdfGenerator.ts        ← Generar PDFs
  ├── permissions.ts         ← Lógica permisos
  ├── roleActions.ts         ← Acciones por rol
  ├── validations.ts         ← Validaciones Zod
  └── formatting.ts          ← Formateo datos
```

---

## 🎓 GUÍA DE APRENDIZAJE (Ordenado por Dificultad)

### Nivel 1: BÁSICO (1-2 horas)
1. Lee: [START_HERE.md](START_HERE.md)
2. Lee: [RESUMEN_EJECUTIVO_VISUAL.md](RESUMEN_EJECUTIVO_VISUAL.md)
3. Entiende: 3 flujos principales (requisición, orden, express)
4. Resultado: Sabes QUÉ hace el sistema

### Nivel 2: FUNDAMENTAL (4-6 horas)
1. Lee: [ANALISIS_COMPLETO_PROYECTO.md](ANALISIS_COMPLETO_PROYECTO.md)
2. Lee: [DIAGRAMAS_FLUJOS_VISUALES.md](DIAGRAMAS_FLUJOS_VISUALES.md)
3. Entiende: Arquitectura, BD, rutas, componentes
4. Resultado: Sabes CÓMO está construido

### Nivel 3: INTERMEDIO (8-12 horas)
1. Lee: [MANUAL_TECNICO_DESARROLLADORES.md](MANUAL_TECNICO_DESARROLLADORES.md)
2. Lee: supabaseClient.ts (100+ líneas)
3. Lee: Dos páginas complejas (RequisitionsPage, PurchaseOrdersPage)
4. Lee: types/index.ts (todas las interfaces)
5. Resultado: Sabes POR QUÉ está diseñado así

### Nivel 4: AVANZADO (16+ horas)
1. Crea 3 features nuevas (siguiendo patrón)
2. Implementa una integración (Stripe, mail, etc)
3. Modifica workflows existentes
4. Agrega tests
5. Deploy a producción
6. Resultado: Eres developer core

### Nivel 5: EXPERT (20+ horas)
1. Entiende cada trigger SQL
2. Optimiza queries
3. Implementa nueva features complejas
4. Mentoriza otros developers
5. Resultado: Eres tech lead

---

## 🔍 BÚSQUEDA RÁPIDA POR TEMA

### 👤 Autenticación
- Documento: [ANALISIS_COMPLETO_PROYECTO.md#SISTEMA-DE-ROLES-Y-PERMISOS](#🔐)
- Flujo: [DIAGRAMAS_FLUJOS_VISUALES.md#Diagrama-9-FLUJO-AUTENTICACIÓN](#🔐)
- Código: `src/pages/auth/LoginPageSimple.tsx`
- Servicio: `src/services/supabaseClient.ts` → `authenticateUser()`

### 📋 Requisiciones
- Documento: [ANALISIS_COMPLETO_PROYECTO.md#FLUJO-1-REQUISICIÓN](#🔄)
- Flujo visual: [DIAGRAMAS_FLUJOS_VISUALES.md#Diagrama-2-FLUJO-REQUISICIÓN-COMPLETO](#🔄)
- Página: `src/pages/RequisitionsPage.tsx`
- Tipos: `src/types/index.ts` → `Requisition`, `RequisitionItem`
- Servicios: `src/services/supabaseClient.ts` → `getRequisitions()`, `createRequisitionWithItems()`, etc

### 🛒 Órdenes de Compra
- Documento: [ANALISIS_COMPLETO_PROYECTO.md#FLUJO-2-SOLICITUD-DE-COMPRA](#🔄)
- Flujo visual: [DIAGRAMAS_FLUJOS_VISUALES.md#Diagrama-3-FLUJO-ORDEN-DE-COMPRA](#🛒)
- Página: `src/pages/PurchaseOrdersPage.tsx`
- Tipos: `src/types/index.ts` → `PurchaseOrder`, `PurchaseRequest`
- Servicios: `src/services/supabaseClient.ts` → `createPurchaseOrderFromRequest()`, `approveOrder()`, etc

### ⚡ Órdenes Express
- Documento: [ANALISIS_COMPLETO_PROYECTO.md#FLUJO-3-ÓRDENES-EXPRESS](#🔄)
- Flujo visual: [DIAGRAMAS_FLUJOS_VISUALES.md#Diagrama-4-SISTEMA-APROBACIÓN-TRIPLE](#⚡)
- Página: `src/pages/ExpressOrdersPage.tsx`
- Servicios: `src/services/supabaseClient.ts` → `createExpressOrder()`, `approveExpressOrder()`

### 📦 Inventario
- Documento: [ANALISIS_COMPLETO_PROYECTO.md#INVENTARIO](#🗄️)
- Página: `src/pages/InventoryPage.tsx`
- Importación: `src/pages/InventoryImportPage.tsx`
- Movimientos: `src/pages/InventoryMovementsPage.tsx`
- Servicios: `src/services/supabaseClient.ts` → `getInventory()`, `importInventoryFromCSV()`, etc

### 💰 Presupuestos
- Documento: [ANALISIS_COMPLETO_PROYECTO.md#PRESUPUESTOS-Y-CENTROS-DE-COSTO](#🎯)
- Página: `src/pages/BudgetsPage.tsx`
- Servicios: `src/services/supabaseClient.ts` → `getBudgets()`, `getCostCenters()`

### 📊 Reportes
- Página: `src/pages/ProfessionalReportsPage.tsx`
- Exportación: `src/utils/exportUtils.ts`
- PDFs: `src/utils/pdfGenerator.ts`

### 🔒 Seguridad
- Documento: [ANALISIS_COMPLETO_PROYECTO.md#SEGURIDAD---ROW-LEVEL-SECURITY](#🔒)
- Diagrama: [DIAGRAMAS_FLUJOS_VISUALES.md#Diagrama-6-SEGURIDAD---ROW-LEVEL-SECURITY](#🔒)
- Documentación: TODO SQL en archivos migration

### 📡 Notificaciones
- Documento: [ANALISIS_COMPLETO_PROYECTO.md#COMUNICACIÓN-EN-TIEMPO-REAL](#📡)
- Diagrama: [DIAGRAMAS_FLUJOS_VISUALES.md#Diagrama-5-NOTIFICACIONES-EN-TIEMPO-REAL](#📱)
- Componente: `src/components/NotificationBell.tsx`
- Script: `scripts/processNotifications.mjs`
- Hook: `src/hooks/useNotifications.ts`

### 🎨 UI/UX
- Componentes: `src/components/ui/`
- Estilos: `src/index.css` (Tailwind)
- Diseño: `tailwind.config.ts`
- Layout: `src/components/layouts/DashboardLayout.tsx`

---

## 🛠️ TAREAS COMUNES

### Agregar nuevo campo a tabla
1. **SQL**: Crear migration en `sql/`
2. **Types**: Actualizar interface en `src/types/index.ts`
3. **Frontend**: Actualizar forms/displays en páginas relevantes
4. **DB Security**: Actualizar RLS policies si aplica

### Crear nueva página
1. **Seguir patrón**: [MANUAL_TECNICO_DESARROLLADORES.md#PASO-1:-Crear-tipo-TypeScript](#🔧)
2. **Archivo nuevo**: `src/pages/NewPage.tsx`
3. **Importar en**: `src/components/layouts/DashboardLayout.tsx`
4. **Agregar ruta**: Dentro de `<Routes>`
5. **Agregar a Sidebar**: `src/components/navigation/Sidebar.tsx`

### Cambiar flujo de aprobación
1. Entender estado actual: [ANALISIS_COMPLETO_PROYECTO.md#BASE-DE-DATOS](#🗄️)
2. Modificar tabla: SQL migration
3. Actualizar servicios: `src/services/supabaseClient.ts`
4. Actualizar UI: Páginas relevantes
5. Test: Verificar flujo completo

### Agregar notificación nueva
1. Servicio: `src/services/supabaseClient.ts` → agregar `sendXNotification()`
2. Trigger SQL: En migration, agregar trigger que INSERT a `email_notifications`
3. Email template: En `scripts/processNotifications.mjs` si custom
4. UI trigger: Donde se ejecuta la acción, llamar a la función

---

## 📞 REFERENCIAS RÁPIDAS

### Estructura de Response Supabase
```typescript
// SELECT - devuelve array
const { data: items, error } = await supabase
  .from('table')
  .select('*')
  
// INSERT - devuelve objeto si .single()
const { data: newItem, error } = await supabase
  .from('table')
  .insert([...])
  .select()
  .single()

// UPDATE - igual a INSERT
const { data: updated, error } = await supabase
  .from('table')
  .update({...})
  .eq('id', id)
  .select()
  .single()
```

### Permisos por Rol
```
SUPER_ADMIN   → TODO
ADMIN         → TODO excepto usuarios super_admin
JEFE_COMPRAS  → Aprobar req, crear órdenes, cargar cotizaciones
GERENTE       → Aprobar solicitudes de compra
FINANZAS      → Gestionar presupuestos, aprobar si no hay $
PROFESOR      → Crear requisiciones y solicitudes
AUDITOR       → Ver logs, read-only
JEFE_x        → Jefes de áreas (operaciones, calidad, presupuesto)
```

### Estados de Requisición
```
pendiente          → Recién creada
en_revision        → Jefe_compras la está viendo
aprobada           → Listo para despachar
rechazada          → Fue rechazada + motivo
listo_para_recoger → Aprobada, esperando recogida
entregado_parcial  → Se entregó parte
entregado          → Completamente entregada
```

### Estados de Orden de Compra
```
borrador       → Creada, sin confirmar
cotizacion     → Esperando cotización de proveedor
aprobada       → Gerente aprobó
en_proceso     → Proveedor está surtiendo
recibida       → Llegó y se actualiza stock
cancelada      → Fue cancelada
```

---

## 🚀 DEPLOYMENT CHECKLIST

```
□ Variables de entorno (.env)
  □ VITE_SUPABASE_URL
  □ VITE_SUPABASE_ANON_KEY
  □ SENDGRID_API_KEY (opcional)

□ Build
  □ npm run build (sin errores)
  □ npm run type-check (sin errores)
  □ npm run lint (sin warnings)

□ Base de Datos
  □ Todas migraciones SQL ejecutadas
  □ RLS policies correctas
  □ Storage buckets configurados

□ Testing
  □ Login funciona
  □ Requisición: create → approve → dispatch
  □ Orden: create → quotation → approve → receive
  □ Inventario actualiza stock
  □ PDFs generan OK
  □ CSV exporta OK
  □ Email notificaciones envían (cron)
  □ Auditoría registra cambios

□ Monitoring
  □ Errores en console
  □ Errores en Supabase
  □ Emails en SendGrid
  □ Performance en Network tab

□ Seguridad
  □ RLS policies correctas
  □ Usuarios solo ven su data
  □ Roles se validan
  □ Audit logs se escriben
  □ Firmas se guardan OK

□ Go Live
  □ Backup BD completo
  □ Datos de producción cargados
  □ Admin users creados
  □ Entrenamiento users
  → 🎉 LIVE!
```

---

## 📞 SOPORTE Y CONTACTO

### Documentación Externa
- **Supabase**: https://supabase.com/docs
- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org
- **Tailwind**: https://tailwindcss.com

### En el Proyecto
- **Reportar bug**: Crear issue en repo
- **Feature request**: Crear discussion
- **Tech debt**: Documentar en TODOS

---

## 📋 RESUMEN EJECUTIVO DE 30 SEGUNDOS

**MAO 2026** es un sistema enterprise de gestión de inventario, requisiciones y compras para instituciones educativas.

- **Usuarios**: 1000+ por institución
- **Instituciones**: Multi-tenant, cada una independiente
- **Funciones core**: Requisiciones, Solicitudes Compra, Órdenes, Inventario, Presupuestos, Auditoría
- **Seguridad**: RLS, roles granulares, logs inmutables
- **Stack**: React 18, Supabase, TypeScript, Tailwind
- **Estado**: Production ready
- **Licencia**: Enterprise

---

**Última actualización:** 22 de febrero de 2026  
**Versión documentación:** 1.0  
**Autor técnico:** AI Assistant (GitHub Copilot)

