// Lógica de roles y permisos para crear registros

export const rolePermissionsForActions = {
  super_admin: {
    canCreateRequisition: true,
    canCreatePurchaseRequest: true,
    canCreatePurchaseOrder: true,
    canApproveRequisition: true,
    canApprovePurchaseRequest: true,
    canApprovePurchaseOrder: true,
    canManageInventory: true,
    canViewAllRecords: true,
  },
  admin: {
    canCreateRequisition: true,
    canCreatePurchaseRequest: true,
    canCreatePurchaseOrder: true,
    canApproveRequisition: true,
    canApprovePurchaseRequest: true,
    canApprovePurchaseOrder: true,
    canManageInventory: true,
    canViewAllRecords: true,
  },
  jefe_compras: {
    canCreateRequisition: false,
    canCreatePurchaseRequest: false,
    canCreatePurchaseOrder: true,
    canApproveRequisition: true,
    canApprovePurchaseRequest: true,
    canApprovePurchaseOrder: false,
    canManageInventory: false,
    canViewAllRecords: true,
  },
  finanzas: {
    canCreateRequisition: false,
    canCreatePurchaseRequest: false,
    canCreatePurchaseOrder: false,
    canApproveRequisition: false,
    canApprovePurchaseRequest: false,
    canApprovePurchaseOrder: true,
    canManageInventory: false,
    canViewAllRecords: true,
  },
  gerente: {
    canCreateRequisition: false,
    canCreatePurchaseRequest: false,
    canCreatePurchaseOrder: false,
    canApproveRequisition: false,
    canApprovePurchaseRequest: false,
    canApprovePurchaseOrder: false,
    canManageInventory: false,
    canViewAllRecords: true,
  },
  profesor: {
    canCreateRequisition: true,
    canCreatePurchaseRequest: true,
    canCreatePurchaseOrder: false,
    canApproveRequisition: false,
    canApprovePurchaseRequest: false,
    canApprovePurchaseOrder: false,
    canManageInventory: false,
    canViewAllRecords: false, // Solo ve los suyos
  },
  auditor: {
    canCreateRequisition: false,
    canCreatePurchaseRequest: false,
    canCreatePurchaseOrder: false,
    canApproveRequisition: false,
    canApprovePurchaseRequest: false,
    canApprovePurchaseOrder: false,
    canManageInventory: false,
    canViewAllRecords: true,
  },
}

export function canUserCreateRequisition(role: string): boolean {
  return rolePermissionsForActions[role as keyof typeof rolePermissionsForActions]?.canCreateRequisition || false
}

export function canUserCreatePurchaseRequest(role: string): boolean {
  return rolePermissionsForActions[role as keyof typeof rolePermissionsForActions]?.canCreatePurchaseRequest || false
}

export function canUserCreatePurchaseOrder(role: string): boolean {
  return rolePermissionsForActions[role as keyof typeof rolePermissionsForActions]?.canCreatePurchaseOrder || false
}

export function canUserApproveRequisition(role: string): boolean {
  return rolePermissionsForActions[role as keyof typeof rolePermissionsForActions]?.canApproveRequisition || false
}

export function canUserApprovePurchaseRequest(role: string): boolean {
  return rolePermissionsForActions[role as keyof typeof rolePermissionsForActions]?.canApprovePurchaseRequest || false
}

export function canUserApprovePurchaseOrder(role: string): boolean {
  return rolePermissionsForActions[role as keyof typeof rolePermissionsForActions]?.canApprovePurchaseOrder || false
}

export function canUserManageInventory(role: string): boolean {
  return rolePermissionsForActions[role as keyof typeof rolePermissionsForActions]?.canManageInventory || false
}

export function canUserViewAllRecords(role: string): boolean {
  return rolePermissionsForActions[role as keyof typeof rolePermissionsForActions]?.canViewAllRecords || false
}

export function getUserPermissionsForActions(role: string) {
  return rolePermissionsForActions[role as keyof typeof rolePermissionsForActions] || rolePermissionsForActions.profesor
}
