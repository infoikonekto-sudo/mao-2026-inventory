/**
 * Utilities for exporting data to CSV format
 */

export interface ExportColumn {
  key: string
  label: string
  format?: (value: any) => string
}

/**
 * Convert array of objects to CSV string
 */
export const arrayToCSV = (data: any[], columns: ExportColumn[]): string => {
  // CSV header
  const header = columns.map(col => `"${col.label}"`).join(',')
  
  // CSV rows
  const rows = data.map(item =>
    columns
      .map(col => {
        let value = item[col.key]
        
        // Apply custom format if provided
        if (col.format) {
          value = col.format(value)
        }
        
        // Escape quotes and wrap in quotes
        const stringValue = String(value || '')
        return `"${stringValue.replace(/"/g, '""')}"`
      })
      .join(',')
  )
  
  return [header, ...rows].join('\n')
}

/**
 * Download CSV file
 */
export const downloadCSV = (csv: string, filename: string): void => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export requisitions to CSV
 */
export const exportRequisitionsToCSV = (requisitions: any[]): void => {
  const columns: ExportColumn[] = [
    { key: 'requisition_number', label: 'Número' },
    { key: 'users.full_name', label: 'Usuario' },
    { key: 'users.department', label: 'Departamento' },
    { key: 'estimated_amount', label: 'Monto Estimado (Q)', format: (v) => parseFloat(v || 0).toFixed(2) },
    { key: 'priority', label: 'Prioridad' },
    { key: 'status', label: 'Estado' },
    { key: 'justification', label: 'Justificación' },
    { key: 'created_at', label: 'Fecha de Creación', format: (v) => new Date(v).toLocaleDateString('es-GT') },
  ]
  
  // Flatten nested objects for export
  const flatData = requisitions.map(req => ({
    ...req,
    'users.full_name': req.users?.full_name || '',
    'users.department': req.users?.department || '',
  }))
  
  const csv = arrayToCSV(flatData, columns)
  downloadCSV(csv, 'requisiciones')
}

/**
 * Export purchase requests to CSV
 */
export const exportPurchaseRequestsToCSV = (requests: any[]): void => {
  const columns: ExportColumn[] = [
    { key: 'request_number', label: 'Número' },
    { key: 'users.full_name', label: 'Usuario' },
    { key: 'users.department', label: 'Departamento' },
    { key: 'estimated_amount', label: 'Monto Estimado (Q)', format: (v) => parseFloat(v || 0).toFixed(2) },
    { key: 'status', label: 'Estado' },
    { key: 'justification', label: 'Justificación' },
    { key: 'created_at', label: 'Fecha de Creación', format: (v) => new Date(v).toLocaleDateString('es-GT') },
  ]
  
  // Flatten nested objects for export
  const flatData = requests.map(req => ({
    ...req,
    'users.full_name': req.users?.full_name || '',
    'users.department': req.users?.department || '',
  }))
  
  const csv = arrayToCSV(flatData, columns)
  downloadCSV(csv, 'solicitudes-compra')
}

/**
 * Export purchase orders to CSV
 */
export const exportPurchaseOrdersToCSV = (orders: any[]): void => {
  const columns: ExportColumn[] = [
    { key: 'order_number', label: 'Número de Orden' },
    { key: 'suppliers.name', label: 'Proveedor' },
    { key: 'purchase_requests.request_number', label: 'Solicitud' },
    { key: 'total_amount', label: 'Monto Total (Q)', format: (v) => parseFloat(v || 0).toFixed(2) },
    { key: 'status', label: 'Estado' },
    { key: 'delivery_date', label: 'Fecha Entrega', format: (v) => new Date(v).toLocaleDateString('es-GT') },
    { key: 'created_at', label: 'Fecha de Creación', format: (v) => new Date(v).toLocaleDateString('es-GT') },
  ]
  
  // Flatten nested objects for export
  const flatData = orders.map(order => ({
    ...order,
    'suppliers.name': order.suppliers?.name || '',
    'purchase_requests.request_number': order.purchase_requests?.request_number || '',
  }))
  
  const csv = arrayToCSV(flatData, columns)
  downloadCSV(csv, 'ordenes-compra')
}

/**
 * Export inventory items to CSV
 */
export const exportInventoryToCSV = (items: any[]): void => {
  const columns: ExportColumn[] = [
    { key: 'code', label: 'Código' },
    { key: 'name', label: 'Nombre' },
    { key: 'description', label: 'Descripción' },
    { key: 'unit_price', label: 'Precio Unitario (Q)', format: (v) => parseFloat(v || 0).toFixed(2) },
    { key: 'stock_quantity', label: 'Stock' },
    { key: 'minimum_stock', label: 'Mínimo' },
    { key: 'total_value', label: 'Valor Total (Q)', format: (v: any) => parseFloat(v || 0).toFixed(2) },
    { key: 'category', label: 'Categoría' },
    { key: 'updated_at', label: 'Última Actualización', format: (v: any) => v ? new Date(v).toLocaleDateString('es-GT') : '' },
  ]
  
  const itemsWithTotalValue = items.map(item => ({
    ...item,
    total_value: (item.current_stock || item.stock_quantity || 0) * parseFloat(item.unit_price || item.unit_cost || 0)
  }));

  const totalGeneral = itemsWithTotalValue.reduce((sum, item) => sum + item.total_value, 0);
  
  const itemsWithTotal = [...itemsWithTotalValue, { 
    code: 'TOTAL', 
    name: 'TOTAL INVENTARIO', 
    unit_price: '', 
    stock_quantity: '', 
    minimum_stock: '', 
    total_value: totalGeneral, 
    category: '', 
    updated_at: '' 
  }];

  const csv = arrayToCSV(itemsWithTotal, columns)
  downloadCSV(csv, 'inventario')
}
