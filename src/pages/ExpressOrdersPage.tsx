import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { getExpressOrders } from '@/services/supabaseClient'
import { toast } from 'react-hot-toast'

export default function ExpressOrdersPage() {
    const navigate = useNavigate()
    const { license } = useAuthStore()

    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [dateRange, setDateRange] = useState({ start: '', end: '' })

    useEffect(() => {
        if (license) {
            loadOrders()
        }
    }, [license])

    const loadOrders = async () => {
        try {
            setLoading(true)
            const data = await getExpressOrders(license!.id)
            setOrders(data || [])
        } catch (error) {
            console.error('Error loading express orders:', error)
            toast.error('Error al cargar órdenes express')
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const config: any = {
            draft: { color: 'bg-gray-100 text-gray-800', label: 'Borrador' },
            pending_approval: { color: 'bg-yellow-100 text-yellow-800', label: 'En Revisión' },
            approved: { color: 'bg-green-100 text-green-800', label: 'Aprobada' },
            rejected: { color: 'bg-red-100 text-red-800', label: 'Rechazada' },
            in_purchase: { color: 'bg-blue-100 text-blue-800', label: 'En Compra' },
            purchased: { color: 'bg-indigo-100 text-indigo-800', label: 'Comprada' },
            completed: { color: 'bg-purple-100 text-purple-800', label: 'Completada' },
            cancelled: { color: 'bg-gray-200 text-gray-500', label: 'Cancelada' },
        }
        const style = config[status] || config.draft
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${style.color}`}>
                {style.label}
            </span>
        )
    }

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.creator?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = filterStatus === 'all' || order.status === filterStatus

        // Date filter
        const orderDate = new Date(order.created_at)
        const startDate = dateRange.start ? new Date(dateRange.start) : null
        const endDate = dateRange.end ? new Date(dateRange.end) : null
        if (endDate) endDate.setHours(23, 59, 59, 999)

        const matchesDate = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate)

        return matchesSearch && matchesStatus && matchesDate
    })

    // Calculate totals
    const totalEstimated = filteredOrders.reduce((sum, o) => sum + (o.estimated_total || 0), 0)
    const totalReal = filteredOrders.reduce((sum, o) => sum + (o.real_total || 0), 0)

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Órdenes Express</h1>
                    <p className="text-gray-500">Gestión de compras ágiles y caja chica (Límite Q 1,100)</p>
                </div>
                <button
                    onClick={() => navigate('/dashboard/express-orders/new')}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    Nueva Orden Express
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por número o creador..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-base pl-10 w-full"
                        />
                    </div>

                    <div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="input-base w-full"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="draft">Borrador</option>
                            <option value="pending_approval">En Revisión</option>
                            <option value="approved">Aprobada</option>
                            <option value="rejected">Rechazada</option>
                            <option value="completed">Completada</option>
                        </select>
                    </div>

                    <div className="flex gap-2 items-center">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="input-base w-full text-sm"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="input-base w-full text-sm"
                        />
                    </div>

                    <div className="flex items-center justify-end">
                        {(filterStatus !== 'all' || searchTerm || dateRange.start) && (
                            <button
                                onClick={() => {
                                    setSearchTerm('')
                                    setFilterStatus('all')
                                    setDateRange({ start: '', end: '' })
                                }}
                                className="text-sm text-red-600 hover:text-red-800 underline"
                            >
                                Limpiar Filtros
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Total Estimado (Filtrado)</p>
                    <p className="text-2xl font-bold text-gray-900">Q {totalEstimated.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Total Real (Filtrado)</p>
                    <p className="text-2xl font-bold text-blue-600">Q {totalReal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Órdenes Mostradas</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredOrders.length}</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orden</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creador</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Est.</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Real</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                    Cargando órdenes...
                                </td>
                            </tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                    No se encontraron órdenes express con los filtros actuales.
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-medium text-gray-900">{order.order_number}</div>
                                        <div className="text-xs text-gray-500">{order.payment_method}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{order.creator?.full_name}</div>
                                        <div className="text-xs text-gray-500">{order.department}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(order.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-700">
                                        Q {order.estimated_total?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-blue-700">
                                        {order.real_total ? `Q ${order.real_total.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => navigate(`/dashboard/express-orders/${order.id}`)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            Ver Detalle
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
