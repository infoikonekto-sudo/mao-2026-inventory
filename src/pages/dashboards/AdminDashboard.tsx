import { useEffect, useState } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, AlertCircle, CheckCircle, Clock, Loader } from 'lucide-react'
import { supabase, getCostCenters, getInventory } from '@/services/supabaseClient'
import { useAuthStore } from '@/stores/authStore'

// Color palette for charts
const COLORS = ['#1E40AF', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']

const MetricCard = ({ icon: Icon, label, value, subtext, color }: any) => (
  <div className="card p-6 flex items-start gap-4">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
    <div className="flex-1">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  </div>
)

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    lowStockItems: 0,
    totalValue: 0,
    pendingRequisitions: 0,
    activeOrders: 0,
  })
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [requisitionsData, setRequisitionsData] = useState<any[]>([])
  const [expenseData, setExpenseData] = useState<any[]>([])
  const [alerts, setAlerts] = useState<string[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [topCostCenters, setTopCostCenters] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const licenseId = useAuthStore.getState().license?.id
      if (!licenseId) return

      // Ejecutar consultas de métricas básicas primero y de forma segura
      const [
        inventoryItems,
        reqSummaryResult,
        purchaseReqsResult,
        expressOrdersResult,
        orderSummaryResult,
      ] = await Promise.all([
        getInventory(licenseId).catch(err => { console.error('Inv err', err); return [] }),
        supabase.from('requisitions').select('status', { count: 'exact' }).eq('license_id', licenseId).eq('status', 'en_revision'),
        supabase.from('purchase_requests').select('status', { count: 'exact' }).eq('license_id', licenseId).eq('status', 'pendiente'),
        supabase.from('express_purchase_orders').select('status', { count: 'exact' }).eq('license_id', licenseId).in('status', ['pending_approval', 'purchased']),
        supabase.from('purchase_orders').select('status, total_amount', { count: 'exact' }).eq('license_id', licenseId).in('status', ['pendiente', 'en_transito']),
      ]) as [any[], any, any, any, any]

      const [activityResult, ccData] = await Promise.all([
        (async () => {
          try {
            const res = await supabase.from('v_recent_activity').select('activity_type, description, created_at').eq('license_id', licenseId).order('created_at', { ascending: false }).limit(5)
            if (res.error) throw res.error
            return res
          } catch (e) {
            console.warn('Alerta: v_recent_activity no disponible o error de red.', e)
            return { data: [], error: null }
          }
        })(),
        getCostCenters(licenseId).catch(() => [])
      ])

      // 1. INVENTARIO
      const totalItems = inventoryItems?.length || 0
      const lowStockItems = inventoryItems?.filter((item: any) => item.is_low_stock).length || 0
      const totalValue = inventoryItems?.reduce(
        (sum: number, item: any) => sum + ((item.unit_cost || 0) * (item.current_stock || 0)), 0
      ) || 0

      const categoryMap = new Map<string, { name: string; value: number; fill: string }>()
      inventoryItems?.forEach((item: any) => {
        const cat = item.category || 'Sin categoría'
        const existing = categoryMap.get(cat) || { name: cat, value: 0, fill: '' }
        existing.value += 1
        categoryMap.set(cat, existing)
      })
      
      // Sort by value descending and assign colors
      const sortedCategories = Array.from(categoryMap.values())
        .sort((a, b) => b.value - a.value)
        .map((cat, idx) => ({
          ...cat,
          fill: COLORS[idx % COLORS.length]
        }))
      
      setCategoryData(sortedCategories)

      // 2. REQUISICIONES (Bodega)
      const pendingRequisitions = reqSummaryResult.count || 0
      setRequisitionsData([
        { mes: 'Bodega', count: pendingRequisitions, fill: '#10B981' },
        { mes: 'Solicitudes', count: purchaseReqsResult.count || 0, fill: '#F59E0B' },
        { mes: 'Express', count: expressOrdersResult.count || 0, fill: '#8B5CF6' },
      ])

      // 3. ÓRDENES Y COMPRAS
      const pendingPurchaseReqs = purchaseReqsResult.count || 0
      const pendingExpressOrders = expressOrdersResult.count || 0
      const activeOrdersCount = orderSummaryResult.count || 0
      const totalPurchaseValue = (orderSummaryResult.data as any[])?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

      setExpenseData([
        {
          month: 'Órdenes',
          presupuesto: 100000,
          gastado: totalPurchaseValue,
          pendiente: 0
        },
      ])

      setMetrics({
        totalItems,
        lowStockItems,
        totalValue,
        pendingRequisitions: pendingRequisitions + pendingPurchaseReqs + pendingExpressOrders,
        activeOrders: activeOrdersCount,
      })

      // 4. ALERTAS
      const alertList = []
      if (lowStockItems > 0) alertList.push(`${lowStockItems} items con stock bajo`)

      const totalSimplifiedAlerts = pendingRequisitions + pendingPurchaseReqs
      if (totalSimplifiedAlerts > 0) {
        let details = []
        if (pendingRequisitions > 0) details.push(`${pendingRequisitions} requisiciones`)
        if (pendingPurchaseReqs > 0) details.push(`${pendingPurchaseReqs} solicitudes de compra`)
        alertList.push(`${totalSimplifiedAlerts} órdenes pendientes (${details.join(' • ')})`)
      }
      setAlerts(alertList)

      // 5. ACTIVIDAD RECIENTE
      const formattedActivity = (activityResult as any).data?.map((item: any) => {
        const timeDiff = Math.floor((Date.now() - new Date(item.created_at).getTime()) / 1000 / 60)
        const timeStr = timeDiff < 1 ? 'Hace un momento' : timeDiff < 60 ? `Hace ${timeDiff} min` : `Hace ${Math.floor(timeDiff / 60)} horas`
        return {
          time: timeStr,
          action: item.description,
          type: item.activity_type
        }
      }) || []
      setRecentActivity(formattedActivity)

      // 6. CENTROS DE COSTO
      const top = (ccData as any[] || [])
        .filter((cc: any) => cc.budget_spent > 0)
        .sort((a: any, b: any) => b.budget_spent - a.budget_spent)
        .slice(0, 5)
        .map((cc: any) => ({
          name: cc.name.length > 20 ? cc.name.substring(0, 20) + '...' : cc.name,
          gastado: cc.budget_spent
        }))
      setTopCostCenters(top)

    } catch (error: any) {
      console.error('Error loading dashboard data:', error)
      if (error?.message?.includes('fetch')) {
        setAlerts(['Error de conexión (Red inestable). Reintentando...'])
        setTimeout(loadDashboardData, 5000)
      } else {
        setAlerts(['Error al cargar algunos datos del panel.'])
      }
    } finally {
      setLoading(false)
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando panel de control...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
        <p className="text-gray-600 mt-1">Bienvenido al sistema de inventario y compras</p>
      </div>

      {/* Alert Section */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-yellow-900">Alertas Activas</h3>
            <p className="text-sm text-yellow-800 mt-1">
              {alerts.join(' • ')}
            </p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={TrendingUp}
          label="Items en Inventario"
          value={metrics.totalItems.toString()}
          subtext={`${metrics.lowStockItems} con stock bajo`}
          color="bg-blue-500"
        />
        <MetricCard
          icon={Clock}
          label="Requisiciones Pendientes"
          value={metrics.pendingRequisitions.toString()}
          subtext="Requieren acción"
          color="bg-yellow-500"
        />
        <MetricCard
          icon={AlertCircle}
          label="Stock Bajo"
          value={metrics.lowStockItems.toString()}
          subtext="Requieren acción"
          color="bg-red-500"
        />
        <MetricCard
          icon={CheckCircle}
          label="Órdenes Activas"
          value={metrics.activeOrders.toString()}
          subtext="En progreso"
          color="bg-green-500"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventario por Categoría */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventario por Categoría</h2>
          {categoryData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-6 h-[400px]">
              {/* Donut Chart */}
              <div className="relative w-full md:w-1/2 h-[250px] md:h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.fill} 
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`${value} items`, 'Cantidad']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-bold text-gray-900">{metrics.totalItems}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Total</p>
                </div>
              </div>

              {/* Custom Detailed Legend */}
              <div className="w-full md:w-1/2 overflow-y-auto max-h-full pr-2 custom-scrollbar">
                <div className="space-y-2">
                  {categoryData.map((entry, index) => {
                    const percentage = ((entry.value / metrics.totalItems) * 100).toFixed(1)
                    return (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                            style={{ backgroundColor: entry.fill }}
                          />
                          <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]" title={entry.name}>
                            {entry.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                            {entry.value}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium w-10 text-right">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No hay datos de categorías
            </div>
          )}
        </div>

        {/* Valor Total del Inventario */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Valor Total del Inventario</h2>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-5xl font-bold text-primary mb-2">
              Q {metrics.totalValue.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-primary h-3 rounded-full"
                style={{ width: `${Math.min((metrics.totalValue / 500000) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">Meta: Q 500,000 ({Math.round((metrics.totalValue / 500000) * 100)}%)</p>
          </div>
        </div>
      </div>

      {/* More Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado de Requisiciones */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Requisiciones</h2>
          {requisitionsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={requisitionsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Cantidad">
                  {requisitionsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              No hay datos de requisiciones
            </div>
          )}
        </div>

        {/* Gastos vs Presupuesto */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Gastos vs Presupuesto</h2>
          {expenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expenseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="presupuesto" name="Presupuesto" fill="#1E40AF" />
                <Bar dataKey="gastado" name="Gastado" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              No hay datos de gastos
            </div>
          )}
        </div>
      </div>

      {/* Top Centros de Costo - (Mostrado también en Dashboard de Presupuestos) */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Centros de Costo (Gasto Directo)</h2>
        {topCostCenters.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCostCenters} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} style={{ fontSize: '11px' }} />
              <Tooltip formatter={(value: number) => `Q${value.toLocaleString()}`} />
              <Bar dataKey="gastado" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-500">
            No hay gastos registrados por Centro de Costo
          </div>
        )}
      </div>


      {/* Activity Table */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
        <div className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-4 pb-3 border-b border-gray-100 last:border-0">
                <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No hay actividad reciente</p>
          )}
        </div>
      </div>
    </div >
  )
}
