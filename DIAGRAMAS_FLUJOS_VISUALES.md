# 🗺️ MAPA VISUAL DE FLUJOS - MAO 2026

## 📊 Diagrama 1: ARQUITECTURA GENERAL

```
┌──────────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR DEL USUARIO                         │
│  http://localhost:5173 (dev) | https://mao2026.edu.gt (prod)        │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ React App      │
                    │ (Vite + TS)    │
                    └────────┬───────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
    ┌──────────┐      ┌──────────────┐    ┌─────────────┐
    │ Router   │      │ State Mgmt   │    │ UI Comps    │
    │          │      │ (Zustand)    │    │ (React)     │
    │ /        │      │              │    │             │
    │ /dash... │      │authStore:    │    │Dashboards   │
    │ /auth    │      │ user         │    │Pages        │
    │ /inv...  │      │ license      │    │Modals       │
    │ /orders  │      │              │    │Forms        │
    └────┬─────┘      └──────┬───────┘    └──────┬──────┘
         │                   │                    │
         └───────────────────┼────────────────────┘
                             │
                             ▼
            ┌────────────────────────────────┐
            │     supabaseClient.ts           │
            │  (150+ funciones de BD)         │
            │                                │
            │ - authenticateUser()           │
            │ - getRequisitions()            │
            │ - createRequisition()          │
            │ - updateRequisitionStatus()    │
            │ - getPurchaseOrders()          │
            │ - receiveOrder()               │
            │ ... y muchas más               │
            └────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │        SUPABASE Cloud               │
        ├────────────────────────────────────┤
        │                                    │
        │  PostgreSQL Database:              │
        │  ├─ licenses                       │
        │  ├─ users                          │
        │  ├─ requisitions                   │
        │  ├─ purchase_orders                │
        │  ├─ inventory_items                │
        │  ├─ inventory_movements            │
        │  ├─ activity_logs (AUDITORÍA)      │
        │  ├─ email_notifications            │
        │  ├─ approvals (triple approval)    │
        │  └─ ... y todas las demás          │
        │                                    │
        │  Storage:                          │
        │  ├─ requisition-signatures/        │
        │  ├─ delivery-signatures/           │
        │  ├─ invoice-files/                 │
        │  ├─ quotations/                    │
        │  └─ attachments/                   │
        │                                    │
        │  Realtime Subscriptions:           │
        │  ├─ requisitions changes           │
        │  ├─ purchase_orders changes        │
        │  ├─ notifications                  │
        │  └─ activity_logs                  │
        │                                    │
        │  Row Level Security (RLS):         │
        │  ├─ Users only see own license     │
        │  ├─ Audit logs: admin only         │
        │  └─ Immutable logs                 │
        └────────┬───────────────────────────┘
                 │
    ┌────────────┼────────────────────┐
    │            │                    │
    ▼            ▼                    ▼
┌──────────┐ ┌────────────┐    ┌──────────────┐
│SendGrid  │ │Node.js     │    │Database      │
│ (Envío  │ │Script      │    │Triggers      │
│  Emails) │ │(process... │    │& Functions   │
│          │ │Notif)      │    │              │
└──────────┘ └────────────┘    └──────────────┘
```

---

## 🔄 Diagrama 2: FLUJO REQUISICIÓN COMPLETO

```
┌──────────────────────┐
│   PROFESOR           │
│   (Necesita items)   │
└──────────┬───────────┘
           │
           │ 1. Accede Dashboard
           ▼
    ┌──────────────────────────────┐
    │ ProfessorDashboard           │
    │ - Ver mis requisiciones      │
    │ - Botón "Nueva Requisición"  │
    └──────────┬───────────────────┘
               │
               │ 2. Click "Nueva Requisición"
               ▼
      ┌──────────────────────────────────┐
      │ RequisitionsPage Modal           │
      │                                  │
      │ 1. Selecciona items (multi)      │
      │ 2. Ingresa cantidades            │
      │ 3. Justificación                 │
      │ 4. Prioridad (baja/media/alta)   │
      │ 5. Click "Crear"                 │
      └──────────┬───────────────────────┘
                 │
                 │ 3. Frontend valida con Zod
                 │    (cantidad > 0, etc)
                 ▼
      ┌──────────────────────────────────┐
      │ supabaseClient.                  │
      │ createRequisitionWithItems()     │
      │                                  │
      │ API Call → Supabase              │
      └──────────┬───────────────────────┘
                 │
                 │ 4. Base de datos
                 ▼
      ┌──────────────────────────────────┐
      │ INSERT requisitions              │
      │ { requisition_number: REQ-      │  
      │   REQ-2026-0001,                │
      │   status: "pendiente",           │
      │   user_id: profesor_id,          │
      │   created_at: NOW()              │
      │ }                                │
      │                                  │
      │ INSERT requisition_items (N)     │
      │ Para cada item seleccionado      │
      │ { req_id, item_id, qty, unit }   │
      └──────────┬───────────────────────┘
                 │
                 │ 5. TRIGGER automático
                 ▼
      ┌──────────────────────────────────┐
      │ TRIGGER: on_requisition_created  │
      │                                  │
      │ 1. INSERT activity_logs          │
      │    { action: 'create',           │
      │      entity: 'requisitions',     │
      │      user_id: profesor_id,       │
      │      timestamp: NOW() }          │
      │                                  │
      │ 2. INSERT email_notifications    │
      │    { status: 'pendiente',        │
      │      to: jefe_compras@,          │
      │      subject: 'Nueva Req',       │
      │      link: /dashboard/req/... }  │
      └──────────┬───────────────────────┘
                 │
                 │ 6. Frontend response
                 ▼
      ┌──────────────────────────────────┐
      │ toast.success(                   │
      │   "Requisición creada como       │
      │    REQ-2026-0001"                │
      │ )                                │
      │                                  │
      │ Limpiar formulario               │
      │ Actualizar lista                 │
      │ useRequisitionRealtime()         │
      │ recibe cambio                    │
      └──────────┬───────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
PROFESOR PUEDE VER:     JEFE COMPRAS RECIBE:
├─ REQ en su lista     ├─ Notificación Bell
├─ Status: pendiente   ├─ Email (SendGrid)
├─ Items detallados    │  (ProcessNotif.mjs)
└─ Botón "Ver"         ├─ ChiefsDashboard
                       │  muestra orden
                       └─ Puede Aprobar/Rechazar
                       
                       ┌─────────────────────┐
                       │                     │
                       │ 7A. JEFE APRUEBA    │
                       │                     │
                       ├─ Click "Aprobar"   │
                       │                     │
                       ├─ UPDATE requisit.. │
                       │  status: aprobada  │
                       │                     │
                       └─────────────────────┘
                                │
                                ▼
                       ┌─────────────────────┐
                       │ TRIGGER automático  │
                       │                     │
                       │ 1. INSERT           │
                       │    movement:        │
                       │    type: requisicion│
                       │    qty: -50 (sale)  │
                       │    item_id: ...     │
                       │                     │
                       │ 2. UPDATE          │
                       │    inventory_items │
                       │    current_stock   │
                       │    -= 50            │
                       │                     │
                       │ 3. INSERT          │
                       │    email_notif     │
                       │    to: profesor@   │
                       │    "Tu req aprobada│
                       │ "                   │
                       └─────────────────────┘
                                │
                                ▼
                       ┌─────────────────────┐
                       │ Status ACTUALIZADO  │
                       │                     │
                       │ REQ Estado:         │
                       │ ✅ aprobada         │
                       │                     │
                       │ Stock Actualizado:  │
                       │ ANTES: 100 units    │
                       │ DESPUÉS: 50 units   │
                       │ Diferencia: -50 ✅  │
                       └─────────────────────┘
                       
───────────────────────────────────────────

                       ┌──────────────────────────┐
                       │                          │
                       │ 7B. JEFE RECHAZA         │
                       │                          │
                       ├─ Click "Rechazar"       │
                       │                          │
                       ├─ Modal: ingresar motivo │
                       │                          │
                       ├─ UPDATE requisit..      │
                       │  status: rechazada      │
                       │  rejection_reason: "..." │
                       │                          │
                       └─────────────────────────┬─┘
                                                │
                                                ▼
                                    ┌─────────────────────┐
                                    │ TRIGGER automático  │
                                    │                     │
                                    │ 1. INSERT activity_ │
                                    │    logs             │
                                    │    action: 'reject' │
                                    │                     │
                                    │ 2. INSERT email_    │
                                    │    notif            │
                                    │    to: profesor@    │
                                    │    "Tu req fue      │
                                    │     rechazada       │
                                    │     porque: ..."    │
                                    └─────────────────────┘
                                                │
                                                ▼
                                    Profesor recibe email
                                    + ve estado en app
                       
───────────────────────────────────────────

        ▼ DESPUÉS DE APROBACIÓN
        
    ┌─────────────────────────────┐
    │  JEFE COMPRAS DESPACHAA     │
    │                             │
    │  1. Busca requisición       │
    │  2. Click "Despachar"       │
    │  3. Modal:                  │
    │     - Nombre del que recibe │
    │     - Canvas: Firma         │
    │  4. Click "Confirmar"       │
    │                             │
    └──────────┬──────────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ stored_signature.png      │
    │ (en Storage Supabase)     │
    │                           │
    │ UPDATE requisitions:      │
    │ status: delivered         │
    │ delivered_to_name: "..."  │
    │ delivered_sig_url: "..."  │
    │ delivered_at: NOW()       │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ TRIGGER: on_requisition  │
    │ delivered (automático)   │
    │                          │
    │ INSERT activity_logs     │
    │ action: 'dispatch'       │
    │                          │
    │ INSERT email_notif       │
    │ to: profesor@            │
    │ "Tu requisición fue      │
    │  entregada hoy a las..." │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ ✅ REQUISICIÓN COMPLETA  │
    │ Status: delivered        │
    │ Stock: actualizado       │
    │ Firma: registrada        │
    │ Auditoría: completa      │
    └──────────────────────────┘
```

---

## 🛒 Diagrama 3: FLUJO ORDEN DE COMPRA

```
┌──────────────────────────────────────┐
│ PROFESOR solicita COMPRAR items      │
│ (No están en inventario)             │
└──────────────────┬──────────────────┘
                   │
                   │ 1. PurchaseRequestsPage
                   │    Click "Nueva Solicitud"
                   ▼
        ┌────────────────────────────────┐
        │ PASO 1: CREAR SOLICITUD        │
        │                                │
        │ Datos:                         │
        │ - Descripción items            │
        │ - Cantidad estimada            │
        │ - Monto estimado               │
        │ - Justificación                │
        │ - Adjuntos (specs PDF)         │
        │                                │
        │ Click "Crear"                  │
        │ = SOL-2026-0001                │
        └────────────┬───────────────────┘
                     │
                     │ 2. Notificación a GERENTE
                     ▼
        ┌────────────────────────────────┐
        │ PASO 2: GERENTE REVISA         │
        │                                │
        │ ChiefsDashboard                │
        │ - Ve solicitud                 │
        │ - Monto: Q 5,000               │
        │ - Justif: "Needed for class"   │
        │                                │
        │ Opciones:                      │
        │ - Aprobar (Q5000 tiene presup) │
        │ - Rechazar (describe motivo)   │
        │                                │
        │ Click APROBAR                  │
        │ status = aprobada              │
        └────────────┬───────────────────┘
                     │
                     │ 3. Notificación a JEFE COMPRAS
                     ▼
        ┌────────────────────────────────┐
        │ PASO 3: JEFE CONVIERTE A ORDEN │
        │                                │
        │ PurchaseOrdersPage             │
        │ - Ve requisiciones aprobadas   │
        │ - Click "Crear Orden"          │
        │ - Modal desplegable:           │
        │   ├─ Seleccionar proveedor     │
        │   ├─ Fecha entrega             │
        │   ├─ Monto final confirmado    │
        │   └─ Click "Crear"             │
        │                                │
        │ = OC-2026-0001                 │
        │ status = cotizacion            │
        └────────────┬───────────────────┘
                     │
                     │ 4. Email a PROVEEDOR
                     │    (SendGrid)
                     ▼
        ┌────────────────────────────────┐
        │ PROVEEDOR recibe:              │
        │ - Email con detalles orden     │
        │ - Link a cotización            │
        │ - Plazo para responder: 3 días │
        │                                │
        │ (Fuera del sistema)            │
        │ Prepara cotización PDF         │
        └────────────┬───────────────────┘
                     │
                     │ 5. Jefe compras carga cot.
                     ▼
        ┌────────────────────────────────┐
        │ PASO 4: CARGAR COTIZACIÓN      │
        │                                │
        │ PurchaseOrdersPage             │
        │ - Busca OC-2026-0001           │
        │ - Click "Subir Cotización"     │
        │ - Selecciona PDF del proveedor │
        │ - Click "Guardar"              │
        │                                │
        │ quotation_url = storage_link   │
        └────────────┬───────────────────┘
                     │
         ┌───────────┴──────────────┐
         │ ¿Múltiples proveedores?  │
         ▼                          ▼
    SI (N>=2)                   NO (N=1)
         │                        │
         ▼                        ▼
    ┌──────────────┐      ┌─────────────────┐
    │PASO 5:       │      │AUTO-APROBADA o  │
    │COMPARACIÓN   │      │REQUIERE 1 CLICK │
    │              │      │                 │
    │Gerente abre  │      │status = aprobada│
    │tabla         │      └────────┬────────┘
    │comparativa   │               │
    │  -Precio     │               │
    │  -Plazo      │               │
    │  -Términos   │               │
    │  -Rating     │               │
    │              │               │
    │Click ganador │               │
    └──────┬───────┘               │
           │                       │
           │ status = aprobada ◄───┘
           │
           ▼
    ┌─────────────────────────────┐
    │ PASO 6: RECIBIR ORDEN       │
    │                             │
    │ Proveedor envía productos   │
    │ Jefe compras:               │
    │ 1. Busca OC-2026-0001       │
    │ 2. Verifica cantidad        │
    │ 3. Click "Marcar recibida"  │
    │                             │
    │ Modal:                      │
    │ - Confirmar cantidad        │
    │ - Subir factura (PDF)       │
    │ - Firma digital (canvas)    │
    │ - Click "Confirmar"         │
    │                             │
    │ status = recibida           │
    └────────┬────────────────────┘
             │
             │ 7. TRIGGER automático
             ▼
    ┌─────────────────────────────┐
    │ 1. INSERT inventory_movement│
    │    type: entrada            │
    │    item_id: ...             │
    │    quantity: +100           │
    │    ref: OC-2026-0001        │
    │                             │
    │ 2. UPDATE inventory_items   │
    │    current_stock += 100     │
    │                             │
    │ 3. INSERT email_notif       │
    │    to: profesor@ + gerente@ │
    │    "Orden OC-2026-0001      │
    │     fue entregada"          │
    │                             │
    │ 4. INSERT activity_logs     │
    │    action: 'order_received' │
    └────────┬────────────────────┘
             │
             ▼
    ┌─────────────────────────────┐
    │ ✅ ORDEN COMPLETADA         │
    │                             │
    │ Status: recibida            │
    │ Stock inventario: +100      │
    │ Factura: archivada          │
    │ Firma: registrada           │
    │ Auditoría: completa         │
    │ Presupuesto: actualizado    │
    │ Centro costo: gastó Q5,000  │
    └─────────────────────────────┘
```

---

## ⚡ Diagrama 4: SISTEMA APROBACIÓN TRIPLE (EXPRESS)

```
┌────────────────────────────┐
│ ORDEN EXPRESS URGENTE      │
│ (ej: Emergencia, ruptura)  │
│                            │
│ SIN requisición previa      │
│ Jefe compras crea direct   │
└────────────┬───────────────┘
             │
             ▼
    ┌──────────────────────┐
    │ CreateExpressOrder   │
    │                      │
    │ Idata:               │
    │ - Proveedor          │
    │ - Items              │
    │ - Monto              │
    │ - Justifcación       │
    │ - Centro costo       │
    │ - Fecha entrega      │
    │                      │
    │ Click "Crear"        │
    │ = EXP-2026-0001      │
    └──────┬───────────────┘
           │
           ▼
    ┌──────────────────────────────┐
    │ TRIPLE APPROVAL SYSTEM       │
    │                              │
    │ INSERT approval_reserves:    │
    │ {                            │
    │   express_order_id,          │
    │   required_approvers: [      │
    │     {role: 'admin'},         │
    │     {role: 'jefe_compras'},  │
    │     {role: 'finanzas'}       │
    │   ],                         │
    │   current_approvals: [],     │
    │   can_proceed: false         │
    │ }                            │
    │                              │
    │ 3 Notificaciones enviadas    │
    └──────┬───────────────────────┘
           │
    ┌──────┴──────────┬──────────┬──────────┐
    │                 │          │          │
    ▼                 ▼          ▼          ▼
┌────────┐      ┌──────────┐ ┌────────┐ ┌──────────┐
│ Admin  │      │ Jefe     │ │ Fin.   │ │ Proceso  │
│ recibe │      │ Compras  │ │ recibe │ │ paralelo │
│ notif  │      │ recibe   │ │ notif  │ │          │
└───┬────┘      └────┬─────┘ └──┬─────┘ │ (todos   │
    │                │          │       │  ven     │
    │ Revisa datos   │ Revisa   │ Revisa│  progreso)
    │ completos      │ provider │ presup│
    │ OK?            │ confiable│ dispo│
    │                │          │       │
    │ Click Aprobar  │ Click    │ Click │
    │                │ Aprobar  │ Aprobar
    │                │          │       │
    ▼                ▼          ▼       ▼
  Update current_approvals (3 veces)
           ↓
    ┌────────────────────────────┐
    │ Verificar: ¿Los 3 aprobó? │
    │                            │
    │ IF count == 3:             │
    │   can_proceed = true       │
    │   status = aprobada        │
    │   TRIGGER:                 │
    │   - Notif jefe_compras     │
    │   - "Proceder a compra"    │
    │                            │
    │ ELSE:                      │
    │   Esperar otros            │
    │   Mostrar: 1/3 aprobado... │
    └────────────────────────────┘
           │
           ▼
    ┌──────────────────────┐
    │ Jefe Compras:        │
    │ "Todos aprobaron"    │
    │ Puede proceder       │
    │ Click "Ejecutar Co.. │
    └────────┬─────────────┘
             │
             ▼
    ┌──────────────────────┐
    │ ✅ ORDEN EJECUTADA   │
    │                      │
    │ Status: en_proceso   │
    │ Email a proveedor    │
    │ Auditoría: completa  │
    │ Presupuesto: usado   │
    └──────────────────────┘
```

---

## 📱 Diagrama 5: NOTIFICACIONES EN TIEMPO REAL

```
┌────────────┐
│ Acción BD  │ (INSERT, UPDATE, DELETE requisition)
└─────┬──────┘
      │
      ▼
┌─────────────────────────────────────┐
│ SUPABASE AUTOMÁTICO TRIGGERS        │
│                                     │
│ 1. INSERT activity_logs             │
│    {action, entity, user_id, ts}    │
│                                     │
│ 2. INSERT email_notifications       │
│    {status: 'pendiente', to, subj}  │
│                                     │
│ 3. BROADCAST realtime change        │
│    channel: requisitions            │
│    payload: {id, status, updated}   │
└────────┬────────────────────────────┘
         │
    ┌────┴────────────────────────┐
    │                             │
    ▼                             ▼
┌─────────────────┐      ┌──────────────────┐
│ REALTIME (Ws)   │      │ EMAIL (Async)    │
│                 │      │                  │
│ Subscripción    │      │ Script Node.js   │
│ en Frontend     │      │ (cada 5 min)     │
│                 │      │                  │
│ useRequisition  │      │ SELECT *         │
│ Realtime()      │      │ FROM email_noti..│
│ escucha change  │      │ WHERE status=    │
│                 │      │ 'pendiente'      │
│ UI actualiza:   │      │                  │
│ - Tabla         │      │ Para cada:       │
│ - Contador      │      │ → SendGrid API   │
│ - Métrica       │      │ → UPDATE status  │
│                 │      │   'enviado'      │
│ INSTANT (< 1s)  │      │                  │
└────────┬────────┘      └────────┬─────────┘
         │                        │
         │                        │ ~ 5 min
         │                        │
         ▼                        ▼
  ┌────────────────┐    ┌─────────────────┐
  │ BELL (Campanita)   │ EMAIL Received  │
  │                    │                 │
  │ Badge +1           │ Inbox usuario   │
  │ Toast + Sound      │ "Notificación"  │
  │ "Nueva order"      │                 │
  │                    │ Links clickable │
  │ Click bell:        │ → App dashboard │
  │ → Abre bandeja     │                 │
  │ → Ver detalles     │                 │
  │ → Click → App      │                 │
  └────────────────┘    └─────────────────┘
        (User Online)           (User puede
                                 estar offline)
```

---

## 🔒 Diagrama 6: SEGURIDAD - ROW LEVEL SECURITY

```
┌────────────────────────────────────┐
│ Usuario intenta acceder a BD       │
│ SELECT * FROM requisitions         │
└────────────┬───────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ SUPABASE RLS POLICIES VERIFICAN:    │
│                                      │
│ 1. ¿Está autenticado?               │
│    auth.uid() = user_id             │
│                                      │
│ 2. ¿Qué rol tiene?                  │
│    SELECT role FROM users           │
│    WHERE id = auth.uid()            │
│                                      │
│ 3. ¿Qué licencia tiene?             │
│    SELECT license_id FROM users     │
│    WHERE id = auth.uid()            │
└────────────┬────────────────────────┘
             │
    ┌────────┴────────────────────┐
    │                             │
    ▼                             ▼
┌────────────────────────┐  ┌──────────────────┐
│ PUEDE VER?             │  │ NO PUEDE VER     │
│                        │  │                  │
│ SELECT requisitions    │  │ Error 403        │
│ WHERE license_id       │  │ Forbidden        │
│ IN (SELECT license_id  │  │                  │
│     FROM users         │  │ (SILENCIOSAMENTE│
│     WHERE id = auth.id │  │  no muestra nada)
│ )                      │  │                  │
│                        │  │ Log en auditoría:│
│ ✅ Retorna datos       │  │ "Intento acceso  │
│                        │  │  no autorizado"  │
└────────────────────────┘  └──────────────────┘

Ejemplo específico:

┌────────────────────────────────────────┐
│ Profesor1 (License_A) intenta ver:    │
│ requisiciones de Profesor2 (License_B)│
└────────────┬─────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ RLS Policy verifica:                   │
│ WHERE license_id = auth.user_license   │
│                                        │
│ Profesor1 licencia: A                  │
│ Requisición licencia: B                │
│ A != B ❌                              │
└────────────┬─────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ REJECTED - retorna 0 rows              │
│ Para Profesor1: []                     │
│ Para Profesor2: [requisitions]         │
│                                        │
│ ✅ SEGURIDAD GARANTIZADA               │
└────────────────────────────────────────┘
```

---

## 📊 Diagrama 7: ESTRUCTURA DATOS - RELACIONES

```
licenses (1)
    ↓ 1:N
    ├──→ users (profesor, jefe_compras, admin)
    │      ↓ 1:N  
    │      ├──→ requisitions (REQ-2026-0001)
    │      │       ↓ 1:N
    │      │       └──→ requisition_items (item A qty 10, item B qty 20)
    │      │              ↓ FK → inventory_items
    │      │
    │      ├──→ purchase_requests (SOL-2026-0001)
    │      │       ↓ 1:N
    │      │       └──→ purchase_request_items
    │      │
    │      └──→ activity_logs (auditoría inmuto)
    │
    ├──→ inventory_items (SKU, nombre, stock)
    │      ↓ 1:N
    │      ├──→ inventory_movements (+/- qty)
    │      │       ← entrada (orden recibida)
    │      │       ← salida (requisición aprobada)
    │      │       ← ajuste (manual override)
    │      │
    │      └──→ inventory categories (Material, Tech, etc)
    │
    ├──→ suppliers (proveedor 1, 2, 3)
    │      ↓ 1:N → purchase_orders (OC-2026-0001)
    │       supplied_by: supplier_id
    │
    ├──→ budgets (Presupuesto 2026)
    │      ↓ 1:N
    │      └──→ cost_centers (Classroom 101, Lab, etc)
    │             ↓ FK ← requisitions.cost_center_id
    │             ↓ FK ← purchase_orders.cost_center_id
    │
    └──→ approvals (triple approval para express orders)
         ↓ N-to-1
         └──→ users (admin, jefe_compras, finanzas)

purchase_orders (1)
    ├──→ purchase_request_id (FK ← purchase_requests)
    ├──→ supplier_id (FK ← suppliers)
    ├──→ 1:N purchase_order_items
    │       item_id (FK → inventory_items)
    │       quantity, unit_price, subtotal
    │
    └──→ approvals (si es express order)
```

---

## 🎯 Diagrama 8: CICLO DIARIO DEL SISTEMA

```
┌──────────────────────────────────────────┐
│ 7:00 AM - SISTEMA INICIA DÍA             │
└──────────────────┬───────────────────────┘
                   │
   ┌───────────────┼───────────────┐
   │               │               │
   ▼               ▼               ▼
┌─────────┐  ┌──────────┐  ┌─────────────┐
│Dashboard│  │ Notif    │  │ Sincroniza- │
│carga    │  │emails    │  │ción BD      │
│con datos│  │ ptepdtes │  │             │
│reales   │  │se envían │  │Recarga stock│
│Stock    │  │(SendGrid)│  │ desde views │
│movtos   │  │          │  │             │
└────┬────┘  └────┬─────┘  └────┬────────┘
     │            │             │
     └────────────┼─────────────┘
                  │
                  ▼
    ┌─────────────────────────────────┐
    │ 7:30 AM - USUARIOS ACCEDEN      │
    │                                 │
    │ Profesores:                      │
    │ → Crean requisiciones            │
    │ → Envían solicitudes de compra   │
    │ → Ven estado en dashboards       │
    │                                 │
    │ Jefe compras:                   │
    │ → Ve notificaciones              │
    │ → Aprueba/rechaza requisiciones  │
    │ → Crea órdenes de compra         │
    │ → Carga cotizaciones             │
    │                                 │
    │ Admin:                           │
    │ → Monitorea KPIs                │
    │ → Resuelve escalaciones          │
    │ → Audita cambios                 │
    └────────────┬────────────────────┘
                 │
                 ▼
    ┌─────────────────────────────────┐
    │ 5:00 PM - PROCESAMIENTO CIERRE  │
    │                                 │
    │ 1. Cron job (cada 5 min):       │
    │    npm run process:notifications│
    │    ├─ SELECT email_notif        │
    │    │  WHERE status = 'pendiente' │
    │    ├─ SendGrid → enviano        │
    │    └─ UPDATE status = 'enviado' │
    │                                 │
    │ 2. Backup BD (diario):           │
    │    SELECT * INTO backup_tables  │
    │                                 │
    │ 3. Reporte diario (opcional):    │
    │    Email a admin con resumen    │
    └────────────┬────────────────────┘
                 │
                 ▼
    ┌─────────────────────────────────┐
    │ 11:00 PM - MANTENIMIENTO        │
    │                                 │
    │ - Limpieza datos temporales      │
    │ - Recalcular métricas cache    │
    │ - Validaciones integridad      │
    │ - Preparar datos mañana         │
    └─────────────────────────────────┘
```

---

## 🔐 Diagrama 9: FLUJO AUTENTICACIÓN

```
┌─────────────────┐
│ Navegador       │
│ http://...      │
│ (SIN login)     │
└────────┬────────┘
         │
         ▼
    ┌──────────────────────┐
    │ LoginPageSimple      │
    │                      │
    │ INPUT: auth_code     │
    │ (ej: ADM001)         │
    │                      │
    │ Click "Ingresar"     │
    └────────┬─────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │ supabaseClient                 │
    │ .authenticateUser(authCode)    │
    │                                │
    │ SQL Query:                     │
    │ SELECT users.*, licenses.*     │
    │ FROM users                     │
    │ JOIN licenses ON license_id    │
    │ WHERE auth_code = UPPER(input) │
    │ AND is_active = true           │
    └────────┬───────────────────────┘
             │
    ┌────────┴──────────────┐
    │                       │
    ▼                       ▼
┌─────────────┐     ┌──────────────┐
│ Encontrado  │     │ NO encontrado│
│             │     │              │
│ userData:   │     │ Error:       │
│ {id, name,  │     │ "Usuario no  │
│  role,      │     │  encontrado" │
│  licenseId, │     │              │
│  ...}       │     │ Intentos: +1 │
└──────┬──────┘     │              │
       │            │ Validar 3    │
       │            │ intentos     │
       │            │ fallidos?    │
       │            │ Bloquear     │
       │            │ 15 min       │
       │            └──────────────┘
       │
       ▼
    ┌─────────────────────────────────┐
    │ UPDATE authStore (Zustand)      │
    │                                 │
    │ setUser({...userData})          │
    │ setLicense({...licenseData})    │
    │ setLoading(false)               │
    └────────┬────────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ INSERT activity_logs         │
    │ {action: 'login',            │
    │  entity_type: 'users',       │
    │  user_id: uid,               │
    │  timestamp: NOW()}           │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Navigate to /dashboard       │
    │                              │
    │ Dashboard auto-carga:        │
    │ - Datos usuario              │
    │ - Dashboards por rol         │
    │ - Requisiciones pending      │
    │ - Órdenes pending            │
    │ - Stock bajo                 │
    └──────────────────────────────┘
```

---

**Conclusión:** Estos diagramas muestran la complejidad y elegancia del flujo del sistema MAO 2026, desde autenticación hasta procesamiento en segundo plano.

