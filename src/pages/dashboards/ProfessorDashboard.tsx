import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { FileText, CheckCircle, Clock, XCircle, TrendingUp, ShoppingCart, UserRound } from 'lucide-react'
import { supabase } from '@/services/supabaseClient'
import { useAuthStore } from '@/stores/authStore'

const MetricCard = ({ icon: Icon, label, value, subtext, colorClass }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col items-start transition-transform hover:-translate-y-1 hover:shadow-2xl group">
    <div className={`p-4 rounded-[1.5rem] mb-4 ${colorClass} text-white shadow-lg transition-transform group-hover:scale-110`}>
      <Icon size={24} />
    </div>
    <div className="w-full">
      <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest leading-tight">{label}</p>
      <p className="text-3xl md:text-4xl font-black text-gray-900 mt-1">{value}</p>
      {subtext && <p className="text-xs font-bold text-gray-500 mt-2 bg-gray-50 inline-block px-3 py-1 rounded-full">{subtext}</p>}
    </div>
  </div>
)

export default function ProfessorDashboard() {
  const { user, license } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalRequisitions: 0,
    pendingRequisitions: 0,
    approvedRequisitions: 0,
    rejectedRequisitions: 0,
    readyToCollect: 0,
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
  })
  const [requisitionsData, setRequisitionsData] = useState<any[]>([])
  const [requestsData, setRequestsData] = useState<any[]>([])
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [departmentName, setDepartmentName] = useState<string>('')

  useEffect(() => {
    loadDashboardData()
  }, [user?.id, license?.id])

  const loadDashboardData = async () => {
    if (!user?.id || !license?.id) return

    try {
      setLoading(true)

      // 0. Obtener el área/departamento del usuario
      const { data: userData } = await supabase
        .from('users')
        .select('department_id, departments(name)')
        .eq('id', user.id)
        .single()

      const deptData: any = userData?.departments;
      if (deptData && !Array.isArray(deptData) && deptData.name) {
        setDepartmentName(deptData.name)
      } else if (Array.isArray(deptData) && deptData[0]?.name) {
        setDepartmentName(deptData[0].name)
      }

      // 1. Cargar requisiciones del usuario
      const { data: requisitions } = await supabase
        .from('requisitions')
        .select('id, status, created_at')
        .eq('license_id', license.id)
        .eq('user_id', user.id)

      const totalRequisitions = requisitions?.length || 0
      const pendingRequisitions = requisitions?.filter(r => r.status === 'pendiente').length || 0
      const approvedRequisitions = requisitions?.filter(r => r.status === 'aprobada').length || 0
      const rejectedRequisitions = requisitions?.filter(r => r.status === 'rechazada').length || 0
      const readyToCollect = requisitions?.filter(r => r.status === 'listo_para_recoger').length || 0

      setMetrics(prev => ({
        ...prev,
        totalRequisitions,
        pendingRequisitions,
        approvedRequisitions,
        rejectedRequisitions,
        readyToCollect,
      }))

      // 2. Cargar solicitudes de compra del usuario
      const { data: purchaseRequests } = await supabase
        .from('purchase_requests')
        .select('id, status, created_at')
        .eq('license_id', license.id)
        .eq('user_id', user.id)

      const totalRequests = purchaseRequests?.length || 0
      const pendingRequests = purchaseRequests?.filter(r => r.status === 'pendiente').length || 0
      const approvedRequests = purchaseRequests?.filter(r => r.status === 'aprobada').length || 0
      const rejectedRequests = purchaseRequests?.filter(r => r.status === 'rechazada').length || 0

      setMetrics(prev => ({
        ...prev,
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
      }))

      // 3. Gráfico de requisiciones por estado
      setRequisitionsData([
        { estado: 'Listas para recoger', count: readyToCollect, fill: '#3B82F6' },
        { estado: 'Aprobadas', count: approvedRequisitions, fill: '#10B981' },
        { estado: 'Pendientes', count: pendingRequisitions, fill: '#F59E0B' },
        { estado: 'Rechazadas', count: rejectedRequisitions, fill: '#EF4444' },
      ])

      // 4. Gráfico de solicitudes por estado
      setRequestsData([
        { estado: 'Aprobadas', count: approvedRequests, fill: '#10B981' },
        { estado: 'Pendientes', count: pendingRequests, fill: '#F59E0B' },
        { estado: 'Rechazadas', count: rejectedRequests, fill: '#EF4444' },
      ])

      // 5. Timeline de últimos 7 días
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return {
          date: date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
          requisiciones: 0,
          solicitudes: 0,
        }
      })

      requisitions?.forEach((r: any) => {
        const reqDate = new Date(r.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
        const dayData = last7Days.find(d => d.date === reqDate)
        if (dayData) dayData.requisiciones++
      })

      purchaseRequests?.forEach((r: any) => {
        const reqDate = new Date(r.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
        const dayData = last7Days.find(d => d.date === reqDate)
        if (dayData) dayData.solicitudes++
      })

      setTimelineData(last7Days)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard de {user?.full_name}</h1>
        <div className="text-center py-10 text-gray-500">Cargando datos...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1800px] mx-auto animate-in fade-in duration-500">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-200">
            <UserRound size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Hola, {user?.full_name?.split(' ')[0] || 'Profesor'} 👋</h1>
            {departmentName && (
               <p className="text-blue-600 font-bold mt-1 text-sm md:text-base uppercase tracking-widest flex items-center gap-2">
                 Área: {departmentName}
               </p>
            )}
            <p className="text-gray-500 font-medium mt-1 text-sm md:text-base">Aquí tienes el resumen de tu actividad de inventario y compras</p>
          </div>
        </div>
      </div>

      {/* Métricas de Requisiciones */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-gray-800 uppercase tracking-widest pl-2 flex items-center gap-2">
          <FileText size={20} className="text-blue-500" />
          Tus Requisiciones
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
          <MetricCard
            icon={FileText}
            label="Total Requisiciones"
            value={metrics.totalRequisitions}
            colorClass="bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-200"
          />
          <MetricCard
            icon={Clock}
            label="Pendientes"
            value={metrics.pendingRequisitions}
            subtext={`${metrics.totalRequisitions > 0 ? Math.round((metrics.pendingRequisitions / metrics.totalRequisitions) * 100) : 0}%`}
            colorClass="bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-200"
          />
          <MetricCard
            icon={CheckCircle}
            label="Listas para recoger"
            value={metrics.readyToCollect}
            subtext="Pasa a bodega"
            colorClass="bg-gradient-to-br from-sky-400 to-blue-500 shadow-sky-200"
          />
          <MetricCard
            icon={CheckCircle}
            label="Aprobadas"
            value={metrics.approvedRequisitions}
            subtext={`${metrics.totalRequisitions > 0 ? Math.round((metrics.approvedRequisitions / metrics.totalRequisitions) * 100) : 0}%`}
            colorClass="bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-200"
          />
          <MetricCard
            icon={XCircle}
            label="Rechazadas"
            value={metrics.rejectedRequisitions}
            subtext={`${metrics.totalRequisitions > 0 ? Math.round((metrics.rejectedRequisitions / metrics.totalRequisitions) * 100) : 0}%`}
            colorClass="bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-200"
          />
        </div>
      </div>

      {/* Métricas de Solicitudes de Compra */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-gray-800 uppercase tracking-widest pl-2 flex items-center gap-2">
          <ShoppingCart size={20} className="text-indigo-500" />
          Tus Solicitudes de Compra
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
          <MetricCard
            icon={ShoppingCart}
            label="Total Solicitudes"
            value={metrics.totalRequests}
            colorClass="bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-indigo-200"
          />
          <MetricCard
            icon={Clock}
            label="Pendientes"
            value={metrics.pendingRequests}
            subtext={`${metrics.totalRequests > 0 ? Math.round((metrics.pendingRequests / metrics.totalRequests) * 100) : 0}%`}
            colorClass="bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-200"
          />
          <MetricCard
            icon={CheckCircle}
            label="Aprobadas"
            value={metrics.approvedRequests}
            subtext={`${metrics.totalRequests > 0 ? Math.round((metrics.approvedRequests / metrics.totalRequests) * 100) : 0}%`}
            colorClass="bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-200"
          />
          <MetricCard
            icon={XCircle}
            label="Rechazadas"
            value={metrics.rejectedRequests}
            subtext={`${metrics.totalRequests > 0 ? Math.round((metrics.rejectedRequests / metrics.totalRequests) * 100) : 0}%`}
            colorClass="bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-200"
          />
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requisiciones por Estado */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
          <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest mb-6 text-center">Estado de Requisiciones</h3>
          {requisitionsData.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={requisitionsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ estado, count }) => `${estado}: ${count}`}
                  outerRadius={90}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="count"
                  paddingAngle={5}
                >
                  {requisitionsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400 font-bold uppercase tracking-widest text-xs">
              Sin datos para mostrar
            </div>
          )}
        </div>

        {/* Solicitudes por Estado */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
          <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest mb-6 text-center">Estado de Compras</h3>
          {requestsData.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={requestsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ estado, count }) => `${estado}: ${count}`}
                  outerRadius={90}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="count"
                  paddingAngle={5}
                >
                  {requestsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400 font-bold uppercase tracking-widest text-xs">
              Sin datos para mostrar
            </div>
          )}
        </div>
      </div>

      {/* Timeline de últimos 7 días */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
        <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest mb-8 flex items-center justify-center gap-2">
          <TrendingUp size={20} className="text-indigo-500" />
          Actividad Últimos 7 Días
        </h3>
        {timelineData.some(d => d.requisiciones > 0 || d.solicitudes > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 'bold' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 'bold' }} dx={-10} />
              <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
              <Line
                type="monotone"
                dataKey="requisiciones"
                stroke="#3B82F6"
                strokeWidth={4}
                dot={{ fill: '#3B82F6', r: 6, strokeWidth: 0 }}
                activeDot={{ r: 8 }}
                name="Requisiciones"
              />
              <Line
                type="monotone"
                dataKey="solicitudes"
                stroke="#10B981"
                strokeWidth={4}
                dot={{ fill: '#10B981', r: 6, strokeWidth: 0 }}
                activeDot={{ r: 8 }}
                name="Solicitudes"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-400 font-bold uppercase tracking-widest text-xs">
            Sin movimientos en los últimos 7 días
          </div>
        )}
      </div>

      {/* Acciones Rápidas */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20">
        <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest mb-6">Accesos Directos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <a
            href="/dashboard/requisitions"
            className="group p-6 rounded-[2rem] bg-gray-50 border border-gray-100 hover:bg-white hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-900/10 transition-all flex items-center gap-6"
          >
            <div className="w-16 h-16 rounded-[1.5rem] bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform">
              <FileText size={28} />
            </div>
            <div>
              <p className="font-black text-gray-800 text-lg uppercase tracking-tight">Ir a Requisiciones</p>
              <p className="text-sm font-bold text-gray-500">Crear o dar seguimiento</p>
            </div>
          </a>
          <a
            href="/dashboard/purchase-requests"
            className="group p-6 rounded-[2rem] bg-gray-50 border border-gray-100 hover:bg-white hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-900/10 transition-all flex items-center gap-6"
          >
            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform">
              <ShoppingCart size={28} />
            </div>
            <div>
              <p className="font-black text-gray-800 text-lg uppercase tracking-tight">Ir a Compras</p>
              <p className="text-sm font-bold text-gray-500">Solicitar ítems nuevos</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
