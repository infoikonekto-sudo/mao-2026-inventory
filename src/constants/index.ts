// Colores institucionales
export const COLORS = {
  primary: '#1E40AF',
  primaryLight: '#3B82F6',
  secondary: '#3B82F6',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  grayLight: '#F3F4F6',
  grayLighter: '#E5E7EB',
  grayDark: '#6B7280',
  black: '#000000',
};

// Roles y permisos
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  JEFE_COMPRAS: 'jefe_compras',
  FINANZAS: 'finanzas',
  GERENTE: 'gerente',
  PROFESOR: 'profesor',
  AUDITOR: 'auditor',
  JEFE_PRESUPUESTO: 'jefe_presupuesto',
  JEFE_OPERACIONES: 'jefe_operaciones',
  JEFE_CALIDAD: 'jefe_calidad',
} as const;

export const ROLE_LABELS = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  jefe_compras: 'Jefe de Compras',
  finanzas: 'Finanzas',
  gerente: 'Gerente',
  profesor: 'Profesor',
  auditor: 'Auditor',
  jefe_presupuesto: 'Jefe de Presupuesto',
  jefe_operaciones: 'Jefe de Operaciones',
  jefe_calidad: 'Jefe de Calidad',
} as const;

// Estados de requisiciones
export const REQUISITION_STATUS = {
  PENDIENTE: 'pendiente',
  EN_REVISION: 'en_revision',
  APROBADA: 'aprobada',
  RECHAZADA: 'rechazada',
  ENTREGADA: 'entregada',
  CANCELADA: 'cancelada',
} as const;

export const REQUISITION_STATUS_LABELS = {
  pendiente: 'Pendiente',
  en_revision: 'En Revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
} as const;

// Prioridades de requisiciones
export const REQUISITION_PRIORITY = {
  BAJA: 'baja',
  MEDIA: 'media',
  ALTA: 'alta',
  URGENTE: 'urgente',
} as const;

export const PRIORITY_LABELS = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
} as const;

export const PRIORITY_COLORS = {
  baja: '#10B981',
  media: '#F59E0B',
  alta: '#F97316',
  urgente: '#EF4444',
} as const;

// Estados de compras
export const PURCHASE_REQUEST_STATUS = {
  PENDIENTE: 'pendiente',
  EN_REVISION: 'en_revision',
  APROBADA: 'aprobada',
  RECHAZADA: 'rechazada',
  CONVERTIDA_ORDEN: 'convertida_orden',
} as const;

export const PURCHASE_REQUEST_STATUS_LABELS = {
  pendiente: 'Pendiente',
  en_revision: 'En Revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  convertida_orden: 'Convertida a Orden',
} as const;

// Estados de órdenes de compra
export const PURCHASE_ORDER_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SENT_TO_SUPPLIER: 'sent_to_supplier',
  IN_TRANSIT: 'in_transit',
  RECEIVED: 'received',
  COMPLETED: 'completed',
} as const;

export const PURCHASE_ORDER_STATUS_LABELS = {
  draft: 'Borrador',
  pending_approval: 'En Revisión (Triple)',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  sent_to_supplier: 'Enviada',
  in_transit: 'En Tránsito',
  received: 'Recibida',
  completed: 'Completada / Entregada',
} as const;

// Tipos de movimientos de inventario
export const MOVEMENT_TYPES = {
  ENTRADA: 'entrada',
  SALIDA: 'salida',
  AJUSTE: 'ajuste',
  REQUISICION: 'requisicion',
} as const;

export const MOVEMENT_TYPE_LABELS = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
  requisicion: 'Requisición',
} as const;

// Tipos de notificaciones
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

// Tipos de auditoría
export const AUDIT_TYPES = {
  INVENTARIO: 'inventario',
  COMPRAS: 'compras',
  FINANZAS: 'finanzas',
  GENERAL: 'general',
} as const;

export const AUDIT_TYPE_LABELS = {
  inventario: 'Auditoría de Inventario',
  compras: 'Auditoría de Compras',
  finanzas: 'Auditoría Financiera',
  general: 'Auditoría General',
} as const;

// Formatos monetarios
export const CURRENCY = {
  SYMBOL: 'Q',
  CODE: 'GTQ',
  LOCALE: 'es-GT',
  TAX_RATE: 0.12, // 12% IVA
} as const;

// Límites y configuración
export const APP_CONFIG = {
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
  DEFAULT_PAGE_SIZE: 10,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  NOTIFICATION_TIMEOUT: 3000, // 3 segundos
  SEARCH_DEBOUNCE: 300, // 300ms
} as const;

// Categorías predeterminadas
export const DEFAULT_CATEGORIES = [
  { name: 'Librería', description: 'Materiales de escritura y papelería' },
  { name: 'Mobiliario', description: 'Muebles y equipamiento de aulas' },
  { name: 'Herramientas', description: 'Herramientas manuales y eléctricas' },
  { name: 'Construcción', description: 'Materiales de construcción y mantenimiento' },
  { name: 'Deportes', description: 'Equipamiento deportivo' },
  { name: 'Tecnología', description: 'Equipos de cómputo y electrónicos' },
  { name: 'Limpieza', description: 'Productos y artículos de limpieza' },
  { name: 'Seguridad', description: 'Equipos de seguridad y protección' },
] as const;

// Unidades de medida
export const UNITS_OF_MEASURE = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'caja', label: 'Caja' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'resma', label: 'Resma' },
  { value: 'litro', label: 'Litro' },
  { value: 'galón', label: 'Galón' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'metro', label: 'Metro' },
  { value: 'metro2', label: 'Metro cuadrado' },
  { value: 'docena', label: 'Docena' },
] as const;

// Rutas de la aplicación
export const ROUTES = {
  LOGIN: '/',
  DASHBOARD: '/dashboard',
  INVENTORY: '/inventory',
  REQUISITIONS: '/requisitions',
  PURCHASE_REQUESTS: '/purchase-requests',
  PURCHASE_ORDERS: '/purchase-orders',
  SUPPLIERS: '/suppliers',
  USERS: '/users',
  REPORTS: '/reports',
  AUDIT: '/audit',
  COST_CENTERS: '/cost-centers',
  SETTINGS: '/settings',
  PROFILE: '/profile',
} as const;

// Mensajes de validación
export const VALIDATION_MESSAGES = {
  REQUIRED: 'Este campo es requerido',
  INVALID_EMAIL: 'Correo electrónico inválido',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres',
  PASSWORDS_NOT_MATCH: 'Las contraseñas no coinciden',
  INVALID_AMOUNT: 'El monto debe ser un número válido',
  INVALID_STOCK: 'La cantidad debe ser mayor a 0',
  INVALID_AUTH_CODE: 'Código de autenticación inválido',
  LICENSE_EXPIRED: 'La licencia ha expirado',
  LICENSE_INACTIVE: 'La licencia está inactiva',
  INSUFFICIENT_STOCK: 'Stock insuficiente',
} as const;
