// Roles del sistema
export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'jefe_compras'
  | 'finanzas'
  | 'gerente'
  | 'profesor'
  | 'auditor'
  | 'jefe_presupuesto'
  | 'jefe_operaciones'
  | 'jefe_calidad';

// Licenses
export interface License {
  id: string;
  school_code: string;
  school_name: string;
  license_key: string;
  is_active: boolean;
  expiration_date: string;
  max_users: number;
  created_at: string;
  updated_at: string;
}

// Departments
export interface Department {
  id: string;
  license_id: string;
  name: string;
  budget_limit?: number;
  status: 'activo' | 'inactivo';
  created_at: string;
}

// Users
export interface User {
  id: string;
  license_id: string;
  auth_code: string;
  email: string;
  full_name: string;
  role: UserRole;
  profile_photo_url?: string;
  phone?: string;
  department_id?: string;
  city?: string;
  bio?: string;
  is_active: boolean;
  custom_permissions?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

// Inventory Categories
export interface InventoryCategory {
  id: string;
  license_id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  created_at: string;
}

// Suppliers
export interface Supplier {
  id: string;
  license_id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  nit?: string;
  is_active: boolean;
  payment_terms?: string;
  notes?: string;
  created_at: string;
}

// Inventory Items
export interface InventoryItem {
  id: string;
  license_id: string;
  item_code: string;
  name: string;
  description?: string;
  category_id: string;
  unit_of_measure: string;
  current_stock: number;
  minimum_stock: number;
  unit_cost: number;
  location?: string;
  photo_urls?: string[];
  barcode?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Inventory Movements
export type MovementType = 'entrada' | 'salida' | 'ajuste' | 'requisicion';

export interface InventoryMovement {
  id: string;
  license_id: string;
  item_id: string;
  movement_type: MovementType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  invoice_photo_urls?: string[];
  department_id?: string;
  created_by: string;
  created_at: string;
}

// Requisitions
export type RequisitionStatus = 'pendiente' | 'en_revision' | 'aprobada' | 'rechazada' | 'entregada' | 'cancelada';
export type RequisitionPriority = 'baja' | 'media' | 'alta' | 'urgente';

export interface Requisition {
  id: string;
  license_id: string;
  requisition_number: string;
  requested_by: string;
  department_id?: string;
  status: RequisitionStatus;
  priority: RequisitionPriority;
  approved_by?: string;
  approval_date?: string;
  rejection_reason?: string;
  notes?: string;
  delivery_date?: string;
  created_at: string;
  updated_at: string;
}

export interface RequisitionItem {
  id: string;
  requisition_id: string;
  item_id: string;
  quantity_requested: number;
  quantity_approved?: number;
  unit?: string; // Custom unit of measure (caja, unidad, paquete, etc.)
  notes?: string;
}

// Purchase Requests
export type PurchaseRequestStatus = 'pendiente' | 'en_revision' | 'aprobada' | 'rechazada' | 'convertida_orden';

export interface PurchaseRequest {
  id: string;
  license_id: string;
  request_number: string;
  requested_by: string;
  department_id?: string;
  status: PurchaseRequestStatus;
  justification?: string;
  estimated_amount?: number;
  approved_by?: string;
  approval_date?: string;
  rejection_reason?: string;
  converted_to_order_id?: string;
  attachment_url?: string; // Optional quotation/image attachment
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequestItem {
  id: string;
  request_id: string;
  item_name: string;
  description?: string;
  category?: string;
  quantity: number;
  unit_of_measure?: string; // Custom unit (caja, unidad, etc.)
  estimated_unit_price?: number;
  supplier_suggestion?: string;
  notes?: string;
}

// Purchase Orders
export type PurchaseOrderStatus = 'borrador' | 'cotizacion' | 'aprobada' | 'en_proceso' | 'recibida' | 'cancelada';

export interface PurchaseOrder {
  id: string;
  license_id: string;
  order_number: string;
  purchase_request_id?: string;
  supplier_id: string;
  created_by: string;
  approved_by?: string;
  status: PurchaseOrderStatus;
  subtotal: number;
  tax: number;
  total_amount: number;
  payment_terms?: string;
  delivery_address?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  approval_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  quotation_url?: string;
  delivered_signature_url?: string;
  delivered_at?: string;
  delivered_to_name?: string;
  is_locked?: boolean;
  payment_reference?: string;
}

export interface PurchaseOrderItem {
  id: string;
  order_id: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  received_quantity?: number;
}

// Quotations
export interface Quotation {
  id: string;
  license_id: string;
  purchase_order_id: string;
  supplier_id: string;
  quotation_number: string;
  total_amount: number;
  validity_date?: string;
  payment_terms?: string;
  delivery_time?: string;
  is_selected?: boolean;
  quotation_file_urls?: string[];
  notes?: string;
  uploaded_by: string;
  created_at: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

// Emergency Purchases
export interface EmergencyPurchase {
  id: string;
  license_id: string;
  purchase_number: string;
  purchased_by: string;
  supplier_name: string;
  description: string;
  amount: number;
  purchase_date: string;
  justification?: string;
  invoice_number?: string;
  invoice_photo_urls?: string[];
  category?: string;
  created_at: string;
}

// Activity Logs
export interface ActivityLog {
  id: string;
  license_id: string;
  user_id: string;
  action: string;
  module: string;
  record_id?: string;
  record_type?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

// Notifications
export type NotificationType = 'info' | 'warning' | 'success' | 'error';

export interface Notification {
  id: string;
  license_id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  reference_id?: string;
  reference_type?: string;
  is_read: boolean;
  created_at: string;
}

// Audit Reports
export type AuditType = 'inventario' | 'compras' | 'finanzas' | 'general';
export type AuditStatus = 'en_proceso' | 'completada';

export interface AuditReport {
  id: string;
  license_id: string;
  audit_number: string;
  audited_by: string;
  audit_type: AuditType;
  period_start: string;
  period_end: string;
  findings?: Record<string, any>;
  recommendations?: string;
  report_file_url?: string;
  status: AuditStatus;
  created_at: string;
}

// Authentication Context
export interface AuthContextType {
  user: User | null;
  license: License | null;
  isLoading: boolean;
  error: string | null;
  login: (authCode: string) => Promise<void>;
  logout: () => void;
}

// Dashboard Metrics
export interface DashboardMetrics {
  totalItems: number;
  itemsLowStock: number;
  totalValue: number;
  pendingRequisitions: number;
  pendingPurchaseRequests: number;
  activeOrders: number;
  monthlyExpense: number;
  approvalRate: number;
}
