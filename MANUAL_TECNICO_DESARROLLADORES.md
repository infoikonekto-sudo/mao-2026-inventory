# 👨‍💻 MANUAL TÉCNICO - REFERENCIA PARA DESARROLLADORES

## 🚀 GUÍA RÁPIDA PARA EMPEZAR

### Pre-requisitos
```bash
# Instalar Node.js 18+
node --version    #→ debe ser v18.x o superior

# Clonar proyecto
git clone <repo>

# Instalar dependencias
npm install

# Crear archivo .env con credenciales Supabase
# (Pedir a admin)
cp .env.example .env

# Verificar conexión
npm run type-check    # TypeScript validation
npm run lint         # Code linting
```

### Iniciar desarrollo
```bash
npm run dev
# Abre http://localhost:5173

# En otra terminal (opcional, para emails):
npm run process:notifications
```

---

## 📁 ESTRUCTURA DE CARPETAS - DETALLES

### `src/pages/` - TODAS LAS PÁGINAS
```
pages/
├── dashboards/                    ← Dashboards específicos por rol
│   ├── AdminDashboard.tsx         (Admin general)
│   ├── ProfessorDashboard.tsx     (Profesor personal)
│   └── ChiefsDashboard.tsx        (Jefes de área)
│
├── auth/                          ← Autenticación
│   └── LoginPageSimple.tsx        (Login por código)
│
├── RequisitionsPage.tsx           ← CRUD requisiciones
├── PurchaseRequestsPage.tsx       ← CRUD solicitudes compra
├── PurchaseOrdersPage.tsx         ← CRUD órdenes compra
├── InventoryPage.tsx              ← Gestión inventario
├── InventoryImportPage.tsx        ← Importar CSV/Excel
├── InventoryMovementsPage.tsx     ← Ver historial movimientos
├── SuppliersPage.tsx              ← Gestión proveedores
├── BudgetsPage.tsx                ← Gestión presupuestos
├── CostCentersPage.tsx            ← Centros de costo
├── UsersManagementPage.tsx        ← Admin usuarios
├── ExpressOrdersPage.tsx          ← Órdenes express
├── CreateExpressOrderPage.tsx      ← Crear orden express
├── ExpressOrderDetailPage.tsx      ← Detalle orden express
├── WindowDeliveryPage.tsx         ← Ventanas despacho
├── AuditPage.tsx                  ← Log auditoría
├── ProfessionalReportsPage.tsx    ← Reportes avanzados
├── EmailNotificationsPanel.tsx    ← Admin notificaciones
├── ProfilePage.tsx                ← Perfil usuario
├── SettingsPage.tsx               ← Configuración
├── TestUsersPage.tsx              ← Dev testing
├── AccessDeniedPage.tsx           ← Acceso denegado
└── DiagnosticsPage.tsx            ← Diagnósticos sistema
```

### `src/components/` - COMPONENTES REUTILIZABLES
```
components/
├── layouts/
│   └── DashboardLayout.tsx        ← Layout principal
│
├── navigation/
│   ├── Sidebar.tsx                ← Menú lateral
│   ├── TopBar.tsx                 ← Barra superior
│   └── NotificationBell.tsx       ← Campanita notificaciones
│
├── ui/                            ← Componentes UI base
│   ├── Button.tsx
│   ├── Modal.tsx
│   ├── Table.tsx
│   ├── Card.tsx
│   ├── Form.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   └── ... (más componentes básicos)
│
├── biometrics/                    ← Componentes biometría
│   └── BiometricCapture.tsx
│
├── features/                      ← Componentes específicos features
│   ├── RequisitionForm.tsx
│   ├── OrderApprovalCard.tsx
│   ├── QuotationComparison.tsx
│   └── ... (específicos de features)
│
├── NotificationBell.tsx           ← Campana notificaciones
├── PageHeader.tsx                 ← Header de página
└── ProtectedRoute.tsx             ← Wrapper para rutas protegidas
```

### `src/services/` - LÓGICA DE BACKEND
```
services/
└── supabaseClient.ts              ← ARCHIVO SÚPER IMPORTANTE
   
   CONTIENE TODAS las funciones:
   
   // AUTENTICACIÓN (5 funciones)
   - authenticateUser(code)
   - resetUserPassword()
   - etc
   
   // INVENTARIO (20+ funciones)
   - getInventory(licenseId)
   - createInventoryItem()
   - updateInventoryStock()
   - importInventoryFromCSV()
   - getInventoryMovements()
   - etc
   
   // REQUISICIONES (15+ funciones)
   - getRequisitions(licenseId, userId?)
   - createRequisitionWithItems()
   - updateRequisitionStatus()
   - approveRequisition()
   - rejectRequisition()
   - dispatchRequisition()
   - uploadDeliverySignature()
   - etc
   
   // ÓRDENES DE COMPRA (20+ funciones)
   - getPurchaseOrders()
   - createPurchaseOrderFromRequest()
   - updatePurchaseOrderStatus()
   - approveOrder()
   - rejectOrder()
   - uploadQuotationFile()
   - uploadInvoiceFile()
   - confirmOrderDelivery()
   - etc
   
   // SOLICITUDES (10+ funciones)
   - getPurchaseRequests()
   - createPurchaseRequest()
   - updatePurchaseRequestStatus()
   - etc
   
   // NOTIFICACIONES (5+ funciones)
   - sendEmailNotification()
   - getNotifications()
   - markAsRead()
   - etc
   
   // AUDITORÍA (3+ funciones)
   - getActivityLogs()
   - getAuditReport()
   - etc
   
   // PRESUPUESTOS (5+ funciones)
   - getBudgets()
   - updateBudget()
   - getCostCenters()
   - etc
```

### `src/hooks/` - CUSTOM HOOKS
```
hooks/
├── useRealtimeData.ts             ← Hook genérico realtime
│   .from(table)
│   .on('*', (payload) => ...)
│   .subscribe()
│
├── useRequisitionRealtime.ts      ← Escucha requisiciones
├── usePurchaseRequestRealtime.ts  ← Escucha solicitudes
├── useNotifications.ts            ← Toast notifications
├── useDebounce.ts                 ← Debounce búsquedas
├── useLocalStorage.ts             ← Persistencia
└── index.ts                       ← Exports
```

### `src/types/` - TIPOS TYPESCRIPT
```
types/
└── index.ts
   
   CONTIENE:
   - User interface (user info)
   - License interface
   - Requisition interface
   - RequisitionItem interface
   - PurchaseRequest interface
   - PurchaseOrder interface
   - Supplier interface
   - Budget interface
   - CostCenter interface
   - ActivityLog interface
   - InventoryItem interface
   - InventoryMovement interface
   - Notification interface
   - AuditReport interface
   - ... y más tipos
```

### `src/utils/` - FUNCIONES UTILITARIAS
```
utils/
├── supabaseClient.ts              ← Cliente Supabase config
├── exportUtils.ts                 ← Exportar a CSV
│   - exportRequisitionsToCSV()
│   - exportPurchaseOrdersToCSV()
│   - exportInventoryToCSV()
│
├── pdfGenerator.ts                ← Generar PDFs
│   - generateRequisitionPDF()
│   - generatePurchaseOrderPDF()
│   - generateInventoryPDF()
│
├── formatting.ts                  ← Formato datos
│   - formatCurrency(amount)
│   - formatDate(date)
│   - formatStatus(status)
│
├── permissions.ts                 ← Lógica permisos
│   - canUserApproveRequisition()
│   - canUserManageUsers()
│   - canUserViewAudit()
│
├── roleActions.ts                 ← Acciones por rol
│   - canUserCreateRequisition()
│   - canUserApproveOrder()
│   - getRoleLabel(role)
│
├── validations.ts                 ← Validaciones Zod
│   - requisitionSchema
│   - purchaseOrderSchema
│   - inventoryItemSchema
│
└── index.ts                       ← Exports
```

### `src/stores/` - ESTADO GLOBAL
```
stores/
└── authStore.ts                   ← Zustand store
   
   Contiene:
   - user: User | null
   - license: License | null
   - isLoading: boolean
   - error: string | null
   
   Métodos:
   - setUser()
   - setLicense()
   - setLoading()
   - setError()
   - logout()
```

---

## 🔧 CÓMO AGREGAR UNA FEATURE NUEVA

### Ejemplo: Crear nueva página "Categorías de Inventario"

#### PASO 1: Crear tipo TypeScript
**Archivo:** `src/types/index.ts`
```typescript
// Agregar nueva interfaz
export interface InventoryCategory {
  id: string;
  license_id: string;
  name: string;
  description?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

#### PASO 2: Crear funciones en supabaseClient.ts
**Archivo:** `src/services/supabaseClient.ts`
```typescript
// Añadir funciones de CRUD
export async function getInventoryCategories(licenseId: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_categories')
      .select('*')
      .eq('license_id', licenseId)
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching categories:', error)
    throw error
  }
}

export async function createInventoryCategory(licenseId: string, name: string, description?: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_categories')
      .insert([{
        license_id: licenseId,
        name,
        description,
        is_active: true
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating category:', error)
    throw error
  }
}

export async function updateInventoryCategory(categoryId: string, updates: Partial<InventoryCategory>) {
  try {
    const { data, error } = await supabase
      .from('inventory_categories')
      .update(updates)
      .eq('id', categoryId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating category:', error)
    throw error
  }
}

export async function deleteInventoryCategory(categoryId: string) {
  try {
    const { error } = await supabase
      .from('inventory_categories')
      .update({ is_active: false })  // Soft delete
      .eq('id', categoryId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting category:', error)
    throw error
  }
}
```

#### PASO 3: Crear página React
**Archivo:** `src/pages/CategoriesPage.tsx`
```tsx
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import {
  getInventoryCategories,
  createInventoryCategory,
  updateInventoryCategory,
  deleteInventoryCategory
} from '@/services/supabaseClient'
import toast from 'react-hot-toast'

export default function CategoriesPage() {
  const { license } = useAuthStore()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    loadCategories()
  }, [license?.id])

  const loadCategories = async () => {
    if (!license?.id) return
    try {
      setLoading(true)
      const data = await getInventoryCategories(license.id)
      setCategories(data || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error cargando categorías')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    try {
      if (editingId) {
        await updateInventoryCategory(editingId, formData)
        toast.success('Categoría actualizada')
      } else {
        await createInventoryCategory(license!.id, formData.name, formData.description)
        toast.success('Categoría creada')
      }
      setFormData({ name: '', description: '' })
      setEditingId(null)
      setShowForm(false)
      await loadCategories()
    } catch (error) {
      toast.error('Error guardando categoría')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta categoría?')) return
    try {
      await deleteInventoryCategory(id)
      toast.success('Categoría eliminada')
      await loadCategories()
    } catch (error) {
      toast.error('Error eliminando categoría')
    }
  }

  const filtered = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <div>Cargando...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Categorías de Inventario</h1>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }}>
          <Plus size={20} /> Nueva Categoría
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
          <input
            type="text"
            placeholder="Nombre categoría"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />
          <textarea
            placeholder="Descripción (opcional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />
          <div className="flex gap-2">
            <Button type="submit">{editingId ? 'Actualizar' : 'Crear'}</Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {/* Búsqueda */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg"
        />
      </div>

      {/* Tabla */}
      <table className="w-full bg-white shadow rounded-lg">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3 text-left">Nombre</th>
            <th className="px-6 py-3 text-left">Descripción</th>
            <th className="px-6 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(cat => (
            <tr key={cat.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-3">{cat.name}</td>
              <td className="px-6 py-3">{cat.description || '-'}</td>
              <td className="px-6 py-3 text-right flex gap-2 justify-end">
                <button onClick={() => {
                  setFormData(cat)
                  setEditingId(cat.id)
                  setShowForm(true)
                }}>
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(cat.id)}>
                  <Trash2 size={18} className="text-red-500" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          No hay categorías
        </div>
      )}
    </div>
  )
}
```

#### PASO 4: Agregar ruta en DashboardLayout
**Archivo:** `src/components/layouts/DashboardLayout.tsx`
```tsx
import CategoriesPage from '@/pages/CategoriesPage'  // ← Nuevo import

// En el <Routes>:
<Route
  path="/categories"
  element={
    <ProtectedRoute user={user} route="/dashboard/categories" pageName="Categorías">
      <CategoriesPage />
    </ProtectedRoute>
  }
/>
```

#### PASO 5: Agregar a Sidebar
**Archivo:** `src/components/navigation/Sidebar.tsx`
```tsx
// En el menú items:
{
  icon: Tags,  // Importar icon de lucide-react
  label: 'Categorías',
  href: '/dashboard/categories',
  roles: ['admin', 'jefe_compras']  // Quién puede verlo
}
```

#### PASO 6: Migración SQL (opcional)
Si la tabla no existe:
```sql
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_categories_license ON inventory_categories(license_id);

ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage categories"
ON inventory_categories FOR ALL
USING (license_id IN (SELECT license_id FROM users WHERE id = auth.uid()));
```

---

## ⚡ PATRONES COMUNES

### Patrón 1: Cargar datos + mostrar en tabla + filtro

```tsx
const [items, setItems] = useState<any[]>([])
const [loading, setLoading] = useState(true)
const [searchTerm, setSearchTerm] = useState('')

useEffect(() => {
  loadItems()
}, [licenseId])

const loadItems = async () => {
  try {
    setLoading(true)
    const data = await supabaseClient.getItems(licenseId)
    setItems(data || [])
  } catch (error) {
    console.error('Error:', error)
    toast.error('Error cargando items')
  } finally {
    setLoading(false)
  }
}

const filtered = items.filter(item =>
  item.name.toLowerCase().includes(searchTerm.toLowerCase())
)

if (loading) return <div>Cargando...</div>

return (
  <>
    <input
      type="text"
      placeholder="Buscar..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
    <table>
      <tbody>
        {filtered.map(item => (
          <tr key={item.id}>
            <td>{item.name}</td>
            {/* más campos */}
          </tr>
        ))}
      </tbody>
    </table>
  </>
)
```

### Patrón 2: Formulario create + update

```tsx
const [formData, setFormData] = useState(initialState)
const [editingId, setEditingId] = useState<string | null>(null)
const [submitting, setSubmitting] = useState(false)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  try {
    setSubmitting(true)
    
    if (editingId) {
      await supabaseClient.update(editingId, formData)
      toast.success('Actualizado')
    } else {
      await supabaseClient.create(licenseId, formData)
      toast.success('Creado')
    }
    
    setFormData(initialState)
    setEditingId(null)
    await loadItems()  // Recargar lista
  } catch (error) {
    toast.error(`Error: ${error.message}`)
  } finally {
    setSubmitting(false)
  }
}

return (
  <form onSubmit={handleSubmit}>
    <input
      type="text"
      value={formData.name}
      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      disabled={submitting}
    />
    <button type="submit" disabled={submitting}>
      {submitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
    </button>
  </form>
)
```

### Patrón 3: Suscripción realtime

```tsx
import { useRealtimeData } from '@/hooks/useRealtimeData'

const handleItemUpdate = useCallback((itemId: string, updatedFields: any) => {
  setItems(prev =>
    prev.map(item =>
      item.id === itemId ? { ...item, ...updatedFields } : item
    )
  )
}, [])

useRealtimeData('tableName', { license_id: licenseId }, (payload) => {
  if (payload.eventType === 'INSERT') {
    setItems(prev => [...prev, payload.new])
  } else if (payload.eventType === 'UPDATE') {
    handleItemUpdate(payload.new.id, payload.new)
  } else if (payload.eventType === 'DELETE') {
    setItems(prev => prev.filter(item => item.id !== payload.old.id))
  }
})
```

### Patrón 4: Validación con Zod

```tsx
import { z } from 'zod'

const itemSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100),
  quantity: z.number().int().positive('Cantidad debe ser > 0'),
  email: z.string().email('Email válido requerido'),
})

type ItemForm = z.infer<typeof itemSchema>

// En formulario:
const validateForm = () => {
  try {
    itemSchema.parse(formData)
    return true
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        toast.error(`${err.path.join('.')}: ${err.message}`)
      })
    }
    return false
  }
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!validateForm()) return
  // ... rest of submit logic
}
```

---

## 🔒 SEGURIDAD - CHECKLIST PARA NUEVAS FEATURES

Cuando agregas una feature nueva, verifica:

```
□ AUTENTICACIÓN
  □ ¿Usuario debe estar logueado? (ProtectedRoute)
  □ ¿Se valida user.role?
  
□ AUTORIZACIÓN  
  □ ¿Solo ciertos roles pueden acceder? (permissions.ts)
  □ ¿Se valida license_id en queries?
  
□ VALIDACIÓN
  □ ¿Frontend valida con Zod?
  □ ¿Backend checkea datos nuevamente?
  □ ¿Se limpia input (SQLi, XSS)?
  
□ AUDITORÍA
  □ ¿Se registra en activity_logs?
  □ ¿se incluye user_id, timestamp, cambios?
  
□ NOTIFICACIONES
  □ ¿Debe notificar a alguien?
  □ ¿Email? ¿Toast? ¿Bell?
  
□ RLS (Row Level Security)
  □ ¿Tabla tiene RLS enabled?
  □ ¿Policies correctas?
  □ ¿Usuario solo ve su data?
  
□ ERROR HANDLING
  □ ¿Try-catch en queries?
  □ ¿Mensajes de error amigables?
  □ ¿Logging en consola para debug?
```

---

## 📊 ESTRUCTURA TIPO EN SUPABASECLIENT

```typescript
// 1. Función GET
export async function getItems(licenseId: string) {
  try {
    const { data, error } = await supabase
      .from('tableName')
      .select('*')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching items:', error)
    throw error
  }
}

// 2. Función CREATE
export async function createItem(licenseId: string, itemData: any) {
  try {
    const { data, error } = await supabase
      .from('tableName')
      .insert([{ ...itemData, license_id: licenseId }])
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating item:', error)
    throw error
  }
}

// 3. Función UPDATE
export async function updateItem(itemId: string, updates: any) {
  try {
    const { data, error } = await supabase
      .from('tableName')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating item:', error)
    throw error
  }
}

// 4. Función DELETE (soft delete recomendado)
export async function deleteItem(itemId: string) {
  try {
    const { error } = await supabase
      .from('tableName')
      .update({ is_active: false })  // ← soft delete
      .eq('id', itemId)
    
    if (error) throw error
  } catch (error) {
    console.error('Error deleting item:', error)
    throw error
  }
}

// 5. Realtime subscription
export async function subscribeToItems(
  licenseId: string,
  callback: (payload: any) => void
) {
  try {
    return supabase
      .from('tableName')
      .on('*', payload => callback(payload))
      .eq('license_id', licenseId)
      .subscribe()
  } catch (error) {
    console.error('Error subscribing:', error)
    throw error
  }
}
```

---

## 🚨 ERRORES COMUNES Y CÓMO EVITARLOS

### Error 1: Olvidar license_id
```javascript
// ❌ MALO - datos de otra institución
const { data } = await supabase
  .from('requisitions')
  .select('*')

// ✅ BIEN - solo esta institución
const { data } = await supabase
  .from('requisitions')
  .select('*')
  .eq('license_id', licenseId)
```

### Error 2: No validar user.role
```javascript
// ❌ MALO - cualquiera puede entrar
<Route path="/admin" element={<AdminPage />} />

// ✅ BIEN - solo admin
<Route
  path="/admin"
  element={
    <ProtectedRoute
      user={user}
      allowedRoles={['admin', 'super_admin']}
    >
      <AdminPage />
    </ProtectedRoute>
  }
/>
```

### Error 3: No registrar en activity_logs
```javascript
// ❌ MALO - sin auditoría
await supabase.from('requisitions').update({ status: 'aprobada' }).eq('id', id)

// ✅ BIEN - con auditoría
await supabase.from('requisitions').update({ status: 'aprobada' }).eq('id', id)
await supabase.from('activity_logs').insert({
  user_id: userId,
  action: 'update',
  entity_type: 'requisitions',
  entity_id: id,
  changes: { status: { from: 'pendiente', to: 'aprobada' } }
})
```

### Error 4: No manejar errores
```javascript
// ❌ MALO
const data = await supabaseClient.getItems(licenseId)
setItems(data)

// ✅ BIEN
try {
  const data = await supabaseClient.getItems(licenseId)
  setItems(data || [])
} catch (error) {
  console.error('Error:', error)
  toast.error('No se pudieron cargar los items')
  setItems([])
}
```

### Error 5: state UI desincronizado
```javascript
// ❌ MALO - UI no actualiza si realtime devuelve datos
const data = await supabaseClient.getItems()
setItems(data)
// Pero si alguien actualiza desde otra pestaña, no se ve aquí

// ✅ BIEN - subscribirse a cambios
useRequisitionRealtime(licenseId, (id, fields) => {
  setRequisitions(prev =>
    prev.map(r => r.id === id ? { ...r, ...fields } : r)
  )
})
```

---

## 🛠️ HERRAMIENTAS Y COMANDOS ÚTILES

### Desarrollo
```bash
npm run dev              # Iniciar dev server
npm run type-check      # TypeScript sin erro
npm run lint            # ESLint check
npm run build           # Build para producción
npm run preview         # Preview de build
```

### Testing
```bash
# Actualmente no hay, pero podrían agregarse:
npm run test            # Unit tests (Jest)
npm run test:e2e        # End-to-end tests (Cypress)
```

### Base de Datos
```bash
# Via Supabase CLI (si está instalado)
supabase local start    # Supabase local
supabase db pull        # Descargar schema actual
supabase db push        # Aplicar migraciones locales
```

### Debugging
```bash
# En navegador: F12 → Console
// Loguear todas las queries
console.log('supabaseClient called:', { fn, params })

// Ver estado React DevTools
// Ver Network requests (ver requests a Supabase)
// Ver Storage en DevTools → Application
```

---

## 📚 REFERENCIAS Y DOCUMENTACIÓN

### Supabase
- Docs: https://supabase.com/docs
- RLS: https://supabase.com/docs/guides/auth/row-level-security
- Realtime: https://supabase.com/docs/guides/realtime

### React
- Docs: https://react.dev
- Hooks: https://react.dev/reference/react

### TypeScript
- Handbook: https://www.typescriptlang.org/docs/

### Tailwind CSS
- Docs: https://tailwindcss.com
- Components: https://ui.shadcn.com/

### Zod
- Docs: https://zod.dev

---

## 🎯 PRÓXIMOS PASOS PARA APRENDER

1. **Entiende supabaseClient.ts** (todo lo importante está ahí)
2. **Crea una feature simple** siguiendo el patrón anterior
3. **Lee una página compleja** (PurchaseOrdersPage es buen ejemplo)
4. **Lee los tipos** (types/index.ts)
5. **Juega con Supabase UI** (app.supabase.com)

---

**¡Listo para codear! 🚀**

