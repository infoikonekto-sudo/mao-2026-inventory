import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase, getPurchaseOrders, updatePurchaseOrderStatus, createPurchaseOrderFromRequest, getPurchaseRequests, getSuppliers, initializeStorageBuckets, getBudgets, getCostCenters, uploadInvoiceFile, updatePurchaseOrderPrice, sendOrderToReview, approveOrder, rejectOrder, getOrderApprovals, uploadQuotationFile, notifyOrderPickup, confirmOrderDelivery, updatePurchaseOrderFull, sendTripleApprovalNotifications } from '@/services/supabaseClient'
import { generatePurchaseOrderPDF } from '@/utils/pdfGenerator'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { exportPurchaseOrdersToCSV } from '@/utils/exportUtils'
import { toast } from 'react-hot-toast'
import { Package, CheckCircle, Download, Lock, Calculator, Eye, FileText, Upload, AlertCircle, Clock, Truck, Send, Bell, PenTool, ShieldCheck, Check, X } from 'lucide-react'
import { PURCHASE_ORDER_STATUS, USER_ROLES, ROLE_LABELS } from '@/constants'

// Interfaces actualizadas
interface PurchaseOrder {
  id: string
  order_number: string
  supplier_id: string
  status: string
  total_amount: number
  delivery_date: string
  created_at: string
  invoice_url?: string
  price_confirmed_at?: string
  payment_method?: string
  internal_notes?: string
  is_locked?: boolean
  suppliers: any
  purchase_requests: any
  quotation_url?: string
  delivered_signature_url?: string
  delivered_at?: string
  delivered_to_name?: string
}

interface PurchaseRequest {
  id: string
  request_number: string
  justification: string
  estimated_amount: number
  status: string
  cost_center_id?: string
  users: {
    full_name: string
    department: string
  }
}

interface Budget {
  id: string
  name: string
  total_amount: number
  spent_amount: number
  remaining_amount: number
  category: string
  status: string
}

export default function PurchaseOrdersPage() {
  const { user, license } = useAuthStore()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [costCenters, setCostCenters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  // const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)  // TODO: for save button

  // State del Formulario
  const [selectedRequest, setSelectedRequest] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [selectedBudget, setSelectedBudget] = useState('')
  const [selectedCostCenter, setSelectedCostCenter] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('credito')
  const [paymentReference, setPaymentReference] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [quotationFile, setQuotationFile] = useState<File | null>(null)

  // Signature Pad State
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [deliveryReceivedBy, setDeliveryReceivedBy] = useState('')
  const [isProcessingDelivery, setIsProcessingDelivery] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  // drawing functions
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const { offsetX, offsetY } = getCoordinates(e, canvas)
    ctx.beginPath()
    ctx.moveTo(offsetX, offsetY)
    setHasSignature(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { offsetX, offsetY } = getCoordinates(e, canvas)
    ctx.lineTo(offsetX, offsetY)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    let clientX, clientY
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }
    const rect = canvas.getBoundingClientRect()
    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top
    }
  }

  // Modales
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [editedOrder, setEditedOrder] = useState<any>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  // Approval System State
  const [approvals, setApprovals] = useState<any[]>([])
  const [loadingApprovals, setLoadingApprovals] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  const isJefeCompras = user?.role === 'jefe_compras'
  const isFinanzas = user?.role === 'finanzas'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    void initializeStorageBuckets()
    loadData()
  }, [])

  const handleRealtimeChange = useCallback(async () => {
    await loadData()
  }, [])

  useRealtimeData('purchase_orders', user?.license_id || '', handleRealtimeChange)

  async function loadData() {
    if (!license?.id) return
    try {
      setLoading(true)
      const [ordersData, requestsData, suppliersData, budgetsData, costCentersData] = await Promise.all([
        getPurchaseOrders(license.id),
        getPurchaseRequests(license.id),
        getSuppliers(license.id),
        getBudgets(license.id),
        getCostCenters(license.id)
      ])

      setOrders(ordersData || [])
      setRequests(requestsData?.filter((r: any) => r.status === 'aprobada') || [])
      setSuppliers(suppliersData || [])
      setBudgets(budgetsData?.filter((b: any) => b.status === 'activo') || [])
      setCostCenters(costCentersData?.filter((cc: any) => cc.is_active) || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedRequest) {
      const req = requests.find(r => r.id === selectedRequest)
      if (req) {
        setInternalNotes(prev => prev ? prev : req.justification) // Solo si está vacío
        if (req.cost_center_id) {
          setSelectedCostCenter(req.cost_center_id)
        }
      }
    }
  }, [selectedRequest, requests])

  // Permission helpers
  const canEditPurchaseOrder = (po: any) => {
    if (!po) return false
    // Si tiene monto final Y factura, solo finanzas/admin puede editar
    if (po.total_amount && po.invoice_url) {
      return isFinanzas || isAdmin
    }
    // Sino, jefe_compras y admin pueden editar
    return isJefeCompras || isAdmin
  }

  const isOrderLocked = (po: any) => {
    if (!po || !user) return false
    // New logic: Trust the DB flag first, then fallback to legacy logic
    if (po.is_locked !== undefined && po.is_locked) return true

    // Legacy logic (fallback)
    return (po.total_amount > 0 && po.invoice_url && !isFinanzas && !isAdmin) || !!po.delivered_at
  }

  // Status change handler
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updatePurchaseOrderStatus(orderId, newStatus)
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, status: newStatus } : o
      ))
      toast.success('Estado actualizado correctamente')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Error al actualizar estado')
    }
  }

  // Save order changes handler
  const handleSaveOrderChanges = async () => {
    if (!selectedOrder || !editedOrder) return

    try {
      setSavingOrder(true)

      // Guardar estado si cambió
      if (editedOrder.status && editedOrder.status !== selectedOrder.status) {
        await updatePurchaseOrderStatus(selectedOrder.id, editedOrder.status)
      }

      // Guardar precio si cambió
      if (editedOrder.total_amount !== undefined && editedOrder.total_amount !== selectedOrder.total_amount) {
        await updatePurchaseOrderPrice(
          selectedOrder.id,
          editedOrder.total_amount,
          selectedOrder.invoice_url || ''
        )
        // FIX: Actualizar el estado local para que la subida de factura tenga el dato fresco
        selectedOrder.total_amount = editedOrder.total_amount;
      }

      // Guardar referencia si cambió
      if (editedOrder.payment_reference !== undefined && editedOrder.payment_reference !== selectedOrder.payment_reference) {
        await updatePurchaseOrderFull(selectedOrder.id, {
          payment_reference: editedOrder.payment_reference
        })
      }

      toast.success('✅ Cambios guardados correctamente')
      setEditedOrder(null)
      await loadData()

      // Actualizar selectedOrder con los nuevos datos
      const updatedOrder = orders.find(o => o.id === selectedOrder.id)
      if (updatedOrder) {
        setSelectedOrder(updatedOrder)
      }
    } catch (error) {
      console.error('Error saving changes:', error)
      toast.error('Error al guardar cambios')
    } finally {
      setSavingOrder(false)
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedRequest || !selectedSupplier || !deliveryDate) {
      toast.error('Por favor completa los campos obligatorios')
      return
    }

    try {
      setSubmitting(true)

      let quotationUrl = ''
      if (quotationFile) {
        toast.loading('Subiendo cotización...')
        quotationUrl = await uploadQuotationFile(quotationFile)
      }

      const createdOrder = await createPurchaseOrderFromRequest({
        license_id: license!.id,
        purchase_request_id: selectedRequest,
        supplier_id: selectedSupplier,
        delivery_date: deliveryDate,
        budget_id: selectedBudget || null,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        internal_notes: internalNotes,
        quotation_url: quotationUrl
      })

      // Obtener nombre del proveedor
      const supplier = suppliers.find(s => s.id === selectedSupplier)
      const supplierName = supplier?.name || 'Proveedor'

      // Enviar notificaciones a los jefes
      if (createdOrder?.id) {
        const appUrl = window.location.origin
        try {
          console.log('Enviando notificaciones a jefes...', {
            order_id: createdOrder.id,
            order_number: createdOrder.order_number,
            total_amount: createdOrder.total_amount
          })
          await sendTripleApprovalNotifications({
            id: createdOrder.id,
            order_number: createdOrder.order_number || '',
            total_amount: createdOrder.total_amount || 0,
            supplier_name: supplierName,
            requester_name: user?.full_name || 'Usuario'
          }, license!.id, appUrl)
          console.log('✅ Notificaciones enviadas exitosamente')
        } catch (notifError) {
          console.error('❌ Error enviando notificaciones:', notifError)
          toast.error('Orden creada pero fallo al enviar notificaciones')
        }
      }

      toast.dismiss()
      toast.success('Orden creada exitosamente')
      // Reset form
      setSelectedRequest('')
      setSelectedSupplier('')
      setSelectedBudget('')
      setDeliveryDate('')
      setPaymentMethod('credito')
      setPaymentReference('')
      setInternalNotes('')
      setQuotationFile(null)
      setShowForm(false)
      setShowPreviewModal(false)

      await loadData()
    } catch (error) {
      console.error('Error:', error)
      toast.dismiss()
      toast.error('Error creando orden')
    } finally {
      setSubmitting(false)
    }
  }

  // ==========================================
  // APPROVAL SYSTEM LOGIC
  // ==========================================

  const loadApprovals = async (orderId: string) => {
    try {
      setLoadingApprovals(true)
      const data = await getOrderApprovals(orderId)
      setApprovals(data || [])
    } catch (error) {
      console.error('Error loading approvals:', error)
    } finally {
      setLoadingApprovals(false)
    }
  }

  // When selectedOrder changes, load its approvals if needed
  useEffect(() => {
    if (selectedOrder?.id && (selectedOrder.status === PURCHASE_ORDER_STATUS.PENDING_APPROVAL || selectedOrder.status === PURCHASE_ORDER_STATUS.APPROVED || selectedOrder.status === PURCHASE_ORDER_STATUS.REJECTED)) {
      loadApprovals(selectedOrder.id)
    } else {
      setApprovals([])
    }
  }, [selectedOrder])

  const handleSendToReview = async (orderId: string) => {
    if (!orderId) return
    try {
      toast.loading('Enviando a revisión...')
      await sendOrderToReview(orderId, user!.id)

      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: PURCHASE_ORDER_STATUS.PENDING_APPROVAL, is_locked: true } : o))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev: any) => ({ ...prev, status: PURCHASE_ORDER_STATUS.PENDING_APPROVAL, is_locked: true }))
      }

      toast.dismiss()
      toast.success('Orden enviada a revisión de jefaturas')

      // Enviar notificaciones por correo de manera asíncrona (sin bloquear al usuario)
      const order = orders.find(o => o.id === orderId)
      if (order && user) {
        sendTripleApprovalNotifications({
          id: order.id,
          order_number: order.order_number,
          total_amount: order.total_amount,
          supplier_name: order.suppliers?.name || 'Proveedor desconocido',
          requester_name: user.full_name
        }, user.license_id, window.location.origin).catch(err => {
          console.error('Error enviando notificaciones de triple aprobación:', err)
        })
      }

      await loadData() // Reload to ensure sync
    } catch (error) {
      console.error('Error sending to review:', error)
      toast.dismiss()
      toast.error('Error enviando a revisión')
    }
  }

  const handleApprove = async (approvalId: string) => {
    try {
      toast.loading('Procesando aprobación...')
      await approveOrder(approvalId, user!.id)

      toast.dismiss()
      toast.success('Aprobación registrada')
      if (selectedOrder) await loadApprovals(selectedOrder.id)
      await loadData() // Check if order status changed
    } catch (error) {
      console.error('Error approving:', error)
      toast.dismiss()
      toast.error('Error al aprobar')
    }
  }

  const handleReject = async (approvalId: string) => {
    if (!rejectReason.trim()) {
      toast.error('Debe ingresar un motivo de rechazo')
      return
    }

    try {
      toast.loading('Procesando rechazo...')
      await rejectOrder(approvalId, user!.id, rejectReason)

      toast.dismiss()
      toast.success('Rechazo registrado')
      setShowRejectModal(false)
      setRejectReason('')

      if (selectedOrder) {
        // Order should be rejected now
        setSelectedOrder((prev: any) => ({ ...prev, status: PURCHASE_ORDER_STATUS.REJECTED, is_locked: false }))
        await loadApprovals(selectedOrder.id)
      }
      await loadData()
    } catch (error) {
      console.error('Error rejecting:', error)
      toast.dismiss()
      toast.error('Error al rechazar')
    }
  }

  const handleNotifyPickup = async (order: any) => {
    if (!order || !order.purchase_requests?.user_id) {
      toast.error('No se encontró el solicitante')
      return
    }

    try {
      toast.loading('Enviando notificación...')
      await notifyOrderPickup(order.order_number, license!.id, order.purchase_requests.user_id)
      toast.dismiss()
      toast.success('Notificación enviada al solicitante')
    } catch (error) {
      console.error('Error in handleNotifyPickup:', error)
      toast.dismiss()
      toast.error('Error al enviar notificación')
    }
  }

  const handleSaveSignature = async () => {
    if (!canvasRef.current || !deliveryReceivedBy) {
      toast.error('Debe ingresar su nombre y firmar')
      return
    }

    try {
      setIsProcessingDelivery(true)
      toast.loading('Guardando firma y confirmando entrega...')

      // Convert canvas to blob
      const signatureDataUrl = canvasRef.current.toDataURL()
      const res = await fetch(signatureDataUrl)
      const blob = await res.blob()
      const fileName = `signatures/standard/${selectedOrder.id}_${Date.now()}.png`

      // Upload signature
      const { error: uploadError } = await (supabase as any).storage
        .from('purchase_order_invoices')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('purchase_order_invoices')
        .getPublicUrl(fileName)

      const signatureUrl = urlData.publicUrl

      await confirmOrderDelivery({
        orderId: selectedOrder.id,
        receivedByName: deliveryReceivedBy,
        signatureUrl
      })

      toast.dismiss()
      toast.success('Entrega confirmada exitosamente')
      setShowSignatureModal(false)
      setSelectedOrder(null)
      await loadData()
    } catch (error) {
      console.error('Error in handleSaveSignature:', error)
      toast.dismiss()
      toast.error('Error al guardar firma')
    } finally {
      setIsProcessingDelivery(false)
    }
  }

  // Cálculos de Presupuesto en Tiempo Real
  const currentBudget = budgets.find(b => b.id === selectedBudget)
  const currentRequest = requests.find(r => r.id === selectedRequest)
  const remainingAfterPurchase = currentBudget && currentRequest
    ? currentBudget.remaining_amount - currentRequest.estimated_amount
    : null

  const filteredOrders = orders.filter(o => {
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    const matchSupplier = !filterSupplier || o.supplier_id === filterSupplier

    const orderDate = new Date(o.created_at)
    const startDate = dateRange.start ? new Date(dateRange.start) : null
    const endDate = dateRange.end ? new Date(dateRange.end) : null

    // Adjust end date to include the full day
    if (endDate) endDate.setHours(23, 59, 59, 999)

    const matchDate = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate)

    return matchStatus && matchSupplier && matchDate
  })

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-600" />
            Control de Órdenes
          </h1>
          <p className="text-gray-500 mt-1">Gestión administrativa de compras y entregas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportPurchaseOrdersToCSV(orders)}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={18} /> Exportar
          </button>
          {isJefeCompras && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary flex items-center gap-2"
            >
              {showForm ? 'Cancelar' : '+ Nueva Orden'}
            </button>
          )}
        </div>
      </div>

      {/* Formulario de Creación con Panel Lateral */}
      {showForm && isJefeCompras && (
        <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">

          {/* Columna Izquierda: Datos */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-6 bg-white shadow-sm border border-blue-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-700">
                <FileText size={20} />
                Datos de la Orden
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Solicitud Base</label>
                  <select
                    value={selectedRequest}
                    onChange={(e) => setSelectedRequest(e.target.value)}
                    className="input-base w-full"
                    required
                    title="Seleccione una solicitud de compra"
                    aria-label="Solicitud de compra"
                  >
                    <option value="">Seleccione Solicitud...</option>
                    {requests.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.request_number} - {r.users?.full_name} (Q{r.estimated_amount})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Proveedor</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedSupplier}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="input-base w-full"
                      required
                      title="Seleccione un proveedor"
                      aria-label="Proveedor"
                    >
                      <option value="">Seleccione Proveedor...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Fecha Entrega</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="input-base w-full"
                    required
                    title="Seleccione fecha de entrega"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="input-base w-full"
                    title="Seleccione método de pago"
                    aria-label="Método de pago"
                  >
                    <option value="credito">Crédito 30 días</option>
                    <option value="contado">Contado</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                {(paymentMethod === 'cheque' || paymentMethod === 'transferencia') && (
                  <div className="space-y-1 animate-in slide-in-from-left-2 duration-200">
                    <label className="text-sm font-bold text-blue-600 uppercase flex items-center gap-1">
                      Número de {paymentMethod === 'cheque' ? 'Cheque' : 'Transferencia'} *
                    </label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={e => setPaymentReference(e.target.value)}
                      placeholder={`Ej: ${paymentMethod === 'cheque' ? 'CH-12345' : 'TR-98765'}`}
                      className="input-base w-full border-blue-200 focus:ring-blue-500 bg-blue-50/30"
                      required
                      title="Ingrese el número de pago"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Centro de Costo (Opcional)</label>
                  <select
                    value={selectedCostCenter}
                    onChange={e => setSelectedCostCenter(e.target.value)}
                    className="input-base w-full"
                    title="Seleccione un centro de costo"
                    aria-label="Centro de costo"
                  >
                    <option value="">Sin asignar</option>
                    {costCenters.map(cc => (
                      <option key={cc.id} value={cc.id}>
                        {cc.code} - {cc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Cotización (Opcional)</label>
                  <div className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-300 transition-colors bg-blue-50/10">
                    <Upload className="text-gray-400" />
                    <div className="flex-1">
                      <input
                        type="file"
                        onChange={(e) => setQuotationFile(e.target.files?.[0] || null)}
                        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        accept="application/pdf,image/*"
                        title="Cargue archivo de cotización"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">PDF o Imagen hasta 10MB</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Notas Internas (Admin)</label>
                  <textarea
                    value={internalNotes}
                    onChange={e => setInternalNotes(e.target.value)}
                    placeholder="Ej: Se negoció descuento del 5%..."
                    className="input-base w-full h-20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Resumen Inteligente */}
          <div className="lg:col-span-1 space-y-4">
            <div className="card p-6 bg-gray-50 border border-gray-200 h-full flex flex-col">
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 tracking-wider">Resumen de Orden</h3>

              {selectedRequest && currentRequest ? (
                <div className="space-y-4 flex-1">
                  <div className="bg-white p-3 rounded border border-gray-100">
                    <span className="text-xs text-gray-500 block">Solicitud</span>
                    <span className="font-semibold text-gray-900">{currentRequest.request_number}</span>
                  </div>

                  <div className="bg-white p-3 rounded border border-gray-100">
                    <span className="text-xs text-gray-500 block">Descripción</span>
                    <p className="text-sm text-gray-700 mt-1 italic">"{currentRequest.justification}"</p>
                  </div>

                  <div className="bg-white p-3 rounded border border-gray-100">
                    <span className="text-xs text-gray-500 block">Monto Estimado</span>
                    <span className="text-lg font-bold text-green-600">Q {currentRequest.estimated_amount.toLocaleString()}</span>
                  </div>

                  {quotationFile && (
                    <div className="bg-blue-50 p-2 rounded border border-blue-100 flex items-center gap-2">
                      <FileText size={14} className="text-blue-600" />
                      <span className="text-xs font-medium text-blue-700 truncate">{quotationFile.name}</span>
                    </div>
                  )}

                  {currentBudget && (
                    <div className={`p-3 rounded border ${remainingAfterPurchase && remainingAfterPurchase < 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                      <span className="text-xs text-gray-500 block flex items-center gap-1">
                        <Calculator size={12} /> Proyección Presupuesto
                      </span>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm">Restante:</span>
                        <span className={`font-bold ${remainingAfterPurchase && remainingAfterPurchase < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                          Q {remainingAfterPurchase?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
                  Seleccione una solicitud para ver detalles
                </div>
              )}

              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  disabled={!selectedRequest || !selectedSupplier}
                  className="w-full btn-secondary flex justify-center items-center gap-2"
                >
                  <Eye size={16} /> Vista Previa
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-primary flex justify-center items-center gap-2"
                >
                  {submitting ? 'Procesando...' : 'Confirmar Orden'} <CheckCircle size={16} />
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Filters & Controls */}
      <div className="card p-4 bg-white shadow-sm border border-gray-100 mb-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          {/* Supplier Filter */}
          <div className="w-full md:w-1/3">
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Filtrar por Proveedor</label>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="input-base w-full text-sm"
            >
              <option value="">Todos los proveedores</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="w-full md:w-1/3">
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Rango de Fechas</label>
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
          </div>

          {/* Clear Filters */}
          {(filterSupplier || dateRange.start || dateRange.end || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setFilterSupplier('')
                setDateRange({ start: '', end: '' })
                setFilterStatus('all')
              }}
              className="text-sm text-red-600 hover:text-red-800 underline mb-2"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista de Órdenes */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { id: 'all', label: 'Todas' },
            { id: PURCHASE_ORDER_STATUS.DRAFT, label: 'Borrador' },
            { id: PURCHASE_ORDER_STATUS.PENDING_APPROVAL, label: 'En Revisión (Triple)' },
            { id: PURCHASE_ORDER_STATUS.APPROVED, label: 'Aprobadas' },
            { id: PURCHASE_ORDER_STATUS.SENT_TO_SUPPLIER, label: 'Enviadas' },
            { id: PURCHASE_ORDER_STATUS.IN_TRANSIT, label: 'En Tránsito' },
            { id: PURCHASE_ORDER_STATUS.RECEIVED, label: 'Recibidas' },
            { id: PURCHASE_ORDER_STATUS.REJECTED, label: 'Rechazadas' },
            { id: PURCHASE_ORDER_STATUS.COMPLETED, label: 'Entregadas' }
          ].map(status => (
            <button
              key={status.id}
              onClick={() => setFilterStatus(status.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === status.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
            >
              {status.label}
            </button>
          ))}
        </div>

        <div className="divide-y divide-gray-100">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No hay órdenes con estos criterios</div>
          ) : (
            filteredOrders.map(order => {
              const isLocked = order.status === 'completada' || order.is_locked
              return (
                <div key={order.id} className="p-6 hover:bg-gray-50 transition flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-900">{order.order_number}</h3>

                      {/* Status Dropdown */}
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        disabled={isLocked}
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border-2 cursor-pointer
                          ${order.status === 'recibida' ? 'bg-green-100 text-green-800 border-green-200' :
                            order.status === 'pendiente' || order.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              order.status === 'rejected' || order.status === 'cancelada' ? 'bg-red-100 text-red-800 border-red-200' :
                                'bg-blue-100 text-blue-800 border-blue-200'}
                          ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                      >
                        <option value="draft">Borrador</option>
                        <option value="pending_approval">En Revisión (Triple)</option>
                        <option value="approved">Aprobada</option>
                        <option value="sent_to_supplier">Enviada</option>
                        <option value="in_transit">En Tránsito</option>
                        <option value="recibida">Recibida</option>
                        <option value="completada">Completada / Entregada</option>
                        <option value="rejected">Rechazada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>

                      {isLocked && <span title="Bloqueado por seguridad"><Lock size={14} className="text-gray-400" /></span>}
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                      Proveedor: <span className="font-medium text-gray-900">{order.suppliers?.name}</span>
                      <span className="mx-2 text-gray-300">|</span>
                      Entrega: {new Date(order.delivery_date).toLocaleDateString()}
                    </p>

                    {order.internal_notes && (
                      <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded inline-block max-w-xl truncate">
                        <span className="font-semibold">Nota:</span> {order.internal_notes}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {/* Acciones */}
                    {isJefeCompras && !isLocked && order.status !== 'cancelada' && (
                      <div className="flex gap-2">
                        {order.status === 'pendiente' && (
                          <button onClick={() => handleSendToReview(order.id)} className="btn-xs bg-blue-100 text-blue-700 hover:bg-blue-200">
                            Enviar a Revisión
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="btn-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          Editar
                        </button>
                      </div>
                    )}

                    {/* Botón Principal - Mostrar Precio si existe, independiente del estado */}
                    {order.total_amount > 0 ? (
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-green-600">Q {order.total_amount?.toLocaleString()}</span>
                        </div>
                        {order.invoice_url && (
                          <a href={order.invoice_url} target="_blank" className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                            <FileText size={12} /> Ver Factura
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Monto pendiente</span>
                    )}

                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Ver Detalles Completos
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal Vista Previa (Simulado) */}
      {showPreviewModal && currentRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">Vista Previa del Documento</h3>
              <button onClick={() => setShowPreviewModal(false)} className="text-2xl text-gray-400">&times;</button>
            </div>
            <div className="flex-1 p-8 overflow-y-auto bg-gray-500/10">
              <div className="bg-white shadow-lg p-8 mx-auto max-w-2xl min-h-[600px] text-sm">
                {/* Header Documento */}
                <div className="flex justify-between mb-8 border-b pb-4">
                  <div>
                    <h1 className="text-2xl font-serif font-bold text-gray-800">ORDEN DE COMPRA</h1>
                    <p className="text-gray-500">Borrador Preliminar</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">ORD-2026-XXXX</p>
                    <p>Fecha: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Info */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h4 className="font-bold uppercase text-xs text-gray-500 mb-1">Proveedor</h4>
                    <p className="text-lg">{suppliers.find(s => s.id === selectedSupplier)?.name}</p>
                    <p className="text-gray-600">Condición: {paymentMethod.toUpperCase()}</p>
                  </div>
                  <div>
                    <h4 className="font-bold uppercase text-xs text-gray-500 mb-1">Entregar En</h4>
                    <p>Colegio Manos a la Obra</p>
                    <p>Fecha: {new Date(deliveryDate).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Tabla */}
                <table className="w-full mb-8">
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="text-left py-2 px-2">Descripción</th>
                      <th className="text-right py-2 px-2">Monto Estimado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-4 px-2 border-b">
                        <p className="font-bold">{currentRequest.request_number}</p>
                        <p className="text-gray-600">{currentRequest.justification}</p>
                      </td>
                      <td className="py-4 px-2 border-b text-right">
                        Q {currentRequest.estimated_amount.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="py-2 px-2 text-right font-bold">Total Estimado:</td>
                      <td className="py-2 px-2 text-right font-bold">Q {currentRequest.estimated_amount.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mt-12 pt-8 border-t border-gray-300 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="h-16 border-b border-gray-300"></div>
                    <p className="pt-2 text-xs font-bold">Elaborado por</p>
                  </div>
                  <div>
                    <div className="h-16 border-b border-gray-300"></div>
                    <p className="pt-2 text-xs font-bold">Autorizado</p>
                  </div>
                  <div>
                    <div className="h-16 border-b border-gray-300"></div>
                    <p className="pt-2 text-xs font-bold">Recibido Conforme</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-white">
              <button onClick={() => setShowPreviewModal(false)} className="btn-secondary">Cerrar</button>
              <button onClick={handleCreateOrder} className="btn-primary">Confirmar y Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Orden Existente - MEJORADO */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedOrder.order_number}</h3>
                <p className="text-sm text-gray-500">
                  Creada el {new Date(selectedOrder.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-2xl"
              >
                &times;
              </button>
            </div>

            {/* INFO BÁSICA - REDISEÑADA */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proveedor</label>
                <p className="font-bold text-slate-800 flex items-center gap-2">
                  <Package size={16} className="text-slate-400" />
                  {selectedOrder.suppliers?.name}
                </p>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha Entrega</label>
                <p className="font-semibold text-slate-700">{new Date(selectedOrder.delivery_date).toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Método Pago</label>
                <p className="font-semibold text-slate-700 capitalize">{selectedOrder.payment_method?.replace('_', ' ') || 'No especificado'}</p>
                {(selectedOrder.payment_method === 'cheque' || selectedOrder.payment_method === 'transferencia') ? (
                  <div className="mt-1">
                    <input
                      type="text"
                      value={editedOrder?.payment_reference !== undefined ? editedOrder.payment_reference : selectedOrder.payment_reference || ''}
                      onChange={(e) => setEditedOrder({ ...editedOrder, payment_reference: e.target.value })}
                      disabled={isOrderLocked(selectedOrder) || !canEditPurchaseOrder(selectedOrder)}
                      placeholder="Nº Ref..."
                      className="text-[10px] w-full px-2 py-1 border rounded bg-white font-bold text-blue-700 border-blue-100 focus:ring-1 focus:ring-blue-500 disabled:bg-transparent disabled:border-transparent disabled:p-0"
                    />
                  </div>
                ) : null}
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado Actual</label>
                <select
                  value={editedOrder?.status || selectedOrder.status}
                  onChange={(e) => setEditedOrder({ ...editedOrder, status: e.target.value })}
                  disabled={isOrderLocked(selectedOrder)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border-2 transition-all ${(editedOrder?.status || selectedOrder.status) === 'recibida' ? 'bg-green-100 text-green-800 border-green-200' :
                    (editedOrder?.status || selectedOrder.status) === 'pendiente' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      (editedOrder?.status || selectedOrder.status) === 'cancelada' ? 'bg-red-100 text-red-800 border-red-200' :
                        'bg-blue-100 text-blue-800 border-blue-200'
                    } ${isOrderLocked(selectedOrder) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="recibida">Recibida</option>
                  <option value="completada">Completada / Entregada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            {/* DOCUMENTOS ADJUNTOS */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Cotización Inicial</label>
                {selectedOrder.quotation_url ? (
                  <a
                    href={selectedOrder.quotation_url}
                    target="_blank"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium"
                  >
                    <FileText size={16} /> Ver Documento
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 italic">No disponible</span>
                )}
              </div>
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                <label className="block text-[10px] font-bold text-purple-800 uppercase mb-1">Factura Final</label>
                {selectedOrder.invoice_url ? (
                  <a
                    href={selectedOrder.invoice_url}
                    target="_blank"
                    className="flex items-center gap-2 text-sm text-purple-600 hover:underline font-medium"
                  >
                    <FileText size={16} /> Ver Factura
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 italic">No disponible</span>
                )}
              </div>
              <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                <label className="block text-[10px] font-bold text-green-800 uppercase mb-1">Constancia de Entrega</label>
                {selectedOrder.delivered_signature_url ? (
                  <a
                    href={selectedOrder.delivered_signature_url}
                    target="_blank"
                    className="flex items-center gap-2 text-sm text-green-600 hover:underline font-medium"
                  >
                    <PenTool size={16} /> Ver Firma
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 italic">No entregado aún</span>
                )}
              </div>
            </div>

            {/* Lock Warning */}
            {isOrderLocked(selectedOrder) && (
              <div className="p-3 mb-6 bg-yellow-50 border border-yellow-200 rounded flex items-start gap-2">
                <Lock size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Orden bloqueada:</strong> Esta orden tiene precio final y factura cargados.
                  Solo el rol de <strong>Finanzas</strong> puede editarla.
                </div>
              </div>
            )}

            {selectedOrder.internal_notes && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-6">
                <label className="block text-xs font-bold text-yellow-800 uppercase mb-1">Notas Internas</label>
                <p className="text-sm text-gray-700">{selectedOrder.internal_notes}</p>
              </div>
            )}

            {/* APPROVAL WORKFLOW SECTION - REDISEÑADO */}
            {['pending_approval', 'approved', 'rejected', 'en_revision', 'pendiente'].includes(selectedOrder.status) && (
              <div className="mb-8 border-2 border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg text-white">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Ruta de Aprobación</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Se requieren las tres validaciones para proceder</p>
                    </div>
                  </div>
                  {loadingApprovals && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full animate-pulse font-bold">ACTUALIZANDO...</span>}
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { role: USER_ROLES.JEFE_PRESUPUESTO, label: ROLE_LABELS.jefe_presupuesto, icon: Calculator },
                    { role: USER_ROLES.JEFE_OPERACIONES, label: ROLE_LABELS.jefe_operaciones, icon: Truck },
                    { role: USER_ROLES.JEFE_CALIDAD, label: ROLE_LABELS.jefe_calidad, icon: CheckCircle },
                  ].map(({ role, label, icon: Icon }) => {
                    const approval = approvals.find(a => a.approver_role === role)
                    const status = approval?.status || 'pending'
                    const isMyRole = user?.role === role
                    const canVote = isMyRole && status === 'pending' && (selectedOrder.status === PURCHASE_ORDER_STATUS.PENDING_APPROVAL || selectedOrder.status === 'pendiente')

                    return (
                      <div key={role} className={`relative group rounded-xl p-4 border-2 transition-all duration-300 ${status === 'approved' ? 'bg-emerald-50 border-emerald-100' :
                        status === 'rejected' ? 'bg-red-50 border-red-100' :
                          'bg-slate-50 border-slate-100'
                        }`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-2.5 rounded-xl ${status === 'approved' ? 'bg-emerald-500 text-white' :
                            status === 'rejected' ? 'bg-red-500 text-white' :
                              'bg-white text-slate-400 border border-slate-200'
                            }`}>
                            <Icon size={18} />
                          </div>
                          {status === 'approved' ? (
                            <div className="bg-emerald-500 text-white p-1 rounded-full shadow-sm">
                              <Check size={12} strokeWidth={4} />
                            </div>
                          ) : status === 'rejected' ? (
                            <div className="bg-red-500 text-white p-1 rounded-full shadow-sm">
                              <X size={12} strokeWidth={4} />
                            </div>
                          ) : (
                            <div className="bg-slate-200 text-slate-400 p-1 rounded-full">
                              <Clock size={12} strokeWidth={4} />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter block">{label}</span>
                          <p className={`text-sm font-bold ${status === 'approved' ? 'text-emerald-700' :
                            status === 'rejected' ? 'text-red-700' :
                              'text-slate-600'
                            }`}>
                            {status === 'approved' ? 'Validación Exitosa' :
                              status === 'rejected' ? 'Rechazado' :
                                'Esperando Revisión'
                            }
                          </p>
                        </div>

                        {status === 'approved' && approval.approved_at && (
                          <div className="mt-3 pt-3 border-t border-emerald-100 space-y-1">
                            <p className="text-[9px] text-emerald-600 font-bold uppercase">Fecha de Aprobación</p>
                            <p className="text-xs text-emerald-700 font-medium">{new Date(approval.approved_at).toLocaleDateString()}</p>
                          </div>
                        )}

                        {status === 'rejected' && (
                          <div className="mt-3 pt-3 border-t border-red-100">
                            <p className="text-[9px] text-red-600 font-bold uppercase mb-1">Motivo</p>
                            <p className="text-[10px] text-red-700 italic bg-white/50 p-2 rounded-lg border border-red-50 shadow-inner">"{approval.comments}"</p>
                          </div>
                        )}

                        {canVote && (
                          <div className="mt-4 flex flex-col gap-2">
                            <button
                              onClick={() => handleApprove(approval.id)}
                              className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-xs shadow-md transition-transform active:scale-95"
                            >
                              Dar Aprobación
                            </button>
                            <button
                              onClick={() => {
                                setRejectReason('')
                                setShowRejectModal(true)
                              }}
                              className="w-full py-2 text-red-600 font-bold text-xs hover:bg-red-50 rounded-lg"
                            >
                              Rechazar Orden
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* GESTIÓN DE ORDEN (Jefatura, Finanzas, Admin) */}
            {(isJefeCompras || isFinanzas || isAdmin) && (
              <div className="border-t pt-6 mt-6 space-y-6">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <Package size={18} />
                  Gestión de Orden
                </h4>

                {/* CONFIRMAR PRECIO FINAL */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Precio Final</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">Q</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editedOrder?.total_amount ?? selectedOrder.total_amount ?? ''}
                          onChange={(e) => {
                            const newPrice = parseFloat(e.target.value)
                            setEditedOrder({ ...editedOrder, total_amount: newPrice || 0 })
                          }}
                          disabled={isOrderLocked(selectedOrder) || !canEditPurchaseOrder(selectedOrder)}
                          className={`input-base pl-8 w-full ${(isOrderLocked(selectedOrder) || !canEditPurchaseOrder(selectedOrder))
                            ? 'bg-gray-100 cursor-not-allowed'
                            : ''
                            }`}
                          placeholder="0.00"
                        />
                      </div>
                      {selectedOrder.price_confirmed_at && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle size={12} />
                          Confirmado: {new Date(selectedOrder.price_confirmed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {isOrderLocked(selectedOrder)
                      ? 'Solo Finanzas puede editar este campo'
                      : 'Ingresa el precio y presiona Guardar Cambios'}
                  </p>
                </div>

                {/* SUBIR FACTURA */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Factura / Comprobante</label>

                  {selectedOrder.invoice_url ? (
                    <div className="flex items-center justify-between bg-white p-3 rounded border">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="text-green-600" size={20} />
                        <span className="text-sm font-medium text-gray-700">Factura cargada</span>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={selectedOrder.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                        >
                          Ver
                        </a>
                        <button
                          onClick={async () => {
                            // Reusing existing upload logic logic for replacement
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = 'application/pdf,image/*'
                            input.onchange = async (e: any) => {
                              const file = e.target.files[0]
                              if (file) {
                                try {
                                  toast.loading('Subiendo factura...')
                                  const result = await uploadInvoiceFile(file, selectedOrder.id, license!.id)
                                  const publicUrl = typeof result === 'string' ? result : (result as any).publicUrl

                                  // FIX: Usar el monto editado si existe, sino el de la orden
                                  const priceToKeep = editedOrder?.total_amount ?? selectedOrder.total_amount
                                  await updatePurchaseOrderPrice(selectedOrder.id, priceToKeep, publicUrl)

                                  toast.dismiss()
                                  toast.success('Factura actualizada')
                                  loadData()
                                  setSelectedOrder(null)
                                } catch (err) { toast.error('Error') }
                              }
                            }
                            input.click()
                          }}
                          className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                        >
                          Reemplazar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-white hover:bg-gray-50 transition-colors cursor-pointer relative">
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            try {
                              toast.loading('Subiendo factura...')
                              const result = await uploadInvoiceFile(file, selectedOrder.id, license!.id)
                              const publicUrl = typeof result === 'string' ? result : (result as any).publicUrl

                              // FIX: Usar el monto editado si existe, sino el de la orden
                              const priceToKeep = editedOrder?.total_amount ?? selectedOrder.total_amount
                              await updatePurchaseOrderPrice(selectedOrder.id, priceToKeep, publicUrl)

                              toast.dismiss()
                              toast.success('Factura subida correctamente')
                              loadData()
                              setSelectedOrder(null)
                            } catch (error) {
                              toast.dismiss()
                              toast.error('Error al subir factura')
                            }
                          }
                        }}
                        disabled={isOrderLocked(selectedOrder) || !canEditPurchaseOrder(selectedOrder)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <span className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500">
                            Sube un archivo
                          </span>
                          <p className="pl-1">o arrastra y suelta</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PDF, PNG, JPG hasta 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex justify-between items-center pt-4 border-t mt-6">
              <div className="flex gap-2">
                {/* Send to Review Button */}
                {isJefeCompras && (selectedOrder.status === 'pendiente' || selectedOrder.status === PURCHASE_ORDER_STATUS.DRAFT) && (
                  <button
                    onClick={() => handleSendToReview(selectedOrder.id)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2 font-bold shadow-sm"
                  >
                    <Send size={16} /> Enviar a Revisión
                  </button>
                )}

                {/* Notification Button */}
                {selectedOrder.status === 'recibida' && !selectedOrder.delivered_at && (
                  <button
                    onClick={() => handleNotifyPickup(selectedOrder)}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-2 font-bold shadow-sm"
                  >
                    <Bell size={16} /> Notificar Recojo
                  </button>
                )}

                {/* Delivery Confirmation Button - FIX: Mostrar si falta la firma o fecha de entrega, incluso en completada */}
                {(!selectedOrder.delivered_at || !selectedOrder.delivered_signature_url) &&
                  ['recibida', 'completada'].includes(selectedOrder.status) && (
                    <button
                      onClick={() => {
                        setDeliveryReceivedBy('')
                        setShowSignatureModal(true)
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 font-bold shadow-sm"
                    >
                      <PenTool size={16} /> {selectedOrder.status === 'completada' ? 'Añadir Firma de Entrega' : 'Confirmar Entrega'}
                    </button>
                  )}
              </div>
              {/* Indicador de cambios */}
              {editedOrder && (
                <div className="flex items-center gap-2 text-orange-600 text-sm bg-orange-50 px-3 py-1 rounded-full border border-orange-100 font-bold shadow-sm">
                  <span className="animate-pulse">⚠️</span>
                  <span>Hay cambios sin guardar</span>
                </div>
              )}

              {!editedOrder && <div></div>}

              <div className="flex gap-3">
                {editedOrder && !isOrderLocked(selectedOrder) && (
                  <button
                    onClick={handleSaveOrderChanges}
                    disabled={savingOrder}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                  >
                    {savingOrder ? 'Guardando...' : '💾 Guardar Cambios'}
                  </button>
                )}

                <button
                  onClick={() => generatePurchaseOrderPDF(selectedOrder, approvals)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2 font-medium"
                >
                  <FileText size={16} /> Descargar PDF
                </button>

                <button
                  onClick={() => {
                    setSelectedOrder(null)
                    setEditedOrder(null)
                  }}
                  className="btn-secondary"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal for Delivery */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <PenTool size={20} className="text-green-600" /> Confirmar Entrega
              </h3>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                La entrega debe ser recibida y firmada por el <strong>Profesor</strong> que realizó la solicitud original.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre de quien recibe (Profesor)</label>
                <input
                  type="text"
                  value={deliveryReceivedBy}
                  onChange={(e) => setDeliveryReceivedBy(e.target.value)}
                  placeholder="Nombre completo..."
                  className="input-base w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Firma Digital</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white relative">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={200}
                    className="w-full h-48 touch-none cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
                      Firmar aquí
                    </div>
                  )}
                  <button onClick={clearSignature} className="absolute top-2 right-2 text-xs bg-gray-100 px-2 py-1 rounded">
                    Borrar
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowSignatureModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSignature}
                disabled={isProcessingDelivery || !hasSignature || !deliveryReceivedBy}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessingDelivery ? 'Procesando...' : 'Confirmar y Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="text-red-600" /> Confirmar Rechazo
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Por favor indica el motivo del rechazo. Esta acción notificará al Jefe de Compras y cancelará el proceso de aprobación actual.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ingresa el motivo del rechazo..."
              className="w-full border rounded-lg p-3 text-sm min-h-[100px] mb-4 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  // Find my pending approval
                  const myApproval = approvals.find(a => [USER_ROLES.JEFE_PRESUPUESTO, USER_ROLES.JEFE_OPERACIONES, USER_ROLES.JEFE_CALIDAD].includes(user?.role as any) && a.approver_role === user?.role && a.status === 'pending')

                  if (myApproval) {
                    handleReject(myApproval.id)
                  } else {
                    toast.error('No se encontró su aprobación pendiente')
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium text-sm"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
