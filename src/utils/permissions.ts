import { User } from '@/types'

// Define permisos por rol
export const rolePermissions = {
  super_admin: {
    label: 'Super Administrador',
    description: 'Acceso total al sistema',
    menuItems: [
      'dashboard',
      'inventory',
      'inventory-import',
      'inventory-movements',
      'requisitions',
      'purchase-requests',
      'purchase-orders',
      'express-orders',
      'budgets',
      'suppliers',
      'users',
      'reports',
      'audit',
      'ventanilla',
      'verify-connections',
      'settings',
      'profile',
    ],
  },
  admin: {
    label: 'Administrador',
    description: 'Gestión completa del sistema',
    menuItems: [
      'dashboard',
      'inventory',
      'inventory-import',
      'inventory-movements',
      'requisitions',
      'purchase-requests',
      'purchase-orders',
      'express-orders',
      'budgets',
      'suppliers',
      'users',
      'reports',
      'audit',
      'ventanilla',
      'verify-connections',
      'profile',
    ],
  },
  jefe_compras: {
    label: 'Jefe de Compras',
    description: 'Gestiona requisiciones y órdenes de compra',
    menuItems: [
      'dashboard',
      'inventory',
      'inventory-import',
      'inventory-movements',
      'requisitions',
      'purchase-requests',
      'purchase-orders',
      'express-orders',
      'suppliers',
      'reports',
      'ventanilla',
      'profile',
    ],
  },
  finanzas: {
    label: 'Finanzas',
    description: 'Control de requisiciones y análisis de gastos',
    menuItems: [
      'dashboard',
      'requisitions',
      'purchase-orders',
      'reports',
      'profile',
    ],
  },
  gerente: {
    label: 'Gerente',
    description: 'Acceso a reportes ejecutivos',
    menuItems: [
      'dashboard',
      'reports',
      'profile',
    ],
  },
  profesor: {
    label: 'Profesor',
    description: 'Acceso básico al sistema',
    menuItems: [
      'dashboard',
      'requisitions',
      'purchase-requests',
      'profile',
    ],
  },
  auditor: {
    label: 'Auditor',
    description: 'Solo lectura con acceso a auditoría',
    menuItems: [
      'dashboard',
      'inventory',
      'inventory-movements',
      'requisitions',
      'purchase-orders',
      'reports',
      'audit',
      'profile',
    ],
  },
  jefe_presupuesto: {
    label: 'Jefe de Presupuesto',
    description: 'Aprobación y control presupuestario total',
    menuItems: [
      'dashboard',
      'purchase-orders',
      'express-orders',
      'budgets',
      'cost-centers',
      'audit',
      'reports',
      'profile',
    ],
  },
  jefe_operaciones: {
    label: 'Jefe de Operaciones',
    description: 'Aprobación operativa',
    menuItems: [
      'dashboard',
      'purchase-orders',
      'express-orders',
      'inventory',
      'profile',
    ],
  },
  jefe_calidad: {
    label: 'Jefe de Calidad',
    description: 'Aprobación de calidad',
    menuItems: [
      'dashboard',
      'purchase-orders',
      'express-orders',
      'suppliers',
      'profile',
    ],
  },
}

// Mapeo de route → item
const routeToItem: Record<string, string> = {
  '/dashboard/': 'dashboard',
  '/dashboard': 'dashboard',
  '/dashboard/inventory': 'inventory',
  '/dashboard/inventory-import': 'inventory-import',
  '/dashboard/inventory-movements': 'inventory-movements',
  '/dashboard/requisitions': 'requisitions',
  '/dashboard/purchase-requests': 'purchase-requests',
  '/dashboard/purchase-orders': 'purchase-orders',
  '/dashboard/express-orders': 'express-orders',
  '/dashboard/budgets': 'budgets',
  '/dashboard/cost-centers': 'cost-centers',
  '/dashboard/suppliers': 'suppliers',
  '/dashboard/users': 'users',
  '/dashboard/reports': 'reports',
  '/dashboard/audit': 'audit',
  '/dashboard/ventanilla': 'ventanilla',
  '/dashboard/settings': 'settings',
  '/dashboard/profile': 'profile',
}

export function canAccessRoute(user: User, route: string): boolean {
  // Exact match first
  let item = routeToItem[route]

  // If no exact match, try prefix match (e.g., /dashboard/express-orders/new → express-orders)
  if (!item) {
    const sortedRoutes = Object.keys(routeToItem).sort((a, b) => b.length - a.length)
    for (const r of sortedRoutes) {
      if (route.startsWith(r + '/') || route.startsWith(r + '?')) {
        item = routeToItem[r]
        break
      }
    }
  }

  if (!item) return false

  // Priority: Custom Permissions > Role Permissions
  if (user.custom_permissions && user.custom_permissions.length > 0) {
    return user.custom_permissions.includes(item)
  }

  const permissions = rolePermissions[user.role]
  if (!permissions) return false

  return permissions.menuItems.includes(item)
}

export function getMenuItemsForRole(user: User) {
  if (user.custom_permissions && user.custom_permissions.length > 0) {
    return user.custom_permissions
  }
  const permissions = rolePermissions[user.role]
  return permissions?.menuItems || []
}

export function getRoleLabel(role: User['role']): string {
  return rolePermissions[role]?.label || role
}
