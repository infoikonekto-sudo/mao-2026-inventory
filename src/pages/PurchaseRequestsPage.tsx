import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, CheckCircle, XCircle, Clock, Download, FileText, ShoppingCart, User, Building2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { getPurchaseRequests, createPurchaseRequest, getNextPurchaseRequestNumber, updatePurchaseRequestStatus, sendPurchaseRequestStatusNotification } from '@/services/supabaseClient'
import { usePurchaseRequestRealtime } from '@/hooks/usePurchaseRequestRealtime'
import { canUserCreatePurchaseRequest } from '@/utils/roleActions'
import { exportPurchaseRequestsToCSV } from '@/utils/exportUtils'
import toast from 'react-hot-toast'

const statusLabels = {
  pendiente: 'Pendiente',
  en_revision: 'En Revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  convertida_orden: 'Convertida a Orden',
  listo_para_recoger: 'Listo para Recoger',
}

export default function PurchaseRequestsPage() {
  const { user, license } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
  const [rejectComments, setRejectComments] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [formData, setFormData] = useState({
    justification: '',
    estimated_amount: '',
  })
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)

  const canCreate = user ? canUserCreatePurchaseRequest(user.role) : false
  const _canApprove = user && (user.role === 'jefe_compras' || user.role === 'admin')

  const handleApprovalChange = async (requestId: string, newStatus: 'aprobada' | 'rechazada' | 'en_revision' | 'listo_para_recoger', _comments?: string) => {
    try {
      setUpdatingId(requestId)

      // Obtener la solicitud actual para enviar notificación
      const req = purchaseRequests.find(r => r.id === requestId)

      await updatePurchaseRequestStatus(requestId, newStatus)

      // Enviar notificación por email
      if (req?.users?.email && license) {
        await sendPurchaseRequestStatusNotification(
          requestId,
          req.request_number,
          newStatus,
          req.users.email,
          req.users.full_name,
          license.id
        )
      }

      toast.success(`Solicitud ${newStatus === 'aprobada' ? 'aprobada' : newStatus === 'rechazada' ? 'rechazada' : 'enviada a revisión'} exitosamente`)

      // Actualizar estado local inmediatamente (sin esperar realtime)
      setPurchaseRequests(prev =>
        prev.map(r =>
          r.id === requestId ? { ...r, status: newStatus } : r
        )
      )

      setShowRejectModal(null)
      setRejectComments('')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar la solicitud')
    } finally {
      setUpdatingId(null)
    }
  }

  useEffect(() => {
    const loadRequests = async () => {
      try {
        console.log('PurchaseRequestsPage.loadRequests: iniciando', { user, license })
        if (user && license) {
          // Si es jefe_compras o admin, ver TODAS las solicitudes
          // Si es profesor, ver solo las suyas
          const shouldViewAll = user.role === 'jefe_compras' || user.role === 'admin' || user.role === 'super_admin'
          const userIdToPass = shouldViewAll ? undefined : user.id
          console.log('PurchaseRequestsPage.loadRequests: parámetros', {
            licenseId: license.id,
            userId: userIdToPass,
            shouldViewAll,
            userRole: user.role,
            userData: { id: user.id, email: user.email }
          })
          const data = await getPurchaseRequests(license.id, userIdToPass)
          console.log('PurchaseRequestsPage.loadRequests: datos recibidos', { cantidad: data?.length, data })
          setPurchaseRequests(data || [])
        } else {
          console.log('PurchaseRequestsPage.loadRequests: usuario o licencia no disponibles', { user: !!user, license: !!license })
        }
      } catch (error) {
        console.error('PurchaseRequestsPage.loadRequests: error', error)
        setPurchaseRequests([])
      } finally {
        setLoading(false)
      }
    }
    loadRequests()
  }, [user, license])

  // Escuchar cambios en tiempo real - Actualiza fila específica sin recargar TODO
  const handlePurchaseRequestUpdate = useCallback((requestId: string, updatedFields: any) => {
    setPurchaseRequests(prev =>
      prev.map(req =>
        req.id === requestId
          ? { ...req, ...updatedFields }
          : req
      )
    )
  }, [])

  usePurchaseRequestRealtime(user?.license_id || '', user?.id, handlePurchaseRequestUpdate)

  const filtered = purchaseRequests.filter(req => {
    const matchSearch = req.request_number?.includes(searchTerm) || req.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = !filterStatus || req.status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total: purchaseRequests.length,
    pendientes: purchaseRequests.filter(r => r.status === 'pendiente').length,
    aprobadas: purchaseRequests.filter(r => r.status === 'aprobada').length,
    totalAmount: purchaseRequests.reduce((sum: number, r: any) => sum + (r.estimated_amount || 0), 0),
  }

  if (loading) {
    return <div className="text-center py-10">Cargando solicitudes de compra...</div>
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.justification.trim()) {
      toast.error('Ingresa la justificación')
      return
    }

    if (!formData.estimated_amount || parseFloat(formData.estimated_amount) <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    // Validar que el usuario esté autenticado
    if (!user || !user.id) {
      toast.error('Error: Usuario no autenticado. Por favor recarga la página.')
      return
    }

    if (!license || !license.id) {
      toast.error('Error: Licencia no válida. Por favor recarga la página.')
      return
    }

    try {
      setSubmitting(true)
      const nextNumber = await getNextPurchaseRequestNumber(license.id)

      console.log('Creando solicitud de compra con:', {
        license_id: license.id,
        user_id: user.id,
        request_number: nextNumber,
      })

      await createPurchaseRequest({
        license_id: license.id,
        user_id: user.id,
        request_number: nextNumber,
        justification: formData.justification,
        estimated_amount: parseFloat(formData.estimated_amount),
        attachmentFile: attachmentFile || undefined,
      })

      toast.success('Solicitud de compra creada exitosamente')
      setFormData({ justification: '', estimated_amount: '' })
      setAttachmentFile(null)
      setShowForm(false)

      // Recargar solicitudes
      const shouldViewAll = user.role === 'jefe_compras' || user.role === 'admin' || user.role === 'super_admin'
      const data = await getPurchaseRequests(license.id, shouldViewAll ? undefined : user.id)
      setPurchaseRequests(data || [])
    } catch (error) {
      console.error('Error completo:', error)
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
      toast.error(`Error al crear la solicitud de compra: ${errorMsg}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1800px] mx-auto animate-in fade-in duration-500">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 md:p-3 bg-emerald-600 text-white rounded-[1rem] md:rounded-[1.5rem] shadow-xl shadow-emerald-200">
              <ShoppingCart size={24} className="md:w-8 md:h-8" />
            </div>
            Solicitudes de Compra
          </h1>
          <p className="text-gray-500 font-medium mt-1 md:mt-2 text-sm md:text-base">Gestiona solicitudes de compra de nuevos artículos externos</p>
        </div>
      </div>

      {/* Premium Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-gradient-to-br from-white to-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50 shadow-xl shadow-blue-100/20 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02]">
          <span className="text-[10px] md:text-xs font-black text-blue-400 uppercase tracking-widest mb-1 md:mb-2">Total Solicitudes</span>
          <span className="text-3xl md:text-4xl font-black text-blue-600">{stats.total}</span>
        </div>
        <div className="bg-gradient-to-br from-white to-amber-50/50 p-6 rounded-[2rem] border border-amber-100/50 shadow-xl shadow-amber-100/20 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02]">
          <span className="text-[10px] md:text-xs font-black text-amber-500 uppercase tracking-widest mb-1 md:mb-2">Pendientes</span>
          <span className="text-3xl md:text-4xl font-black text-amber-500">{stats.pendientes}</span>
        </div>
        <div className="bg-gradient-to-br from-white to-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100/50 shadow-xl shadow-emerald-100/20 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02]">
          <span className="text-[10px] md:text-xs font-black text-emerald-500 uppercase tracking-widest mb-1 md:mb-2">Aprobadas</span>
          <span className="text-3xl md:text-4xl font-black text-emerald-500">{stats.aprobadas}</span>
        </div>
        <div className="bg-gradient-to-br from-white to-purple-50/50 p-6 rounded-[2rem] border border-purple-100/50 shadow-xl shadow-purple-100/20 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02]">
          <span className="text-[10px] md:text-xs font-black text-purple-500 uppercase tracking-widest mb-1 md:mb-2">Monto Total</span>
          <span className="text-3xl md:text-4xl font-black text-purple-600 truncate max-w-full" title={`Q ${stats.totalAmount.toLocaleString('es-GT')}`}>
            Q {stats.totalAmount >= 1000000 ? (stats.totalAmount / 1000000).toFixed(1) + 'M' : stats.totalAmount >= 1000 ? (stats.totalAmount / 1000).toFixed(1) + 'k' : stats.totalAmount.toLocaleString('es-GT')}
          </span>
        </div>
      </div>

      {/* Premium Filters */}
      <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col md:flex-row gap-4 items-center">
        <div className="w-full md:flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por número o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-emerald-100 transition-all text-gray-700"
          />
        </div>

        <div className="w-full md:w-auto flex gap-3 overflow-x-auto pb-2 md:pb-0">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            className="flex-1 md:flex-none bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-emerald-100 text-gray-600 outline-none min-w-[150px]"
          >
            <option value="">Estado: Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_revision">En Revisión</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
            <option value="convertida_orden">Convertida a Orden</option>
          </select>

          <button
            onClick={() => exportPurchaseRequestsToCSV(purchaseRequests)}
            className="flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
            title="Exportar a CSV"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {canCreate && (
            <button
              onClick={() => setShowForm(!showForm)}
              className={`flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shrink-0 ${showForm ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-emerald-600 text-white shadow-emerald-200 hover:scale-[1.02] active:scale-95'}`}
            >
              {showForm ? <XCircle size={18} /> : <Plus size={18} />}
              <span className="hidden sm:inline">{showForm ? 'Cancelar' : 'Nueva Solicitud'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Formulario Premium */}
      {showForm && (
        <form onSubmit={handleCreateRequest} className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl shadow-emerald-900/5 overflow-hidden animate-in slide-in-from-top-4 duration-500">
          <div className="p-6 md:p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-xl font-black text-gray-800 tracking-tight">Nueva Solicitud de Compra Externa</h3>
          </div>
          
          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Descripción y Justificación</label>
                <textarea
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  placeholder="Describe qué necesitas comprar y detalladamente por qué..."
                  rows={4}
                  className="input-base resize-none"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Monto Estimado (Q)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Q</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.estimated_amount}
                    onChange={(e) => setFormData({ ...formData, estimated_amount: e.target.value })}
                    placeholder="0.00"
                    className="input-base pl-10 text-lg font-bold text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Cotización o Imagen (Opcional)</label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-center group cursor-pointer overflow-hidden">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('El archivo excede el tamaño máximo de 5MB');
                          e.target.value = '';
                          return;
                        }
                        setAttachmentFile(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {!attachmentFile ? (
                    <div className="space-y-1">
                      <FileText size={24} className="mx-auto text-gray-400 group-hover:text-emerald-500 transition-colors" />
                      <p className="text-sm font-medium text-gray-600">Haz clic o arrastra un archivo aquí</p>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">PDF, PNG, JPG (Máx 5MB)</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 p-2 bg-emerald-50 rounded-xl">
                      <FileText size={20} className="text-emerald-600" />
                      <span className="font-bold text-emerald-900 truncate max-w-[200px]">{attachmentFile.name}</span>
                    </div>
                  )}
                </div>
                {attachmentFile && (
                  <button
                    type="button"
                    onClick={() => setAttachmentFile(null)}
                    className="mt-2 text-xs font-black uppercase tracking-widest text-red-500 hover:text-red-700 block w-full text-center"
                  >
                    Quitar archivo adjunto
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-gray-500 hover:bg-gray-100 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white bg-emerald-600 shadow-xl shadow-emerald-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              {submitting ? 'Creando Solicitud...' : 'Enviar Solicitud Oficial'}
            </button>
          </div>
        </form>
      )}

      {/* Premium Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.length > 0 ? filtered.map((req) => (
          <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-gray-50 text-[10px] font-black text-gray-500 rounded-full uppercase tracking-widest">{req.request_number}</span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${req.status === 'aprobada' ? 'bg-emerald-100 text-emerald-700' : req.status === 'rechazada' ? 'bg-red-100 text-red-700' : req.status === 'pendiente' ? 'bg-amber-100 text-amber-700' : req.status === 'convertida_orden' ? 'bg-purple-100 text-purple-700' : req.status === 'listo_para_recoger' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                {statusLabels[req.status as keyof typeof statusLabels] || req.status}
              </span>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <p className="font-bold text-gray-800 line-clamp-3 text-sm">{req.justification}</p>
              </div>
              
              <div className="flex items-center gap-3 py-3 border-t border-b border-gray-50">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  <User size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700">{req.users?.full_name || 'Desconocido'}</p>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase">
                    <Building2 size={10} />
                    {req.users?.department || 'Sin Depto'}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-end pt-2">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monto Estimado</p>
                  <p className="text-xl font-black text-gray-900">Q {(req.estimated_amount || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
                </div>
                
                <button
                  onClick={() => setSelectedRequest(req)}
                  className="w-10 h-10 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-full flex items-center justify-center transition-colors"
                  title="Ver detalles completos"
                >
                  <Search size={16} />
                </button>
              </div>

              {_canApprove && (req.status === 'pendiente' || req.status === 'en_revision') && (
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-50">
                  <button
                    onClick={() => handleApprovalChange(req.id, 'aprobada')}
                    disabled={updatingId === req.id}
                    className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={14} />
                    Aprobar
                  </button>
                  <button
                    onClick={() => setShowRejectModal(req.id)}
                    disabled={updatingId === req.id}
                    className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    Rechazar
                  </button>
                  {req.status === 'pendiente' && (
                    <button
                      onClick={() => handleApprovalChange(req.id, 'en_revision')}
                      disabled={updatingId === req.id}
                      className="col-span-2 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Clock size={14} />
                      Marcar en Revisión
                    </button>
                  )}
                </div>
              )}
              {_canApprove && (req.status === 'aprobada' || req.status === 'convertida_orden') && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <button
                    onClick={() => handleApprovalChange(req.id, 'listo_para_recoger')}
                    disabled={updatingId === req.id}
                    className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={14} />
                    Listo para recoger
                  </button>
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-6 bg-gray-50 rounded-full text-gray-300">
              <ShoppingCart size={48} />
            </div>
            <div>
              <p className="text-lg font-black text-gray-800">No hay solicitudes</p>
              <p className="text-gray-500 font-medium">No se encontraron solicitudes de compra con los filtros actuales.</p>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Rechazar Solicitud</h3>
            <p className="text-gray-600 mb-4">¿Estás seguro de que deseas rechazar esta solicitud de compra?</p>
            <textarea
              placeholder="Escribe un comentario sobre el rechazo (opcional)..."
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              rows={3}
              className="input-base mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleApprovalChange(showRejectModal, 'rechazada', rejectComments)}
                disabled={updatingId !== null}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {updatingId ? 'Procesando...' : 'Confirmar Rechazo'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null)
                  setRejectComments('')
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Detalles de Solicitud de Compra</h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Número:</label>
                  <p className="text-gray-900">{selectedRequest.request_number}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Usuario:</label>
                  <p className="text-gray-900">{selectedRequest.users?.full_name || 'Sin asignar'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Estado:</label>
                  <span className={`px-3 py-1 rounded-full text-white text-sm font-medium inline-block ${selectedRequest.status === 'aprobada' ? 'bg-green-500' :
                    selectedRequest.status === 'rechazada' ? 'bg-red-500' :
                      selectedRequest.status === 'pendiente' ? 'bg-yellow-500' :
                        selectedRequest.status === 'en_revision' ? 'bg-blue-500' :
                          selectedRequest.status === 'convertida_orden' ? 'bg-purple-500' : 'bg-gray-500'
                    }`}>
                    {statusLabels[selectedRequest.status as keyof typeof statusLabels] || selectedRequest.status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Departamento:</label>
                  <p className="text-gray-900">{selectedRequest.users?.department || 'Sin información'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600">Justificación:</label>
                <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded">{selectedRequest.justification || 'Sin descripción'}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600">Monto Estimado:</label>
                <p className="text-gray-900">Q {selectedRequest.estimated_amount?.toLocaleString('es-GT') || '0.00'}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600">Fecha de Creación:</label>
                <p className="text-gray-900">{new Date(selectedRequest.created_at).toLocaleString('es-GT')}</p>
              </div>

              {/* Attachment Section */}
              {selectedRequest.attachment_url && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" />
                    Archivo Adjunto
                  </h4>
                  <a
                    href={selectedRequest.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Download size={16} />
                    Descargar Cotización/Imagen
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setSelectedRequest(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
