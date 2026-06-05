import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { getPendingApprovalsForUser, getApprovalStats, approveOrder, rejectOrder } from '@/services/supabaseClient'
import {
    CheckCircle, XCircle, Clock, FileText,
    AlertCircle, ThumbsUp, ThumbsDown, RefreshCw,
    ShoppingCart, Zap, User, Building,
    MessageSquare, Package, ChevronDown, ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ChiefsDashboard() {
    const { user } = useAuthStore()

    const [loading, setLoading] = useState(true)
    const [approvals, setApprovals] = useState<any[]>([])
    const [stats, setStats] = useState({ pending: 0, approvedMonth: 0, rejectedMonth: 0 })
    const [rejectModal, setRejectModal] = useState<{ open: boolean; approvalId: string; orderNumber: string }>({ open: false, approvalId: '', orderNumber: '' })
    const [rejectReason, setRejectReason] = useState('')
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        if (!user?.role) return
        try {
            setLoading(true)
            const [pendingData, statsData] = await Promise.all([
                getPendingApprovalsForUser(user.role),
                getApprovalStats(user.role)
            ])
            setApprovals(pendingData)
            setStats(statsData)
        } catch (error) {
            console.error('Error loading chiefs dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleExpand = (id: string) => {
        setExpandedCards(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleApprove = async (approvalId: string, orderNumber: string) => {
        if (!user?.id) return
        try {
            setActionLoading(approvalId)
            await approveOrder(approvalId, user.id)
            toast.success(`✅ Orden ${orderNumber} aprobada`)
            await loadData()
        } catch (error) {
            console.error('Error approving:', error)
            toast.error('Error al aprobar la orden')
        } finally {
            setActionLoading(null)
        }
    }

    const openRejectModal = (approvalId: string, orderNumber: string) => {
        setRejectModal({ open: true, approvalId, orderNumber })
        setRejectReason('')
    }

    const handleReject = async () => {
        if (!user?.id || !rejectReason.trim()) {
            toast.error('Debes ingresar un motivo de rechazo')
            return
        }
        try {
            setActionLoading(rejectModal.approvalId)
            await rejectOrder(rejectModal.approvalId, user.id, rejectReason.trim())
            toast.success(`Orden ${rejectModal.orderNumber} rechazada`)
            setRejectModal({ open: false, approvalId: '', orderNumber: '' })
            setRejectReason('')
            await loadData()
        } catch (error) {
            console.error('Error rejecting:', error)
            toast.error('Error al rechazar la orden')
        } finally {
            setActionLoading(null)
        }
    }

    if (loading) return (
        <div className="p-10 text-center">
            <RefreshCw size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-gray-500">Cargando panel de aprobaciones...</p>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Centro de Aprobaciones</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {user?.full_name} — <strong className="text-blue-600">{stats.pending}</strong> {stats.pending === 1 ? 'orden pendiente' : 'órdenes pendientes'}
                    </p>
                </div>
                <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                    <RefreshCw size={16} /> Actualizar
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border-l-4 border-yellow-400 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pendientes</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pending}</p>
                    </div>
                    <Clock size={24} className="text-yellow-400" />
                </div>
                <div className="bg-white rounded-xl border-l-4 border-green-400 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Aprobadas (Mes)</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.approvedMonth}</p>
                    </div>
                    <CheckCircle size={24} className="text-green-400" />
                </div>
                <div className="bg-white rounded-xl border-l-4 border-red-400 p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Rechazadas (Mes)</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.rejectedMonth}</p>
                    </div>
                    <XCircle size={24} className="text-red-400" />
                </div>
            </div>

            {/* Pending Approvals */}
            <div>
                <h2 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
                    <FileText size={18} /> Órdenes Pendientes de Tu Aprobación
                </h2>

                {approvals.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <CheckCircle size={48} className="text-green-200 mx-auto mb-3" />
                        <p className="text-lg font-medium text-gray-900">¡Todo al día!</p>
                        <p className="text-gray-500 text-sm">No tienes órdenes pendientes de aprobación.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {approvals.map((item) => {
                            const isExpanded = expandedCards.has(item.id)
                            return (
                                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                    {/* Card Header — Always Visible Summary */}
                                    <div className="px-6 py-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            {/* Order Type Badge */}
                                            {item.type === 'express' ? (
                                                <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-purple-100 text-purple-700 flex items-center gap-1 flex-shrink-0">
                                                    <Zap size={12} /> EXPRESS
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-blue-100 text-blue-700 flex items-center gap-1 flex-shrink-0">
                                                    <ShoppingCart size={12} /> ESTÁNDAR
                                                </span>
                                            )}

                                            {/* Key Info - One line */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-bold text-gray-900">{item.order_number}</span>
                                                    <span className="text-gray-400">|</span>
                                                    <span className="text-sm text-gray-600 flex items-center gap-1">
                                                        <User size={13} className="text-gray-400" /> {item.requester}
                                                    </span>
                                                    <span className="text-gray-400">|</span>
                                                    <span className="text-sm text-gray-600 flex items-center gap-1">
                                                        <Building size={13} className="text-gray-400" /> {item.department}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Amount - Prominent */}
                                            <div className="text-right flex-shrink-0 mr-4">
                                                <p className="text-lg font-bold text-blue-700">
                                                    Q {item.total_amount?.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                                </p>
                                                {item.type === 'standard' && !item.price_confirmed_at && (
                                                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider -mt-1">
                                                        Monto Estimado
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-400">
                                                    {new Date(item.created_at).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action Buttons - Always Visible */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => openRejectModal(item.id, item.order_number)}
                                                disabled={actionLoading === item.id}
                                                className="px-4 py-2 border-2 border-red-200 text-red-600 rounded-lg font-semibold text-sm hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50"
                                                title="Rechazar orden"
                                            >
                                                <ThumbsDown size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleApprove(item.id, item.order_number)}
                                                disabled={actionLoading === item.id}
                                                className="px-5 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                                                title="Aprobar orden"
                                            >
                                                {actionLoading === item.id ? <RefreshCw size={15} className="animate-spin" /> : <ThumbsUp size={15} />}
                                                Aprobar
                                            </button>
                                            <button
                                                onClick={() => toggleExpand(item.id)}
                                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Ver detalles"
                                            >
                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-medium">Solicitante</p>
                                                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{item.requester}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-medium">Departamento</p>
                                                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{item.department}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-medium">Proveedor(es)</p>
                                                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{item.supplier}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-medium">Fecha de Solicitud</p>
                                                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                                        {new Date(item.created_at).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Payment Method & Reference */}
                                            {item.payment_method && (
                                                <div className={`mb-4 border rounded-lg p-3 flex items-center gap-3 ${item.type === 'express' ? 'bg-purple-50 border-purple-100' : 'bg-blue-50 border-blue-100'}`}>
                                                    <Zap size={16} className={item.type === 'express' ? 'text-purple-500' : 'text-blue-500'} />
                                                    <div className="text-sm">
                                                        <span className={item.type === 'express' ? 'text-purple-700 font-medium' : 'text-blue-700 font-medium'}>Método de Pago: </span>
                                                        <span className={`${item.type === 'express' ? 'text-purple-900' : 'text-blue-900'} font-bold capitalize`}>
                                                            {item.payment_method.replace('_', ' ')}
                                                            {item.payment_reference && (
                                                                <span className="ml-2 px-2 py-0.5 bg-white border border-current rounded text-[10px]">
                                                                    Ref: {item.payment_reference}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Justification */}
                                            {item.justification && (
                                                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 mb-4">
                                                    <p className="text-xs text-yellow-700 font-medium flex items-center gap-1 mb-1">
                                                        <MessageSquare size={12} /> JUSTIFICACIÓN
                                                    </p>
                                                    <p className="text-sm text-gray-800">{item.justification}</p>
                                                </div>
                                            )}

                                            {/* Quotation link for standard orders */}
                                            {item.type === 'standard' && item.quotation_url && (
                                                <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <FileText size={16} className="text-blue-500 flex-shrink-0" />
                                                        <div className="text-sm">
                                                            <span className="text-blue-700 font-medium">Cotización Adjunta: </span>
                                                            <span className="text-blue-900 border-b border-blue-300 font-bold capitalize">Disponible para revisión</span>
                                                        </div>
                                                    </div>
                                                    <a
                                                        href={item.quotation_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 flex items-center gap-1"
                                                    >
                                                        <FileText size={14} /> Ver Cotización
                                                    </a>
                                                </div>
                                            )}

                                            {/* Items Table */}
                                            {item.items && item.items.length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-xs text-gray-500 uppercase font-medium flex items-center gap-1 mb-2">
                                                        <Package size={12} /> Artículos Solicitados ({item.items.length})
                                                    </p>
                                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                                                                    <th className="px-4 py-2 text-left font-medium">Artículo</th>
                                                                    {item.type === 'express' && (
                                                                        <th className="px-4 py-2 text-left font-medium">Proveedor</th>
                                                                    )}
                                                                    <th className="px-4 py-2 text-center font-medium">Cantidad</th>
                                                                    <th className="px-4 py-2 text-center font-medium">Unidad</th>
                                                                    <th className="px-4 py-2 text-right font-medium">P. Unitario</th>
                                                                    <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {item.items.map((it: any, idx: number) => {
                                                                    const unitPrice = it.unit_price || it.estimated_price || 0
                                                                    const subtotal = it.subtotal || (it.quantity || 0) * unitPrice
                                                                    const isPackage = ['caja', 'paquete', 'docena'].includes(it.unit)
                                                                    const totalUnits = isPackage && it.units_per_package > 1
                                                                        ? (it.quantity * it.units_per_package)
                                                                        : null
                                                                    const pricePerUnit = isPackage && it.units_per_package > 1
                                                                        ? (unitPrice / it.units_per_package)
                                                                        : null
                                                                    return (
                                                                        <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                                                                            <td className="px-4 py-2.5">
                                                                                <p className="text-gray-900 font-medium">{it.description || 'Artículo'}</p>
                                                                                {totalUnits && (
                                                                                    <p className="text-xs text-blue-600 mt-0.5">
                                                                                        {it.quantity} {it.unit}{it.quantity > 1 ? 's' : ''} × {it.units_per_package} uds = {totalUnits} uds totales
                                                                                        {pricePerUnit !== null && <span className="text-green-600 ml-2">(Q {pricePerUnit.toFixed(2)}/ud)</span>}
                                                                                    </p>
                                                                                )}
                                                                            </td>
                                                                            {item.type === 'express' && (
                                                                                <td className="px-4 py-2.5 text-gray-600 text-xs">{it.supplier_name || '—'}</td>
                                                                            )}
                                                                            <td className="px-4 py-2.5 text-center text-gray-600">{it.quantity}</td>
                                                                            <td className="px-4 py-2.5 text-center text-gray-600 capitalize">{it.unit || 'unidad'}</td>
                                                                            <td className="px-4 py-2.5 text-right text-gray-600">Q {unitPrice.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                                                                            <td className="px-4 py-2.5 text-right font-semibold text-gray-900">Q {subtotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</td>
                                                                        </tr>
                                                                    )
                                                                })}
                                                            </tbody>
                                                            <tfoot>
                                                                <tr className="bg-gray-50 border-t-2 border-gray-200">
                                                                    <td colSpan={item.type === 'express' ? 4 : 3} className="px-4 py-2.5 text-right font-bold text-gray-700 uppercase text-xs">Total Estimado</td>
                                                                    <td colSpan={2} className="px-4 py-2.5 text-right font-bold text-lg text-blue-700">
                                                                        Q {item.total_amount?.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                                                    </td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Receipt Files / Invoices — Express only */}
                                            {item.type === 'express' && item.receipt_files && item.receipt_files.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-medium flex items-center gap-1 mb-2">
                                                        <FileText size={12} /> Facturas / Recibos Adjuntos ({item.receipt_files.length})
                                                    </p>
                                                    <div className="flex flex-wrap gap-3">
                                                        {item.receipt_files.map((fileUrl: string, idx: number) => {
                                                            const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileUrl)
                                                            return (
                                                                <a
                                                                    key={idx}
                                                                    href={fileUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="group relative overflow-hidden rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all"
                                                                >
                                                                    {isImage ? (
                                                                        <img src={fileUrl} alt={`Factura ${idx + 1}`} className="h-24 w-24 object-cover" />
                                                                    ) : (
                                                                        <div className="h-24 w-24 bg-red-50 flex flex-col items-center justify-center">
                                                                            <FileText size={24} className="text-red-500" />
                                                                            <span className="text-xs text-red-600 font-medium mt-1">PDF</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                        <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Ver</span>
                                                                    </div>
                                                                </a>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* No invoices warning for express */}
                                            {item.type === 'express' && (!item.receipt_files || item.receipt_files.length === 0) && (
                                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
                                                    <AlertCircle size={16} className="text-orange-500 flex-shrink-0" />
                                                    <p className="text-sm text-orange-700">
                                                        <strong>Sin facturas adjuntas.</strong> El solicitante no ha subido comprobantes aún.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="text-blue-500 flex-shrink-0" size={20} />
                <p className="text-sm text-blue-700">
                    <strong>Nota:</strong> Las aprobaciones son definitivas. Si rechazas una orden, volverá al solicitante. Cuando los 3 jefes aprueben, la orden se desbloqueará automáticamente.
                </p>
            </div>

            {/* Reject Modal */}
            {rejectModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 bg-red-50 border-b border-red-100">
                            <h3 className="font-bold text-lg text-red-800 flex items-center gap-2">
                                <ThumbsDown size={20} /> Rechazar {rejectModal.orderNumber}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-gray-600 text-sm">
                                Esta acción es definitiva. La orden será devuelta al solicitante.
                            </p>
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Motivo del rechazo *</label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none resize-none"
                                    rows={3}
                                    placeholder="Ej: Monto excede el presupuesto, proveedor no autorizado..."
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                            <button
                                onClick={() => setRejectModal({ open: false, approvalId: '', orderNumber: '' })}
                                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectReason.trim() || actionLoading === rejectModal.approvalId}
                                className="px-5 py-2 text-sm bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {actionLoading === rejectModal.approvalId ? <RefreshCw size={14} className="animate-spin" /> : <ThumbsDown size={14} />}
                                Confirmar Rechazo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
