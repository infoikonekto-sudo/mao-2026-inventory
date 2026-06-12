import React, { useState, useEffect, useMemo } from 'react'
import { FileDown, Filter, Calendar, Package, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui'
import { supabase, getInventory } from '@/services/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import { exportInventoryToCSV } from '@/utils/exportUtils'
import toast from 'react-hot-toast'

interface Movement {
  id: string
  created_at: string
  item_id: string
  item_code: string
  type: 'entrada' | 'salida' | 'ajuste'
  change: number
  related_type: string
  justification: string
  purpose: string
  department_id: string
  inventory_items: { name: string, category: string, unit_cost: number }
  users: { name: string }
}

export default function ReportsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'entradas' | 'salidas' | 'valor'>('entradas')
  const [loading, setLoading] = useState(true)
  
  const [movements, setMovements] = useState<Movement[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  
  // Filters
  const [dateRange, setDateRange] = useState('month')
  const [filterDepartment, setFilterDepartment] = useState('')

  useEffect(() => {
    if (user?.license_id) {
      loadData()
    }
  }, [user?.license_id])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load Movements
      const { data: movs, error: movsError } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          inventory_items (name, category, unit_cost),
          users (name)
        `)
        .eq('license_id', user!.license_id)
        .order('created_at', { ascending: false })

      if (movsError) throw movsError
      setMovements(movs as any)

      // Load Inventory
      const invData = await getInventory(user!.license_id)
      setInventory(invData || [])

    } catch (error) {
      console.error('Error loading reports data:', error)
      toast.error('Error cargando datos para reportes')
    } finally {
      setLoading(false)
    }
  }

  // Filter Data
  const filteredMovements = useMemo(() => {
    let filtered = movements

    // Date Filter
    const now = new Date()
    const cutoff = new Date()
    if (dateRange === 'week') cutoff.setDate(now.getDate() - 7)
    if (dateRange === 'month') cutoff.setMonth(now.getMonth() - 1)
    if (dateRange === 'quarter') cutoff.setMonth(now.getMonth() - 3)
    if (dateRange === 'year') cutoff.setFullYear(now.getFullYear() - 1)

    if (dateRange !== 'all') {
      filtered = filtered.filter(m => new Date(m.created_at) >= cutoff)
    }

    // Department Filter
    if (filterDepartment) {
      filtered = filtered.filter(m => m.department_id === filterDepartment)
    }

    return filtered
  }, [movements, dateRange, filterDepartment])

  const entradas = filteredMovements.filter(m => m.type === 'entrada')
  const salidas = filteredMovements.filter(m => m.type === 'salida')

  const totalEntradasQ = entradas.reduce((sum, m) => sum + (m.change * (m.inventory_items?.unit_cost || 0)), 0)
  const totalSalidasQ = salidas.reduce((sum, m) => sum + (m.change * (m.inventory_items?.unit_cost || 0)), 0)
  const totalInventarioQ = inventory.reduce((sum, item) => sum + (item.current_stock * (item.unit_cost || 0)), 0)

  const handleExportCSV = (data: any[], filename: string) => {
    // Generate simple CSV
    if (!data.length) return toast.error('No hay datos para exportar')
    
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(obj => 
      Object.values(obj).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    )
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n')
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${filename}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportCurrentTab = () => {
    if (activeTab === 'entradas') {
      const exportData = entradas.map(m => ({
        Fecha: new Date(m.created_at).toLocaleDateString(),
        Codigo: m.item_code,
        Producto: m.inventory_items?.name,
        Categoria: m.inventory_items?.category,
        Cantidad: m.change,
        'Costo Unitario Q': m.inventory_items?.unit_cost || 0,
        'Total Q': (m.change * (m.inventory_items?.unit_cost || 0)).toFixed(2),
        Responsable: m.users?.name || 'Sistema',
        Justificacion: m.justification || ''
      }))
      handleExportCSV(exportData, 'Reporte_Ingresos')
    } else if (activeTab === 'salidas') {
      const exportData = salidas.map(m => ({
        Fecha: new Date(m.created_at).toLocaleDateString(),
        Codigo: m.item_code,
        Producto: m.inventory_items?.name,
        Categoria: m.inventory_items?.category,
        Cantidad: m.change,
        'Costo Unitario Q': m.inventory_items?.unit_cost || 0,
        'Total Q': (m.change * (m.inventory_items?.unit_cost || 0)).toFixed(2),
        Responsable: m.users?.name || 'Sistema',
        Justificacion: m.justification || ''
      }))
      handleExportCSV(exportData, 'Reporte_Salidas')
    } else {
      exportInventoryToCSV(inventory)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando datos reales de inventario...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Reportes Financieros y Logísticos</h1>
          <p className="text-gray-600 mt-1">Análisis de movimientos valorizados del inventario</p>
        </div>
        <Button onClick={exportCurrentTab} variant="primary">
          <FileDown size={20} className="mr-2" />
          Exportar Reporte
        </Button>
      </div>

      {/* Resumen Financiero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 text-blue-800 mb-2">
            <DollarSign size={20} />
            <h3 className="font-bold">Valor Total en Inventario</h3>
          </div>
          <p className="text-3xl font-black text-blue-900">Q {totalInventarioQ.toLocaleString('es-GT', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="card p-6 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-800 mb-2">
            <TrendingUp size={20} />
            <h3 className="font-bold">Total Ingresos (Periodo)</h3>
          </div>
          <p className="text-3xl font-black text-green-900">Q {totalEntradasQ.toLocaleString('es-GT', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="card p-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-800 mb-2">
            <TrendingDown size={20} />
            <h3 className="font-bold">Total Salidas (Periodo)</h3>
          </div>
          <p className="text-3xl font-black text-red-900">Q {totalSalidasQ.toLocaleString('es-GT', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('entradas')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'entradas' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              📥 Ingresos
            </button>
            <button
              onClick={() => setActiveTab('salidas')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'salidas' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              📤 Salidas
            </button>
            <button
              onClick={() => setActiveTab('valor')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'valor' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              💎 Valor Inventario
            </button>
          </div>

          <div className="flex gap-2">
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="input-base py-2">
              <option value="week">Últimos 7 días</option>
              <option value="month">Último Mes</option>
              <option value="quarter">Último Trimestre</option>
              <option value="year">Último Año</option>
              <option value="all">Historico Completo</option>
            </select>
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="card p-6">
        {activeTab === 'entradas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Producto</th>
                  <th className="p-3">Cantidad</th>
                  <th className="p-3">Costo U.</th>
                  <th className="p-3">Total (Q)</th>
                  <th className="p-3">Responsable</th>
                  <th className="p-3">Justificación</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entradas.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="p-3">{new Date(m.created_at).toLocaleDateString()}</td>
                    <td className="p-3 font-medium text-gray-900">{m.inventory_items?.name} <span className="text-xs text-gray-500 block">{m.item_code}</span></td>
                    <td className="p-3 text-green-600 font-bold">+{m.change}</td>
                    <td className="p-3">Q {(m.inventory_items?.unit_cost || 0).toFixed(2)}</td>
                    <td className="p-3 font-bold">Q {(m.change * (m.inventory_items?.unit_cost || 0)).toFixed(2)}</td>
                    <td className="p-3">{m.users?.name || '-'}</td>
                    <td className="p-3 text-gray-500 text-xs">{m.justification}</td>
                  </tr>
                ))}
                {entradas.length === 0 && (<tr><td colSpan={7} className="p-4 text-center text-gray-500">No hay ingresos en este periodo</td></tr>)}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'salidas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Producto</th>
                  <th className="p-3">Cantidad</th>
                  <th className="p-3">Costo U.</th>
                  <th className="p-3">Total (Q)</th>
                  <th className="p-3">Responsable</th>
                  <th className="p-3">Justificación</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {salidas.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="p-3">{new Date(m.created_at).toLocaleDateString()}</td>
                    <td className="p-3 font-medium text-gray-900">{m.inventory_items?.name} <span className="text-xs text-gray-500 block">{m.item_code}</span></td>
                    <td className="p-3 text-red-600 font-bold">-{m.change}</td>
                    <td className="p-3">Q {(m.inventory_items?.unit_cost || 0).toFixed(2)}</td>
                    <td className="p-3 font-bold text-red-700">Q {(m.change * (m.inventory_items?.unit_cost || 0)).toFixed(2)}</td>
                    <td className="p-3">{m.users?.name || '-'}</td>
                    <td className="p-3 text-gray-500 text-xs">{m.justification}</td>
                  </tr>
                ))}
                {salidas.length === 0 && (<tr><td colSpan={7} className="p-4 text-center text-gray-500">No hay salidas en este periodo</td></tr>)}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'valor' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Producto</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Stock Actual</th>
                  <th className="p-3">Costo Unitario</th>
                  <th className="p-3">Valor Total (Q)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inventory.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-3 text-xs text-gray-500">{item.item_code}</td>
                    <td className="p-3 font-medium text-gray-900">{item.name}</td>
                    <td className="p-3">{item.category}</td>
                    <td className="p-3 font-bold">{item.current_stock}</td>
                    <td className="p-3">Q {(item.unit_cost || 0).toFixed(2)}</td>
                    <td className="p-3 font-bold text-blue-700">Q {(item.current_stock * (item.unit_cost || 0)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
