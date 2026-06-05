import { useState, useEffect } from 'react'
import { Search, Eye, Download } from 'lucide-react'
import { Button } from '@/components/ui'
import { supabase } from '@/services/supabaseClient'
import * as XLSX from 'xlsx'

interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: string
  old_data: any
  new_data: any
  changed_by: string
  created_at: string
  user_name?: string
  user_role?: string
}

const actionColors = {
  'CREAR': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  'MODIFICAR': 'bg-amber-100 text-amber-800 border border-amber-200',
  'ELIMINAR': 'bg-rose-100 text-rose-800 border border-rose-200',
  'ENTREGAR': 'bg-blue-100 text-blue-800 border border-blue-200',
  'DEFAULT': 'bg-slate-100 text-slate-800 border border-slate-200'
}

const moduleInfo: Record<string, { label: string, icon: string, color: string }> = {
  'inventory_items': { label: 'Inventario', icon: '📦', color: 'text-green-600 bg-green-50' },
  'requisitions': { label: 'Requisiciones', icon: '📋', color: 'text-blue-600 bg-blue-50' },
  'purchase_orders': { label: 'Órdenes de Compra', icon: '📑', color: 'text-purple-600 bg-purple-50' },
  'purchase_requests': { label: 'Solicitudes', icon: '🛒', color: 'text-amber-600 bg-amber-50' },
  'budgets': { label: 'Presupuestos', icon: '💰', color: 'text-emerald-600 bg-emerald-50' },
  'cost_centers': { label: 'Centros de Costo', icon: '🏦', color: 'text-indigo-600 bg-indigo-50' },
  'inventory_movements': { label: 'Movimientos', icon: '🔄', color: 'text-slate-600 bg-slate-50' },
  'suppliers': { label: 'Proveedores', icon: '🏢', color: 'text-cyan-600 bg-cyan-50' },
  'users': { label: 'Usuarios', icon: '👥', color: 'text-rose-600 bg-rose-50' }
}

// Helper Inteligente para descripciones humanas
const formatAuditLog = (log: AuditLog) => {
  const { action, table_name, old_data, new_data } = log
  let description = ''
  let details = ''

  const data = new_data || old_data || {}

  switch (table_name) {
    case 'purchase_requests':
      const reqNumber = data.request_number || '???'
      const justification = data.justification ? `"${data.justification}"` : ''

      if (action === 'CREAR') {
        description = `Creó Solicitud #${reqNumber}`
        details = justification || `Monto: Q${data.estimated_amount}`
      } else if (action === 'MODIFICAR') {
        description = `Actualizó Solicitud #${reqNumber}`
        if (old_data?.status !== new_data?.status) {
          details = `Cambió estado de ${old_data.status} a ${new_data.status}`
        } else {
          details = 'Actualizó detalles'
        }
      }
      break

    case 'requisitions':
      const reqNo = data.requisition_number || '???'
      const reqNote = data.justification || data.notes || ''

      if (action === 'CREAR') {
        description = `Creó Requisición #${reqNo}`
        details = reqNote ? `Motivo: ${reqNote}` : (data.priority ? `Prioridad: ${data.priority}` : '')
      } else if (action === 'MODIFICAR') {
        description = `Actualizó Requisición #${reqNo}`
        if (old_data?.status !== new_data?.status) {
          details = `Estado: ${old_data.status} ➝ ${new_data.status}`
        } else {
          details = 'Modificó datos'
        }
      }
      break

    case 'purchase_orders':
      const ordNo = data.order_number || '???'
      if (action === 'CREAR') {
        description = `Creó Orden #${ordNo}`
        details = `Total: Q${data.total_amount || 0}`
      } else if (action === 'MODIFICAR') {
        description = `Actualizó Orden #${ordNo}`
        if (old_data?.status !== new_data?.status) {
          details = `Estado: ${old_data.status} ➝ ${new_data.status}`
        }
      }
      break

    case 'inventory_items':
      const prodName = data.name || 'Producto'
      if (action === 'MODIFICAR') {
        if (old_data?.current_stock !== new_data?.current_stock) {
          description = `Ajuste de Stock: ${prodName}`
          details = `${old_data.current_stock} ➝ ${new_data.current_stock} ${data.unit_of_measure || 'unidades'}`
        } else {
          description = `Editó producto: ${prodName}`
          details = 'Actualizó información general'
        }
      } else if (action === 'CREAR') {
        description = `Nuevo producto: ${prodName}`
        details = `Stock inicial: ${data.current_stock}`
      }
      break

    case 'inventory_movements':
      description = `Movimiento de Inventario`
      details = `${data.movement_type}: ${data.quantity} unidades`
      break

    case 'budgets':
      if (action === 'CREAR') {
        description = `Inició Presupuesto: ${data.name}`
        details = `Monto inicial: Q${(data.total_amount || 0).toLocaleString()}`
      } else if (action === 'MODIFICAR') {
        description = `Ajustó Presupuesto: ${data.name}`
        if (old_data?.total_amount !== new_data?.total_amount) {
          details = `Monto: Q${old_data?.total_amount?.toLocaleString()} ➝ Q${new_data?.total_amount?.toLocaleString()}`
        } else if (old_data?.status !== new_data?.status) {
          details = `Estado: ${old_data.status} ➝ ${new_data.status}`
        } else {
          details = 'Actualizó parámetros generales'
        }
      }
      break

    case 'cost_centers':
      if (action === 'CREAR') {
        description = `Creó Centro de Costo: ${data.name}`
        details = `Código: ${data.code} | Asignado: Q${(data.budget_allocated || 0).toLocaleString()}`
      } else if (action === 'MODIFICAR') {
        description = `Editó Centro de Costo: ${data.name}`
        if (old_data?.budget_allocated !== new_data?.budget_allocated) {
          details = `Techo: Q${old_data?.budget_allocated?.toLocaleString()} ➝ Q${new_data?.budget_allocated?.toLocaleString()}`
        } else {
          details = `Actualizó información de ${data.department || 'departamento'}`
        }
      }
      break

    default:
      const info = moduleInfo[table_name]
      const fallbackName = data.name || data.title || data.description || ''
      description = `${action === 'CREAR' ? 'Nuevo' : action === 'MODIFICAR' ? 'Cambio en' : 'Eliminó'} ${info?.label || table_name}`
      details = fallbackName || `ID: ${log.record_id.substring(0, 8)}`
  }

  return { description, details }
}

const getActionColor = (action: string) => {
  return actionColors[action as keyof typeof actionColors] || actionColors['DEFAULT']
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTable, setFilterTable] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    fetchAuditLogs()

    // Configurar realtime
    const channel = supabase
      .channel('audit_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_logs'
      }, (_payload) => {
        // Al recibir evento nuevo, recargar auditoría
        // Nota: en producción idealmente solo agregamos el item al state, 
        // pero necesitamos el JOIN con users que hace la vista.
        // Por simplicidad, refrescamos.
        fetchAuditLogs()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('v_audit_logs_details')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        // Fallback
        const { data: directData } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        setLogs(directData || [])
      } else {
        setLogs(data || [])
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const dataToExport = logs.map(log => {
      const { description, details } = formatAuditLog(log)
      const info = moduleInfo[log.table_name]
      return {
        Fecha: new Date(log.created_at).toLocaleString(),
        Usuario: log.user_name || 'Sistema',
        Rol: log.user_role || '-',
        Acción: log.action,
        Módulo: info?.label || log.table_name,
        'Qué Pasó': description,
        'Detalle': details
      }
    })

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoría')
    XLSX.writeFile(wb, `Auditoria_MAO_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Filter Logic
  const filtered = logs.filter(log => {
    const { description, details } = formatAuditLog(log)
    const info = moduleInfo[log.table_name]
    const normalizedSearch = searchTerm.toLowerCase()
    const fullText = `${log.user_name || ''} ${description} ${details} ${info?.label || log.table_name}`.toLowerCase()

    return fullText.includes(normalizedSearch) &&
      (!filterTable || log.table_name === filterTable) &&
      (!filterAction || log.action === filterAction)
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔍 Auditoría del Sistema</h1>
          <p className="text-gray-600 mt-1">Monitoreo de actividad y cambios en tiempo real</p>
        </div>
        <Button onClick={handleExport} variant="secondary" className="flex items-center gap-2">
          <Download size={18} />
          Exportar Excel
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar: usuario, acción, descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base pl-10 w-full"
          />
        </div>
        <select
          value={filterTable}
          onChange={(e) => setFilterTable(e.target.value)}
          className="input-base md:w-48"
        >
          <option value="">Todos los módulos</option>
          <option value="requisitions">Requisiciones</option>
          <option value="purchase_requests">Solicitudes</option>
          <option value="inventory_items">Inventario</option>
          <option value="purchase_orders">Órdenes de Compra</option>
          <option value="budgets">Presupuestos</option>
          <option value="cost_centers">Centros de Costo</option>
          <option value="users">Usuarios</option>
        </select>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="input-base md:w-48"
        >
          <option value="">Todas las acciones</option>
          <option value="CREAR">Crear</option>
          <option value="MODIFICAR">Modificar</option>
          <option value="ELIMINAR">Eliminar</option>
        </select>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando actividad...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No se encontraron registros que coincidan con los filtros.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((log) => {
              const { description, details } = formatAuditLog(log)
              const info = moduleInfo[log.table_name] || { label: log.table_name, icon: '❓', color: 'bg-gray-50 text-gray-600' }
              return (
                <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-start gap-4">
                    {/* Icon/Color Indicator */}
                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${log.action === 'CREAR' ? 'bg-emerald-500 ring-4 ring-emerald-100' :
                      log.action === 'ELIMINAR' ? 'bg-rose-500 ring-4 ring-rose-100' :
                        'bg-amber-500 ring-4 ring-amber-100'
                      }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap md:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                          <h4 className="font-semibold text-gray-900 text-sm md:text-base">
                            {description}
                          </h4>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mt-1 pl-1 border-l-2 border-slate-100">
                        {details}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                          <span className="font-medium text-slate-700">{log.user_name || 'Sistema'}</span>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md font-medium ${info.color}`}>
                          <span>{info.icon}</span>
                          <span>{info.label}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Ver Detalles Técnicos"
                    >
                      <Eye size={18} className="text-gray-500" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Detail */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Detalle de Auditoría</h3>
                <p className="text-sm text-gray-500">ID: {selectedLog.id}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 text-sm">
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase">Usuario</span>
                <span className="font-medium text-gray-900">{selectedLog.user_name || 'Desconocido'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase">Fecha</span>
                <span className="font-medium text-gray-900">{new Date(selectedLog.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase">Módulo</span>
                <span className="font-medium text-gray-900">{selectedLog.table_name}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase">Acción</span>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getActionColor(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedLog.old_data ? (
                <div className="border rounded-lg overflow-hidden border-rose-100">
                  <div className="bg-rose-50 px-4 py-2 border-b border-rose-100 flex items-center justify-between">
                    <h4 className="font-bold text-rose-800 text-xs uppercase tracking-wider">Valor Anterior (DE)</h4>
                    <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded font-bold">REMOVIDO</span>
                  </div>
                  <pre className="p-4 text-xs overflow-auto bg-slate-50 text-slate-700 max-h-64 font-mono leading-relaxed">
                    {JSON.stringify(selectedLog.old_data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="border rounded-lg border-dashed border-slate-200 flex items-center justify-center p-8 bg-slate-50">
                  <span className="text-slate-400 text-xs italic font-medium">Sin datos previos (Registro nuevo)</span>
                </div>
              )}

              {selectedLog.new_data ? (
                <div className="border rounded-lg overflow-hidden border-emerald-100">
                  <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex items-center justify-between">
                    <h4 className="font-bold text-emerald-800 text-xs uppercase tracking-wider">Valor Nuevo (A)</h4>
                    <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-bold">ACTUAL</span>
                  </div>
                  <pre className="p-4 text-xs overflow-auto bg-slate-50 text-slate-700 max-h-64 font-mono leading-relaxed border-l-4 border-emerald-400">
                    {JSON.stringify(selectedLog.new_data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="border rounded-lg border-dashed border-rose-200 flex items-center justify-center p-8 bg-rose-50">
                  <span className="text-rose-400 text-xs italic font-medium">Datos eliminados</span>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <Button onClick={() => setSelectedLog(null)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
