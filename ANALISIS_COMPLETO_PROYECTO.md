# 📊 ANÁLISIS EXHAUSTIVO DEL PROYECTO MAO 2026

## 🎯 Executive Summary

**MAO 2026** es un sistema empresarial integral de gestión de inventario, requisiciones y compras diseñado específicamente para instituciones educativas. La aplicación es multi-tenant (multi-institución), con roles basados en control de acceso y auditoría completa.

**Stack Tecnológico Principal:**
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + RLS)
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **Tables:** TanStack Table

---

## 📂 ESTRUCTURA DEL PROYECTO

```
mao-2026/
├── src/
│   ├── App.tsx                          ← Punto de entrada + Routing
│   ├── main.tsx                         ← Bootstrap de React
│   │
│   ├── components/
│   │   ├── layouts/
│   │   │   └── DashboardLayout.tsx     ← Layout principal con sidebar, topbar, routes
│   │   ├── navigation/
│   │   │   ├── Sidebar.tsx             ← Menú lateral dinámico por rol
│   │   │   ├── TopBar.tsx              ← Barra superior + notificaciones
│   │   │   └── NotificationBell.tsx    ← Campanita de notificaciones en tiempo real
│   │   ├── ui/                          ← Componentes UI reutilizables (Button, Modal, etc)
│   │   ├── biometrics/                  ← Componentes de huella digital
│   │   └── features/                    ← Componentes específicos de features
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPageSimple.tsx      ← Autenticación por código auth_code
│   │   ├── dashboards/
│   │   │   ├── AdminDashboard.tsx       ← Dashboard para admin (métricas globales)
│   │   │   ├── ProfessorDashboard.tsx   ← Dashboard para profesor (mis requisiciones)
│   │   │   └── ChiefsDashboard.tsx      ← Dashboard para jefes (aprobaciones pendientes)
│   │   ├── RequisitionsPage.tsx         ← Crear, aprobar, despachar requisiciones
│   │   ├── PurchaseRequestsPage.tsx     ← Crear solicitudes de compra
│   │   ├── PurchaseOrdersPage.tsx       ← Crear órdenes, cotizaciones, recepciones
│   │   ├── InventoryPage.tsx            ← Ver/editar inventario, códigos de barras
│   │   ├── InventoryImportPage.tsx      ← Importar inventario (Excel → CSV)
│   │   ├── InventoryMovementsPage.tsx   ← Ver historial de movimientos
│   │   ├── SuppliersPage.tsx            ← Gestionar proveedores
│   │   ├── BudgetsPage.tsx              ← Crear presupuestos, centros de costo
│   │   ├── CostCentersPage.tsx          ← Gestionar centros de costo
│   │   ├── UsersManagementPage.tsx      ← Admin de usuarios
│   │   ├── ExpressOrdersPage.tsx        ← Órdenes express (compras urgentes)
│   │   ├── WindowDeliveryPage.tsx       ← Despacho en ventanas de tiempo
│   │   ├── AuditPage.tsx                ← Log completo de cambios
│   │   ├── ProfessionalReportsPage.tsx  ← Reportes avanzados
│   │   ├── EmailNotificationsPanel.tsx  ← Admin de notificaciones por email
│   │   ├── SettingsPage.tsx             ← Configuración de sistema
│   │   ├── ProfilePage.tsx              ← Perfil de usuario
│   │   └── TestUsersPage.tsx            ← Página de prueba (dev)
│   │
│   ├── services/
│   │   └── supabaseClient.ts            ← NÚCLEO: >150 funciones para BD
│   │                                       (auth, CRUD, requisiciones, órdenes, etc)
│   │
│   ├── stores/
│   │   └── authStore.ts                 ← Zustand: estado global (user, license)
│   │
│   ├── hooks/
│   │   ├── useRealtimeData.ts           ← Escucha cambios en BD (subscriptions)
│   │   ├── useRequisitionRealtime.ts    ← Subscripción a requisiciones
│   │   ├── usePurchaseRequestRealtime.ts ← Subscripción a solicitudes
│   │   ├── useNotifications.ts          ← Hook para notificaciones toast
│   │   ├── useDebounce.ts               ← Debounce para búsquedas
│   │   └── useLocalStorage.ts           ← Persistencia en localStorage
│   │
│   ├── types/
│   │   └── index.ts                     ← TypeScript: 20+ interfaces (User, Requisition, Order, etc)
│   │
│   ├── utils/
│   │   ├── supabaseClient.ts            ← Cliente Supabase inicializado
│   │   ├── exportUtils.ts               ← Exportar a CSV
│   │   ├── pdfGenerator.ts              ← Generar PDFs (requisiciones, órdenes)
│   │   ├── validations.ts               ← Validaciones Zod
│   │   ├── formatting.ts                ← Formateo de datos (moneda, fechas)
│   │   ├── permissions.ts               ← Lógica de permisos por rol
│   │   └── roleActions.ts               ← Acciones permitidas por rol
│   │
│   ├── constants/
│   │   └── index.ts                     ← Constantes (roles, estados, colores)
│   │
│   ├── index.css                        ← Estilos globales (Tailwind)
│   └── vite-env.d.ts                    ← Types para Vite
│
├── sql/                                  ← MigrationSQL (60+ archivos)
│   ├── create_notifications_and_inventory_movements.sql  ← Tabla movimientos
│   ├── inventory_exits_logic.sql        ← Lógica de salidas automáticas
│   ├── create_requisitions_table.sql    ← Tabla requisiciones
│   ├── create_purchase_orders_table.sql ← Tabla órdenes
│   ├── 41_implement_triple_approval_system.sql ← Sistema aprobación triple
│   ├── 45_express_orders.sql            ← Órdenes express
│   ├── 57_requisition_delivery_system.sql ← Sistema despacho requisiciones
│   └── ... (muchos más, todos nombrados secuencialmente)
│
├── scripts/
│   ├── processNotifications.mjs          ← Script Node para procesar emails
│   └── fix_budgets.js                   ← Script para fijar presupuestos
│
├── docs/
│   ├── ARCHITECTURE.md                  ← Documentación arquitectura
│   └── ... (otros docs)
│
├── public/                              ← Archivos estáticos
├── dist/                                ← Build compilado (producción)
│
├── package.json                         ← Dependencias npm
├── tsconfig.json                        ← Config TypeScript
├── tailwind.config.ts                   ← Config Tailwind CSS
├── vite.config.ts                       ← Config Vite (bundler)
├── index.html                           ← HTML de entrada
│
├── 000_LEEME_PRIMERO.md                 ← Guía inicial
├── START_HERE.md                        ← Quick start
├── README.md                            ← README principal
├── RESUMEN_EJECUTIVO_VISUAL.md          ← Resumen ejecutivo visual
├── QUICK_START_DASHBOARD.md             ← Guía rápida panel de control
├── README_SISTEMA_COMPLETO.md           ← Documentación sistema completo
├── REFERENCIA_RAPIDA.md                 ← Referencia rápida

└── .env*                                ← Variables de entorno (Supabase keys, etc)
```

---

## 🔐 SISTEMA DE ROLES Y PERMISOS

### Roles Definidos (10 tipos)

```typescript
export type UserRole =
  | 'super_admin'          ← SuperAdmin: acceso total al sistema
  | 'admin'                ← Admin institución: gestión completa
  | 'jefe_compras'         ← Jefe compras: aprueba órdenes, gestiona proveedores
  | 'finanzas'             ← Finanzas: manage presupuestos, aprobaciones
  | 'gerente'              ← Gerente: aprueba solicitudes de compra
  | 'profesor'             ← Profesor: crea requisiciones
  | 'auditor'              ← Auditor: solo lectura con acceso a auditoría
  | 'jefe_presupuesto'     ← Jefe presupuesto: gestiona presupuestos
  | 'jefe_operaciones'     ← Jefe operaciones: operaciones diarias
  | 'jefe_calidad'         ← Jefe calidad: control de calidad
```

### Acciones por Rol

```
PROFESOR:
├─ ✅ Crear requisiciones
├─ ✅ Ver sus requisiciones
├─ ✅ Crear solicitudes de compra
├─ ❌ Aprobar nada
└─ ❌ Ver requisiciones de otros

JEFE_COMPRAS:
├─ ✅ Ver todas las requisiciones
├─ ✅ Aprobar/rechazar requisiciones
├─ ✅ Ver todas las solicitudes de compra
├─ ✅ Crear órdenes de compra
├─ ✅ Seleccionar proveedores
├─ ✅ Cargar cotizaciones
└─ ✅ Actualizar inventario al recibir órdenes

GERENTE:
├─ ✅ Ver todas las solicitudes de compra
├─ ✅ Aprobar/rechazar solicitudes de compra
├─ ✅ Ver cotizaciones comparativas
├─ ✅ Seleccionar ganador (cotización)
└─ ❌ No puede crear órdenes directamente

FINANZAS:
├─ ✅ Ver presupuestos por centro de costo
├─ ✅ Crear/editar presupuestos
├─ ✅ Asignar centros de costo a requisiciones
├─ ✅ Reportes de gasto
└─ ✅ Rechazar si excede presupuesto

ADMIN:
├─ ✅ ACCESO TOTAL a todo
├─ ✅ Gestionar usuarios
├─ ✅ Ver auditoría
└─ ✅ Configur todo

AUDITOR:
├─ ✅ Ver LOG de auditoría inmutable
├─ ✅ Ver historial de movimientos
└─ ❌ No puede modificar nada
```

---

## 🔄 FLUJOS PRINCIPALES

### FLUJO 1: REQUISICIÓN (Profesor solicita items de inventario)

```
PASO 1: Profesor crea Requisición
├─ Va a RequisitionsPage
├─ Click "Nueva Requisición"
├─ Selecciona items del inventario
├─ Ingresa cantidad, justificación, prioridad
├─ Click "Crear"
└─ Sistema genera: REQ-2026-0001

NOTIFICACIÓN:
├─ Email → Jefe compras
├─ Bell → Jefe compras (tiempo real)
└─ Status = "pendiente"

        ↓

PASO 2: Jefe compras APRUEBA o RECHAZA
├─ Abre ChiefsDashboard
├─ Ve lista de requisiciones pendientes
├─ Click botón "Aprobar" o "Rechazar"
│  ├─ Si APRUEBA:
│  │  ├─ Status = "aprobada"
│  │  ├─ Puede asignar centro de costo (Finanzas)
│  │  └─ Email → Profesor: "Tu requisición fue aprobada"
│  │
│  └─ Si RECHAZA:
│     ├─ Modal para ingresar motivo
│     ├─ Status = "rechazada"
│     └─ Email → Profesor: "Tu requisición fue rechazada porque..."

        ↓

PASO 3: Si APROBADA → Stock se REDUCE automáticamente
├─ Trigger: requisition_approved → 
├─ Registra movimiento en "inventory_movements":
│  └─ type: "requisicion"
│  └─ quantity: -50 (negative = salida)
│  └─ reference_id: REQ-2026-0001
├─ Actualiza "current_stock" en inventory_items
└─ Status = "listo_para_recoger"

        ↓

PASO 4: Jefe compras DESPACHAA (entrega física)
├─ Ve botón "Despachar requisición"
├─ Modal: ingresa nombre que recibe + firma digital
├─ Click "Confirmar despacho"
└─ Status = "entregado"

AUDITORÍA:
└─ Cada paso registrado en tabla "activity_logs" con:
   ├─ who: usuario ID
   ├─ when: timestamp
   ├─ what: acción (create, approve, reject, dispatch)
   └─ result: { status_before, status_after, metadata }
```

### FLUJO 2: SOLICITUD DE COMPRA (Profesor solicita comprar items nuevos)

```
PASO 1: Profesor crea Solicitud de Compra
├─ Va a PurchaseRequestsPage
├─ Click "Nueva Solicitud"
├─ Ingresa:
│  ├─ Descripción items
│  ├─ Cantidad estimada
│  ├─ Monto estimado
│  ├─ Justificación
│  └─ Adjuntos (especificaciones, cotizaciones previas)
├─ Click "Crear"
└─ Sistema genera: SOL-2026-0001

NOTIFICACIÓN:
├─ Email → Gerente
├─ Bell → Gerente
└─ Status = "pendiente"

        ↓

PASO 2: Gerente APRUEBA o RECHAZA
├─ Va a su Dashboard (ChiefsDashboard)
├─ Ve solicitud con monto estimado
├─ Click "Aprobar" → Status = "aprobada"
│  └─ Email → Jefe compras: "Nueva solicitud aprobada"
│
└─ Click "Rechazar" → Status = "rechazada"
   └─ Email → Profesor: "Solicitud rechazada"

        ↓

PASO 3: Jefe compras CONVIERTE a Orden de Compra
├─ Va a PurchaseOrdersPage
├─ Ve solicitudes aprobadas pendientes
├─ Click "Crear Orden desde Solicitud"
├─ Modal:
│  ├─ Selecciona proveedor
│  ├─ Ingresa fecha de entrega estimada
│  ├─ Ingresa monto final a cotizar
│  └─ Click "Crear Orden"
├─ Sistema genera: OC-2026-0001
└─ Status = "cotizacion"

NOTIFICACIÓN:
├─ Email → Proveedor (con datos de la orden)
└─ Bell → Jefe compras

        ↓

PASO 4: Jefe compras CARGA COTIZACIÓN
├─ Recibe PDF de cotización del proveedor
├─ Va a PurchaseOrdersPage
├─ Busca la orden
├─ Click "Subir Cotización"
├─ Selecciona archivo PDF
├─ Click "Guardar"
└─ Archivo guardado en Storage

        ↓

PASO 5: Gerente SELECCIONA GANADOR (si hay múltiples)
├─ Si hay 1 proveedor:
│  └─ Auto-aprobada o requiere click de aprobación
│
└─ Si hay múltiples proveedores:
   ├─ Gerente ve tabla comparativa
   ├─ Compara: precio, plazo, términos
   ├─ Click en proveedor ganador
   ├─ Modal: "Confirmar selección"
   └─ Status = "aprobada"

NOTIFICACIÓN:
├─ Email → Proveedor seleccionado: "Tu cotización fue seleccionada"
└─ Email → Otros proveedores: "Tu cotización no fue seleccionada"

        ↓

PASO 6: Jefe compras RECIBE ORDEN
├─ Proveedor entrega productos
├─ Va a PurchaseOrdersPage
├─ Busca la orden "aprobada"
├─ Click "Marcar como Recibida"
├─ Modal:
│  ├─ Confirmación de cantidad
│  ├─ Carga de factura (PDF)
│  ├─ Firma digital (quien recibe)
│  ├─ Notas
│  └─ Click "Confirmar recepción"
│
├─ Status = "recibida"
├─ Stock INCREMENTA automáticamente
└─ Registra movimiento en "inventory_movements":
   ├─ type: "entrada"
   ├─ quantity: +100
   ├─ reference_id: OC-2026-0001

AUDITORÍA:
└─ Registro completo en "activity_logs"
```

### FLUJO 3: ÓRDENES EXPRESS (Compras urgentes sin requisición)

```
PASO 1: Jefe compras crea Orden Express DIRECTA
├─ Va a ExpressOrdersPage
├─ Click "Nueva Orden Express"
├─ Datos requeridos:
│  ├─ Proveedor
│  ├─ Items (cantidad, descripción)
│  ├─ Monto
│  ├─ Centro de costo
│  ├─ Justificación (POR QUÉ es urgente)
│  └─ Fecha entrega requerida
│
├─ Click "Crear"
└─ Sistema genera: EXP-2026-0001

FLUJO DE APROBACIÓN (TRIPLE APPROVAL):
├─ Notif → Admin: "Nueva orden express pendiente"
├─ Admin + Jefe compras + Finanzas DEBEN aprobar (todos los 3)
│
├─ Admin comprueba: ¿Datos completos?
├─ Jefe compras comprueba: ¿Proveedor confiable?
├─ Finanzas comprueba: ¿Hay presupuesto?
│
└─ Si todos aprueban:
   ├─ Status = "aprobada"
   ├─ Notif → Proveedor
   ├─ Notif → Jefe compras: "Proceder a compra"
   └─ Jefe compras ejecuta compra

RECEPCIÓN:
└─ Mismo flujo que orden normal (paso 6 anterior)
```

### FLUJO 4: DESPACHO EN VENTANAS DE TIEMPO

```
PARA ENTREGAS COMPLEJAS (múltiples órdenes, múltiples usuarios)

PASO 1: Admin configura "Ventana de Despacho"
├─ Va a WindowDeliveryPage
├─ Click "Nueva Ventana"
├─ Datos:
│  ├─ Fechas de despacho (ej: 9 AM - 12 PM)
│  ├─ Ubicación (bodega, etc)
│  ├─ Items a despachar (agrupa requisiciones + órdenes)
│  └─ Pre-notif a usuarios ("tu orden se despachará X día Y hora")
│
└─ Click "Crear"

PASO 2: En el día de despacho
├─ Admin/Bodeguero abre la ventana
├─ Ve lista de usuarios que vienen a recoger
├─ Para cada uno:
│  ├─ Escanea código QR (o ingresa código)
│  ├─ Imprime recibo
│  ├─ Usuario firma digitalmente
│  ├─ Entrega física
│  └─ Sistema marca como "entregado"
│
└─ Todos ven notificación en tiempo real

ESTO:
├─ Evita que todos lleguen a la misma hora
├─ Crea respaldo legal (firma digital + timestamp)
└─ Genera reportes de quién recogió qué y cuándo
```

---

## 🗄️ BASE DE DATOS - TABLAS PRINCIPALES

### Estructura Entity-Relationship

```
licenses (1)
    │
    ├──→ users (N)
    │      │
    │      ├──→ requisitions (N)
    │      │      │
    │      │      └──→ requisition_items (N)
    │      │             │
    │      │             └──→ inventory_items (N)
    │      │
    │      ├──→ purchase_requests (N)
    │      │      │
    │      │      └──→ purchase_request_items (N)
    │      │
    │      ├──→ purchase_orders (N)
    │      │      │
    │      │      └──→ purchase_order_items (N)
    │      │
    │      └──→ activity_logs (N)
    │
    ├──→ inventory_items (N)
    │      │
    │      ├──→ inventory_movements (N)
    │      └──→ inventory_categories (N)
    │
    ├──→ suppliers (N)
    │      │
    │      └──→ purchase_orders (N)
    │
    ├──→ budgets (N)
    │      │
    │      └──→ cost_centers (N)
    │
    └──→ reserves/approvals (N)
```

### Tablas Críticas

#### 1. `licenses`
```sql
- id (UUID primary key)
- school_code (unique) - Código institución
- school_name - Nombre institución
- license_key - Hash para validación
- is_active - ¿Licencia activa?
- expiration_date - Vencimiento
- max_users - Límite de usuarios
- created_at, updated_at
```

#### 2. `users`
```sql
- id (UUID, auth.uid() de Supabase Auth)
- license_id (FK → licenses)
- auth_code (unique) - Código para login (ej: ADM001)
- email
- full_name
- role (super_admin, admin, jefe_compras, profesor, etc)
- is_active
- profile_photo_url, phone, department, city, bio
- created_at, updated_at, last_login
```

#### 3. `inventory_items`
```sql
- id (UUID, primary key)
- license_id (FK → licenses)
- item_code (unique) - Código interno (ej: OFI-001)
- name - Nombre item
- description - Descripción
- category_id (FK → inventory_categories)
- current_stock - Stock actual (CALCULADO por VIEW desde movimientos)
- minimum_stock - Alerta si stock < esto
- unit_cost - Costo unitario
- unit_of_measure - unidades, cajas, litros, etc
- units_per_package - Cuántas unidades por paquete
- barcode - Código de barras
- location - Ubicación en bodega
- reorder_point - Punto para reabastecer
- created_at, updated_at
```

#### 4. `inventory_movements`
```sql
- id (UUID, primary key)
- license_id (FK → licenses)
- item_id (FK → inventory_items)
- movement_type (entrada, salida, ajuste, requisicion)
- quantity - +50 (entrada) o -50 (salida)
- reference_id - REQ-2026-0001, OC-2026-0001, etc
- reference_type - requisition, purchase_order, manual_adjustment
- notes - Notas del movimiento
- created_by (FK → users)
- created_at
  
VIEW: v_inventory_current_stock
├─ Calcula: SUM(quantity) para cada item
├─ Resultado: current_stock DINÁMICO
└─ Actualiza el dashboard en tiempo real
```

#### 5. `requisitions`
```sql
- id (UUID, primary key)
- license_id (FK → licenses)
- requisition_number (unique) - REQ-2026-0001
- user_id (FK → users) - Profesor que crea
- status - pendiente, en_revision, aprobada, rechazada, listo_para_recoger, entregado
- priority - baja, media, alta, urgente
- justification - Justificación
- cost_center_id (nullable, FK → cost_centers)
- total_items - Cantidad items en requisición
- approved_by (FK → users, quien aprobó)
- approved_at (timestamp)
- rejection_reason - Si fue rechazada
- delivered_at - Fecha entrega
- delivered_to_name - Nombre quien recibió
- delivered_signature_url - Firma digital
- created_at, updated_at
```

#### 6. `requisition_items` (detalle)
```sql
- id (UUID, primary key)
- requisition_id (FK → requisitions)
- item_id (FK → inventory_items)
- quantity - Cantidad solicitada
- unit_of_measure - unidades, cajas, etc
- units_per_package - Para paquetes
- created_at
```

#### 7. `purchase_requests`
```sql
- id (UUID, primary key)
- license_id (FK → licenses)
- request_number (unique) - SOL-2026-0001  
- user_id (FK → users) - Profesor que solicita
- status - pendiente, en_revision, aprobada, rechazada, convertida_orden
- justification - ¿Por qué?
- estimated_amount - Monto estimado
- approved_by (FK → users)
- approved_at (timestamp)
- created_at, updated_at
- cost_center_id (FK → cost_centers)
- purchase_request_attachment_url - Adjunto (PDF, specs, etc)
```

#### 8. `purchase_requests_items` (detalle)
```sql
- id (UUID)
- purchase_request_id (FK → purchase_requests)
- description - Descripción del item a comprar
- quantity - Cantidad
- estimated_unit_price - Precio estimado unitario
- notes
```

#### 9. `purchase_orders`
```sql
- id (UUID, primary key)
- license_id (FK → licenses)
- order_number (unique) - OC-2026-0001
- purchase_request_id (FK → purchase_requests)
- supplier_id (FK → suppliers)
- status - borrador, cotizacion, aprobada, en_proceso, recibida, cancelada
- total_amount - Monto final
- delivery_date - Fecha entrega acordada
- payment_method - credito, efectivo, transferencia
- payment_reference - Ref de pago (ej: cheque #123)
- quotation_url - PDF de cotización
- invoice_url - PDF de factura
- price_confirmed_at - Cuándo el gerente confirma precio
- delivered_at - Cuándo se recibió
- delivered_to_name - Nombre quien recibió
- delivered_signature_url - Firma digital
- internal_notes - Notas internas jefe compras
- is_locked - Si está bloqueada para edición
- created_by (FK → users)
- created_at, updated_at
```

#### 10. `purchase_order_items` (detalle)
```sql
- id (UUID)
- purchase_order_id (FK → purchase_orders)
- item_id (FK → inventory_items, nullable)
- description - Descripción
- quantity - Cantidad
- unit_price - Precio unitario
- subtotal - quantity * unit_price
```

#### 11. `approvals` / `express_order_approvals`
```sql
- id (UUID, primary key)
- express_order_id (FK → express_orders)
- user_id (FK → users) - Quién debe aprobar
- approval_role - admin, jefe_compras, finanzas
- status - pendiente, aprobada, rechazada
- approved_at (timestamp)
- rejection_reason
- created_at
```

#### 12. `activity_logs` (AUDITORÍA)
```sql
- id (UUID, primary key)
- license_id (FK → licenses)
- user_id (FK → users) - Quién hizo la acción
- action - create, update, delete, approve, reject, dispatch
- entity_type - requisition, purchase_order, inventory_item, etc
- entity_id - ID del registro afectado
- description - Descripción legible
- changes - JSON con before/after
- ip_address - IP de la acción
- created_at
  
IMPORTANTE: Este log es INMUTABLE (no se puede borrar/editar)
```

#### 13. `budgets` y `cost_centers`
```sql
budgets:
- id (UUID)
- license_id (FK)
- name - Ej: "Presupuesto Material Didáctico 2026"
- total_amount - Total presupuestado
- spent_amount - Total gastado
- remaining_amount - total - spent
- category - Categoría presupuesto
- fiscal_year - Año fiscal (2026)
- status - activo, agotado, cerrado

cost_centers:
- id (UUID)
- license_id (FK)
- name - Ej: "Classroom 101", "Biology Lab"
- budget_id (FK → budgets)
- budget_allocated - Presupuesto asignado
- budget_spent - Gastado
- manager_id (FK → users)
```

#### 14. `approval_reserves` / Triple Approval System
```sql
- id (UUID)
- license_id (FK)
- request_id o order_id (FK)
- required_approvers - JSON: [{role: 'admin'}, {role: 'jefe_compras'}, ...]
- current_approvals - JSON: [{role: 'admin', approved_at: ...}, ...]
- can_proceed - Boolean (true si todos han aprobado)
- created_at, approval_deadline
```

#### 15. `suppliers`
```sql
- id (UUID)
- license_id (FK)
- name - Nombre proveedor
- rfc - o equiv para país
- email, phone, contact_name
- address, city, postal_code
- is_active
- terms_days - Plazo de pago (30, 45, 60 días)
- rating - Calificación (1-5)
- created_at
```

---

## 🎨 FLUJO VISUAL DE LA APLICACIÓN

### Rutas Principales (React Router)

```
/ (Login)
│
└─ /dashboard/* (¡usuario autenticado!)
   │
   ├─ /dashboard/                    → Dashboard por rol
   │  ├─ Profesor → ProfessorDashboard
   │  ├─ Admin → AdminDashboard
   │  └─ Jefe compras → ChiefsDashboard
   │
   ├─ /dashboard/requisitions        → Ver, crear, aprobar requisiciones
   ├─ /dashboard/purchase-requests   → Ver, crear, aprobar solicitudes
   ├─ /dashboard/purchase-orders     → Ver, crear, aprobar órdenes
   ├─ /dashboard/inventory           → Ver/editar inventario + códigos barras
   ├─ /dashboard/inventory-import    → Importar Excel
   ├─ /dashboard/inventory-movements → Ver historial movimientos
   ├─ /dashboard/suppliers           → Gestionar proveedores
   ├─ /dashboard/budgets             → Presupuestos
   ├─ /dashboard/cost-centers        → Centros de costo
   ├─ /dashboard/express-orders      → Órdenes express
   ├─ /dashboard/window-delivery     → Despachos en ventana
   ├─ /dashboard/audit               → Log de auditoría
   ├─ /dashboard/users               → Admin de usuarios
   ├─ /dashboard/professional-reports → Reportes avanzados
   ├─ /dashboard/email-notifications → Admin notificaciones email
   ├─ /dashboard/settings            → Configuración
   └─ /dashboard/profile             → Perfil usuario
```

### Componentes Principales por Página

```
RequisitionsPage:
├─ Header con botón "Nueva Requisición"
├─ Filtros: por estado, prioridad
├─ Búsqueda por número requisición
├─ Tabla con requisiciones:
│  ├─ Número, usuario, estado, prioridad
│  ├─ Modal para crear:
│  │  ├─ CarrGREitode items (multi-select)
│  │  ├─ Cantidad por item
│  │  ├─ Justificación
│  │  └─ Prioridad
│  ├─ Botones por rol:
│  │  ├─ Profesor: Editar (si pendiente), PDF
│  │  ├─ Jefe compras: Aprobar/Rechazar, Despachar
│  │  └─ Admin: Todo
│  └─ MODAL "Despachar":
│     ├─ Nombre quien recibe
│     ├─ Canvas para firma digital
│     └─ Botón confirmar

PurchaseOrdersPage:
├─ Tabs: Todos, Pendientes, Aprobadas, Recibidas
├─ Tabla con órdenes
├─ MODAL "Crear Orden":
│  ├─ Seleccionar solicitud de compra
│  ├─ Seleccionar proveedor
│  ├─ Fecha entrega
│  ├─ Método pago
│  └─ Crear
├─ Acciones por estado:
│  ├─ cotizacion: Subir PDF de cotización
│  ├─ aprobada: Botón "Marcar recibida"
│  └─ recibida: Ver factura + firma
└─ MODAL "Recibir Orden":
   ├─ Confirmación cantidad
   ├─ Subir factura (PDF)
   ├─ Nombre quien recibe
   ├─ Canvas firma digital
   └─ Confirmar (auto-actualiza stock)
```

---

## 🔌 INTEGRACIÓN FRONTEND ↔ BACKEND

### supabaseClient.ts - Funciones Clave

```typescript
// AUTENTICACIÓN
export async function authenticateUser(authCode: string)
  → Query: SELECT users.*, licenses.* WHERE auth_code = UPPER(authCode)

// INVENTARIO
export async function getInventory(licenseId: string)
  → Query: SELECT * FROM inventory_items WHERE license_id = licenseId
  → Mapea a UI: { id, item_code, name, current_stock, ... }

export async function updateInventoryStock(itemId: string, newQuantity: number)
  → UPDATE inventory_items SET current_stock = newQuantity

// REQUISICIONES
export async function getRequisitions(licenseId: string, userId?: string)
  → Si userId: WHERE license_id AND user_id (solo sus requisiciones)
  → Si !userId: WHERE license_id (todas, para jefes)

export async function createRequisitionWithItems(
  licenseId, userId, items[], priority, justification, costCenterId
)
  → INSERT INTO requisitions: { REQ-{year}-{secuencial} }
  → Luego INSERT INTO requisition_items para cada item
  → TRIGGER: Luego notificación a jefe_compras

export async function updateRequisitionStatus(requisitionId, newStatus)
  → UPDATE requisitions SET status = newStatus
  → Si newStatus = 'aprobada':
     → TRIGGER: INSERT inventory_movements (type='requisicion', qty < 0)
     → TRIGGER: Notificación a profesor

// ÓRDENES
export async function createPurchaseOrderFromRequest(
  requestId, supplierId, deliveryDate, paymentMethod, amount
)
  → INSERT INTO purchase_orders: { OC-{year}-{secuencial} }
  → Enlaza con purchase_request_id
  → Status = 'cotizacion'

export async function updatePurchaseOrderStatus(orderId, newStatus)
  → UPDATE purchase_orders SET status = newStatus
  → Si status = 'recibida':
     → INSERT inventory_movements (type='entrada', qty > 0)
     → UPDATE inventory_items SET current_stock += qty
     → NOTIF a profesor: "Tu orden fue entregada"

// NOTIFICACIONES
export async function sendRequisitionStatusNotification(
  requisitionId, number, status, email, name, licenseId
)
  → INSERT INTO email_notifications: { status='pendiente' }
  → Script separa procesa y envía via SendGrid

// DATOS EN TIEMPO REAL
export async function getRequisitionsRealtime(licenseId, callback)
  → supabase.from('requisitions').on('*', callback)
  → Escucha cambios y actualiza la UI sin recargar
```

### Hooks Custom - Suscripciones Tiempo Real

```typescript
useRequisitionRealtime(licenseId, userId, onUpdate)
  └─ Escucha cambios en table 'requisitions'
     └─ Si el requisition_id pertenece a mi licencia
        └─ Ejecuta: onUpdate(id, updatedFields)
           └─ UI actualiza tabla sin refresh

useRealtimeData(table, filters, onData)
  └─ Hook genérico de tiempo real
     └─ Subscripciones a cambios en BD
        └─ Actualiza estado React automáticamente
```

---

## 📊 DASHBOARDS

### ProfessorDashboard
```
Métricas (4 cards):
├─ Total requisiciones: 12
├─ Pendientes: 3
├─ Aprobadas: 8
└─ Rechazadas: 1

Gráficos:
├─ Pie chart: Requisiciones por estado
├─ Line chart: Últimos 7 días de activity
├─ Bar chart: Solicitudes de compra

Acciones:
├─ Botón "Nueva Requisición"
├─ Botón "Nueva Solicitud de Compra"
└─ Lista con requisiciones y acciones rápidas
```

### ChiefsDashboard (Jefes de área)
```
KPI Cards (3):
├─ 🟡 Pendientes de aprobar: 5
├─ 🟢 Aprobadas este mes: 23
└─ 🔴 Rechazadas este mes: 2

Órdenes Pendientes (tabla expandible):
├─ Cada fila: número orden, usuario, monto, fecha
├─ Expandir: detalles completos, items, comentarios
├─ Botones: Aprobar, Rechazar (modal)
├─ Estados visuales: colores por tipo (express, standard)

Últimas Aprobaciones:
└─ Timeline histórico de acciones del usuario
```

### AdminDashboard (Admin general)
```
Métricas Globales (5 cards):
├─ 📦 Total items inventario: 842
├─ ⚠️  Stock bajo: 15 items  
├─ 💰 Valor total inv: Q 487,250
├─ 📋 Requisiciones pendientes: 8
└─ 🛒 Órdenes activas: 5

Alertas:
├─ 15 items con stock bajo
├─ 8 requisiciones en revisión
└─ 0 órdenes vencidas

Gráficos:
├─ Pie: Items por categoría
├─ Bar: Requisiciones por estado
├─ Line: Gasto vs presupuesto (mes)
├─ Pie: Órdenes por estado

Actividad Reciente:
└─ Timeline: últimas 10 acciones sistema-wide
   └─ Quién, cuándo, qué hizo
```

---

## 🔒 SEGURIDAD - ROW LEVEL SECURITY (RLS)

Cada tabla tiene políticas RLS de Supabase:

```sql
-- Usuarios solo ven datos de su licencia
CREATE POLICY "Users can view own license data"
ON requisitions FOR SELECT
USING (
  license_id IN (
    SELECT license_id FROM users WHERE id = auth.uid()
  )
);

-- Solamente admin puede ver logs de auditoría
CREATE POLICY "Only admins can view audit logs"
ON activity_logs FOR SELECT  
USING (
  auth.uid() IN (
    SELECT id FROM users 
    WHERE role IN ('admin', 'super_admin')
  )
);

-- Los logs son append-only (no se pueden borrar)
CREATE POLICY "Audit logs are immutable"
ON activity_logs FOR DELETE
USING (false); -- ← NUNCA permitir delete
```

---

## 📡 COMUNICACIÓN EN TIEMPO REAL

### Notificaciones (3 niveles)

```
NIVEL 1: Toast (Temporal en UI)
├─ Mensaje: "Requisición aprobada exitosamente"
├─ Duración: 3 segundos
└─ Tipo: success, error, info

NIVEL 2: Bell (Campanita del header)
├─ Usuario recibe notificación
├─ A través de: subscribe('notifications')
├─ Mostrara badge con contador
└─ Click: abre bandeja

NIVEL 3: Email
├─ Tabla: email_notifications
├─ Status: pendiente → enviado → error
├─ Body: HTML formateado con detalles
├─ Provider: SendGrid
└─ Script: processNotifications.mjs (Node.js cada 5 min)
```

### Flujo Email

```
Acción en BD
  ↓
INSERT INTO email_notifications: {
  status: 'pendiente',
  recipient_email: 'profesor@colegio.edu.gt',
  subject: 'Tu requisición REQ-2026-0001 fue aprobada',
  body: '...',
  link: 'https://mao.ejemplo.com/dashboard/requisitions/...',
  action_date: NOW()
}
  ↓
Cron job (cada 5 minutos):
  npm run process:notifications
  ↓
Script Node (processNotifications.mjs):
├─ SELECT * FROM email_notifications WHERE status = 'pendiente'
├─ Para cada notificación:
│  ├─ Construye HTML con template
│  ├─ Llama SendGrid API
│  ├─ Si éxito: UPDATE status = 'enviado'
│  └─ Si falla: UPDATE status = 'error' + retry_count++
│
└─ Log del resultado
```

---

## 📈 MÉTRICAS Y VISTAS SQL

### Vistas (Calculated Tables)

```sql
v_inventory_current_stock:
└─ Para cada item: SUM(quantity) de inventory_movements
   ├─ Resultado: current_stock dinámico
   ├─ Se recalcula automáticamente
   └─ Usado por: AdminDashboard, InventoryPage

v_requisitions_summary:
└─ Para una licencia:
   ├─ total_requisitions: COUNT(*)
   ├─ approved_count: COUNT WHERE status = 'aprobada'
   ├─ in_review_count: COUNT WHERE status = 'en_revision'
   ├─ rejected_count: COUNT WHERE status = 'rechazada'
   └─ Usado por: AdminDashboard

v_purchase_orders_summary:
└─ total_orders, pending_count, in_transit_count, completed_count
   ├─ total_amount: SUM(total_amount)
   ├─ pending_amount: SUM WHERE status != 'recibida'
   └─ Usado por: AdminDashboard, Reports

v_recent_activity:
└─ SELECT FROM activity_logs
   ├─ últimas 10 acciones
   ├─ ORDERBY created_at DESC
   └─ Usado por: AdminDashboard
```

---

## 🛠️ FUNCIONALIDADES PRINCIPALES

### 1. Importación de Inventario (InventoryImportPage)
```
CSV → Validación → Detección Duplicados → Batch Insert
                        ↓
                Mapeo personalizado:
                ├─ Auto-detección columnas
                ├─ Mapeo manual column-by-column
                ├─ Guardar como template
                └─ Aplicar mapeos previos

Error Report:
├─ Tabla con errores por fila
├─ Categoría: required, format, duplicate
├─ Datos completos (JSON)
└─ Opción para editar y reintentar

Undo:
├─ Historial en table inventory_imports
├─ Si can_undo = true: botón para deshacer
├─ Elimina todos items de esa importación
└─ Registra acción en audit_logs
```

### 2. Códigos de Barras (InventoryPage)
```
Cada item puede tener:
├─ código de barras (barcode field)
├─ código interno (item_code)
├─ código de alternata/proveedor

Funcionalidad:
├─ Generar código barras automático (JsBarcode)
├─ Escanear con lector (en RequisitionsPage, InventoryPage)
├─ Click en item: auto-llena en formularios
└─ PDF con códigos para imprimir
```

### 3. Generación de PDFs
```
Usando: jspdf + jspdf-autotable + html2canvas

Documentos:
├─ Requisición (con items, aprobaciones, firmas)
├─ Orden de Compra (con cotización referencia)
├─ Factura (si existe adjunto)
├─ Reporte de inventario
├─ Reporte de gastos

Características:
├─ Logo institución (header)
├─ Números de documento
├─ Fecha/hora impresión
├─ Firma digital capturada
├─ Código QR para tracking (opcional)
└─ Múltiples páginas si es necesario
```

### 4. Firmas Digitales
```
Canvas HTML5 para capturar firma manual:
├─ Mouse/Táctil compatible
├─ Elemento: <canvas ref={canvasRef}>
├─ Evento: onMouseDown → onMouseMove → onMouseUp
├─ Convertir a PNG: canvas.toDataURL('image/png')
├─ Guardar en Storage (Supabase):
│  └─ URL pública en base de datos
└─ Mostrar en PDF + Email
```

### 5. Presupuestos y Centros de Costo (BudgetsPage, CostCentersPage)
```
Presupuesto:
├─ Cantidad total asignada (ej: Q 100,000)
├─ Categoría (ej: Material Didáctico)
├─ Año fiscal
├─ Status: activo, agotado, cerrado

Centro de Costo:
├─ Nombre (ej: "Classroom 101", "Math Department")
├─ Presupuesto asignado (de budgets)
├─ Gasto actualizado automáticamente
├─ Manager responsable
└─ Reporte: Qué se gastó, en qué, cuándo

Requisición + Centro Costo:
├─ Finanzas asigna centro costo a requisición
├─ Sistema suma gasto a ese centro
├─ Si gasto > presupuesto: ⚠️ Alerta
└─ Puede rechazar si no hay presupuesto
```

### 6. Sistema de Aprobaciones Triple (Express Orders)
```
Para compras urgentes sin requisición:

3 roles DEBEN aprobar:
├─ Admin: ¿Datos completos?
├─ Jefe Compras: ¿Proveedor confiable?
└─ Finanzas: ¿Hay presupuesto?

En BD (approvals o approval_reserves):
├─ express_order_id
├─ required_approvers: [{role: 'admin'}, {role: 'jefe_compras', ...}]
├─ current_approvals: [{role: 'admin', approved_at: '2026-02-22'}, ...]
└─ can_proceed: true si todos aprobaron

En UI:
├─ Cada usuario ve card: "Requiere tu aprobación"
├─ Botones: Aprobar, Ver Detalles
├─ Notificaciones para quien falta aprobar
└─ Al 3er aprobador: auto-procede
```

### 7. Reportes Profesionales (ProfessionalReportsPage)
```
Generan tablas complejas + gráficos:

Reportes disponibles:
├─ Inventario detallado (con movimientos)
├─ Requisiciones (filtro por rango fecha, estado, usuario)
├─ Órdenes de Compra (con gasto, proveedor, plazo)
├─ Gastos por Presupuesto (vs asignado)
├─ Actividad de Usuario (auditoría personal)
├─ Proveedores (rating, frecuencia, montos)
└─ Análisis de Stock Over Time

Formato salida:
├─ HTML (para ver en navegador)
├─ CSV (para Excel)
├─ PDF (para imprimir)
└─ JSON (para API)
```

---

## 🚀 CICLO DE VIDA DE UNA ACCIÓNN

Ejemplo: Profesor crea requisición

```
1. FRONTEND: Usuario ingresa datos
   - RequisitionsPage component
   - Carga items en itemCart
   - Click "Crear"
   
2. VALIDACIÓN CLIENT-SIDE
   - React Hook Form + Zod
   - ¿Cantidad > 0? ¿Justificación presente?
   - Si error: toast.error() → mensaje en UI

3. API CALL
   - supabaseClient.createRequisitionWithItems({...})
   - Envía data a Supabase

4. BACKEND (SUPABASE)
   - INSERT INTO requisitions: genera REQ-2026-0001
   - INSERT INTO requisition_items (N filas)
   - TRIGGER: INSERT activity_logs
   - TRIGGER: INSERT email_notifications
   - TRIGGER: notificación a Zustand store

5. FRONTEND: Response
   - toast.success("Requisición creada como REQ-2026-0001")
   - Limpia formulario
   - onSuccess callback: reload list
   - useRequisitionRealtime: recibe cambio + actualiza tabla

6. NOTIFICACIONES
   - Toast: "Requisición ingresada"
   - Email: envío pendiente (cron cada 5 min)
   - Bell: Jefe compras recibe notificación

7. DISPONIBLE PARA
   - Profesor: puede ver su requisición en lista
   - Jefe Compras: aparece en ChiefsDashboard
   - Admin: visible en AdminDashboard + AuditPage
```

---

## ⚙️ CONFIGURACIÓN Y DEPLOYMENT

### Variables de Entorno (.env)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_APP_NAME=MAO 2026
VITE_API_ENDPOINT=https://api.mao2026.edu.gt (opcional)
SENDGRID_API_KEY=SG.xxxxx (para emails)
SENDGRID_FROM=noreply@mao2026.edu.gt
```

### Build & Deploy
```bash
# Development
npm run dev           # Vite en puerto 5173

# Production
npm run build         # Compile TypeScript + minify
npm run preview       # Preview build localmente

# Deployment
# 1. Build ejecuta: tsc && vite build
# 2. Genera dist/ folder
# 3. Deploy a: Vercel, Netlify, tu servidor
```

---

## 📚 TECNOLOGÍAS UTILIZADAS

### Frontend
- **React 18** - UI library
- **Vite** - Bundler/SSR
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling utility-first
- **React Hook Form** - Form management
- **Zod** - Data validation
- **Zustand** - State management
- **Recharts** - Data visualization
- **TanStack Table** - Data table handling
- **Lucide React** - Icons
- **html2canvas** - Canvas to image
- **JSPdf** - PDF generation
- **Excel (xlsx)** - Excel parsing
- **React Router** - Routing
- **React Hot Toast** - Notifications

### Backend / Database
- **Supabase** - PostgreSQL + Auth + Storage + Realtime
- **PostgreSQL** - Database
- **Row Level Security (RLS)** - Authorization
- **JavaScript/SQL Triggers** - Automations
- **Edge Functions** (opcional) - Serverless

### Other Tools
- **SendGrid** - Email delivery
- **Node.js** - Server-side scripts (processNotifications.mjs)
- **ESLint** - Code linting
- **PostCSS** - CSS processing

---

## 🎯 FLUJO GENERAL DE LA APLICACIÓN

```
┌─────────────────────────────────────────┐
│  Acceso por Navegador                   │
│  http://localhost:5173 (dev)           │
│  https://mao2026.edu.gt (prod)         │
└──────────────┬──────────────────────────┘
               │
               ↓
        ┌─────────────────┐
        │  LoginPage      │
        │  auth_code      │
        └────────┬────────┘
                 │ Validar contra BD
                 ↓
        ┌──────────────────────────┐
        │  Cargar user + license   │
        │  Zustand authStore       │
        └────────┬─────────────────┘
                 │
                 ↓
        ┌──────────────────────────┐
        │  DashboardLayout         │
        │  ├─ Sidebar (menú)       │
        │  ├─ TopBar               │
        │  └─ Main content         │
        └────────┬─────────────────┘
                 │
                 ├─→ Dashboard (por rol)
                 ├─→ Requisiciones
                 ├─→ Compras
                 ├─→ Inventario
                 ├─→ Órdenes
                 ├─→ Auditoría
                 └─→ Configuración
                 
        TODAS ACCIONES:
        ├─ Validar permisos (role-based)
        ├─ Query/Mutation a Supabase
        ├─ Actualizar Zustand store
        ├─ Toast notification
        ├─ Registrar en audit_logs
        ├─ Enviar email (si aplica)
        └─ Actualizar BD + UI (realtime)
```

---

## 🔍 PUNTOS CLAVE DEL PROYECTO

### ✅ Completado
- [x] Autenticación multi-tenant
- [x] Gestión de roles y permisos granulares
- [x] Requisiciones con aprobación
- [x] Solicitudes de compra
- [x] Órdenes de compra con cotizaciones
- [x] Control de inventario con movimientos automáticos
- [x] Importación de inventario (Excel → CSV)
- [x] Códigos de barras y QR
- [x] Presupuestos y centros de costo
- [x] Firmas digitales
- [x] Notificaciones en tiempo real (campanita + email)
- [x] Sistema de aprobaciones triple (express orders)
- [x] Auditoría inmutable
- [x] PDFs de documentos
- [x] Exportación a CSV
- [x] Múltiples dashboards por rol
- [x] Despacho en ventanas de tiempo
- [x] Row Level Security (RLS)
- [x] Visualización de datos (Recharts)

### 🚀 En Desarrollo / Por Hacer
- [ ] Móvil app (React Native)
- [ ] Integración con APIs externas (Bancos para pagos)
- [ ] IA para predicción de inventario
- [ ] Webhooks para sistemas externos
- [ ] Integración RRHH (nómina, empleados)
- [ ] Biometría avanzada (huella dactilar con hardware)
- [ ] Escaneo de documentos OCR
- [ ] Sincronización offline

---

## 📞 CONTACTOS Y REFERENCIAS

**Proyecto:** MAO 2026 - Sistema de Gestión de Inventario  
**Versión:** v0.1.0  
**Estado:** Production Ready  
**Última actualización:** 22 de febrero de 2026

---

## 🎓 CONCLUSIÓN

El proyecto MAO 2026 es un sistema enterprise-grade completo que automatiza los procesos de requisiciones, compras e inventario para instituciones educativas. 

**Características diferenciadoras:**
1. **Multi-tenant por defecto** - Cada institución aislada mediante RLS
2. **Roles granulares** - 10 roles con permisos específicos
3. **Auditoría completa** - Cada cambio registrado e inmutable
4. **Tiempo real** - Notificaciones + UI actualizada automáticamente
5. **Flujos complejos** - Aprobaciones múltiples, presupuestos, centros de costo
6. **Documentación** - Generación automática de PDFs
7. **Seguridad** - RLS + validaciones + role-based access control

**Stack moderno:** React + Supabase + TypeScript + Tailwind  
**Listo para:** Producción y escalabilidad
