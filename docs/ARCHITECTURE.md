# Documentación del Proyecto MAO 2026

## Tabla de Contenidos
1. [Arquitectura General](#arquitectura-general)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Flujos Principales](#flujos-principales)
4. [Base de Datos](#base-de-datos)
5. [Autenticación y Seguridad](#autenticación-y-seguridad)
6. [Guía de Desarrollo](#guía-de-desarrollo)

## Arquitectura General

### Stack Tecnológico
- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **Form Management**: React Hook Form + Zod
- **Charts**: Recharts
- **Tables**: TanStack Table

### Patrones Arquitectónicos
- **Component-Based**: Componentes reutilizables y modularizados
- **Hooks Pattern**: Custom hooks para lógica compartida
- **Store Pattern**: Estado global con Zustand
- **Repository Pattern**: Abstracción de llamadas a BD

## Estructura del Proyecto

```
src/
├── components/           # Componentes React
│   ├── layouts/         # Layouts principales
│   ├── navigation/      # Componentes de navegación
│   ├── ui/             # Componentes UI reutilizables
│   └── features/       # Componentes específicos de funcionalidades
├── pages/              # Páginas/Vistas
│   ├── auth/          # Páginas de autenticación
│   └── dashboards/    # Dashboards por rol
├── hooks/             # Custom hooks
├── stores/            # Estado global (Zustand)
├── types/             # Tipos TypeScript (Domain Model)
├── utils/             # Funciones utilitarias
├── constants/         # Constantes de la aplicación
└── index.css          # Estilos globales
```

## Flujos Principales

### 1. Flujo de Requisición

```
Profesor
   ↓
[Crear Requisición] → Sistema genera REQ-YYYY-0001
   ↓
[Notificación] → Jefe de Compras recibe alerta
   ↓
Jefe de Compras revisa
   ├─→ [Aprobada] → Registra salida de inventario → Actualiza stock
   ├─→ [Rechazada] → Profesor ve motivo
   └─→ [En Espera] → Solicita más información
   ↓
Jefe marca como entregada
   ↓
[Log de Auditoría] → Se registra la actividad
   ↓
[Actualización en Tiempo Real] → Todos los dashboards se sincronizan
```

### 2. Flujo de Solicitud de Compra

```
Profesor/Usuario
   ↓
[Crear Solicitud] → Sistema genera SOL-YYYY-0001
   ↓
[Notificación] → Gerente recibe alerta
   ↓
Gerente revisa y decide
   ├─→ [Aprobada] → Notificación a Jefe de Compras
   └─→ [Rechazada] → Usuario ve motivo
   ↓
Jefe de Compras recibe notificación
   ↓
[Crear Orden de Compra] → Sistema genera OC-YYYY-0001
   ↓
[Solicitar Cotizaciones] → Envía a proveedores
   ↓
[Subir Cotizaciones] → Jefe carga cotizaciones
   ↓
[Notificación] → Gerente para seleccionar
   ↓
Gerente compara cotizaciones (tabla comparativa)
   ↓
[Selecciona y Aprueba] → Orden aprobada
   ↓
Estado: "En Proceso" + Notificación a todos
   ↓
[Al Recibir Productos] → Jefe actualiza inventario
   ↓
Estado Final: "Completada"
```

## Base de Datos

### Tablas Principales

#### `licenses`
Gestión de licencias por institución
- `school_code` (unique): Código del colegio
- `license_key`: Hash criptográfico
- `expiration_date`: Fecha de vencimiento
- `max_users`: Límite de usuarios

#### `users`
Usuarios del sistema
- `auth_code`: Código único de autenticación
- `role`: Super admin, admin, jefe_compras, etc.
- `license_id`: Relación con licencia

#### `inventory_items`
Items del inventario
- `item_code` (unique): Código interno
- `current_stock`: Stock disponible
- `minimum_stock`: Nivel para alertas
- `category_id`: Categoría del item

#### `requisitions` & `requisition_items`
Sistema de requisiciones
- `requisition_number` (unique): REQ-YYYY-0001
- `status`: pendiente, en_revision, aprobada, rechazada, entregada, cancelada
- `priority`: baja, media, alta, urgente

#### `purchase_requests` & `purchase_request_items`
Sistema de solicitudes de compra
- `request_number` (unique): SOL-YYYY-0001
- `status`: pendiente, en_revision, aprobada, rechazada, convertida_orden

#### `purchase_orders` & `purchase_order_items`
Sistema de órdenes de compra
- `order_number` (unique): OC-YYYY-0001
- `status`: borrador, cotizacion, aprobada, en_proceso, recibida, cancelada

### Row Level Security (RLS)

Todas las tablas implementan RLS policies:

```sql
-- Usuarios ven solo datos de su licencia
SELECT * FROM table WHERE license_id = auth.uid()

-- Profesores ven solo sus registros
SELECT * FROM requisitions WHERE requested_by = auth.uid()

-- Super Admin ve todo
SELECT * FROM table -- sin restricciones
```

## Autenticación y Seguridad

### Flujo de Autenticación

1. **Login**: Usuario ingresa su código de autenticación
2. **Validación de Licencia**: 
   - ¿Licencia existe?
   - ¿Está activa?
   - ¿No ha vencido?
3. **Validación de Usuario**:
   - ¿Usuario existe?
   - ¿Es activo?
   - ¿Está dentro del límite de usuarios?
4. **Creación de Sesión**: JWT token con expiración

### Seguridad

- ✅ Encriptación de license keys con SHA-256
- ✅ Auth codes únicos y criptográficamente seguros
- ✅ Passwords hasheados con bcrypt
- ✅ Rate limiting en intentos de login
- ✅ HTTPS obligatorio en producción
- ✅ Session timeout automático (30 min)
- ✅ CSRF protection
- ✅ XSS prevention via sanitización

## Guía de Desarrollo

### Agregando una Nueva Página

1. Crear componente en `src/pages/`
2. Importar en router (App.tsx)
3. Agregar ruta en ROUTES constant
4. Agregar link en Sidebar

### Agregando un Nuevo Componente UI

1. Crear en `src/components/ui/`
2. Exportar desde `src/components/ui/index.ts`
3. Usar en componentes: `import { Button } from '@/components/ui'`

### Agregando un Custom Hook

1. Crear en `src/hooks/`
2. Exportar desde `src/hooks/index.ts`
3. Usar en componentes: `import { useMyHook } from '@/hooks'`

### Agregando una Validación

1. Crear schema en `src/utils/validations.ts`
2. Usar con `zodResolver` en React Hook Form
3. Ejemplo:
```tsx
const { register, formState: { errors } } = useForm({
  resolver: zodResolver(mySchema)
})
```

### Conectando con Supabase

1. Crear función en `src/utils/supabase.ts`
2. Usar en componentes o custom hooks
3. Actualizar store si es estado global
4. Ejemplo:
```tsx
const { data, error } = await supabase
  .from('items')
  .select()
  .eq('license_id', licenseId)
```

### Agregando Gráficos

1. Importar componentes de Recharts
2. Preparar datos en formato esperado
3. Configurar colores según constants
4. Añadir tooltips e interactividad
5. Ejemplo:
```tsx
<BarChart data={data}>
  <Bar dataKey="value" fill={COLORS.primary} />
</BarChart>
```

## Convenciones de Código

### Nombres de Variables
- `userId` (camelCase)
- `ROLE_LABELS` (UPPER_SNAKE_CASE para constantes)
- `isLoading` (boolean prefixes: is, has, can, should)

### Nombres de Funciones
- `handleClick` (event handlers)
- `formatCurrency` (utility functions)
- `useCustomHook` (custom hooks)

### Nombres de Componentes
- `UserProfile` (PascalCase)
- `export default function ComponentName() {}`

### Imports
```tsx
// React y librerías externas primero
import { useState } from 'react'
import { useForm } from 'react-hook-form'

// Path aliases
import { User } from '@/types'
import { Button } from '@/components/ui'
import { USER_ROLES } from '@/constants'

// Separador en blanco

// Componentes locales
import Sidebar from './Sidebar'
```

## Performance Tips

1. **Memoización**: Usar `useMemo` para cálculos costosos
2. **Lazy Loading**: Usar `React.lazy()` para páginas
3. **Image Optimization**: Usar formatos webp
4. **Bundle Analysis**: Revisar tamaño de bundle con `npm run build`
5. **Debouncing**: Usar para búsquedas y filtros
6. **Virtualization**: Usar para listas largas

## Deployment

### Vercel
```bash
npm run build
# Vercel automáticamente detecta Next.js/Vite
```

### Manual
```bash
npm run build
# Subir contenido de `dist/` a servidor web
```

## Troubleshooting

### Port 5173 ya está en uso
```bash
npm run dev -- --port 3000
```

### Problemas de CORS
- Verificar variable de entorno VITE_SUPABASE_URL
- Revisar políticas CORS en Supabase

### Componentes no se importan
- Verificar ruta en tsconfig.json
- Revisar export en archivo destino

---

**Última actualización**: 27 de enero de 2026
