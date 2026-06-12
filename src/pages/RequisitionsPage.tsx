import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, CheckCircle, XCircle, Download, X, ShoppingCart, Package, Printer } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import {
  getRequisitions,
  createRequisitionWithItems,
  updateRequisitionStatus,
  sendRequisitionStatusNotification,
  getInventory,
  getCostCenters,
  getBudgets,
  assignCostCenter,
  getRequisitionItems,
  confirmRequisitionDelivery,
  uploadDeliverySignature,
  getRequisitionDispatches,
  getRequisitionDispatchItems,
  type RequisitionItem,
  supabase
} from '@/services/supabaseClient'
import { useRef } from 'react'
import { generateRequisitionDeliveryPDF } from '@/utils/pdfGenerator'
import { useRequisitionRealtime } from '@/hooks/useRequisitionRealtime'
import { canUserCreateRequisition } from '@/utils/roleActions'
import { exportRequisitionsToCSV } from '@/utils/exportUtils'
import { getStockUnitsConsumed } from '@/utils/inventoryConversions'
import toast from 'react-hot-toast'

const statusColors = {
  pendiente: 'badge-warning',
  en_revision: 'badge-info',
  aprobada: 'badge-success',
  rechazada: 'badge-error',
  listo_para_recoger: 'badge-info',
  entregado_parcial: 'badge-warning',
  entregado: 'badge-success',
}

const priorityColors = {
  baja: '#10B981',
  media: '#F59E0B',
  alta: '#F97316',
  urgente: '#EF4444',
}

const COMMON_UNITS = [
  'unidades',
  'cajas',
  'paquetes',
  'docenas',
  'metros',
  'litros',
  'kilogramos',
  'piezas',
  'rollos',
  'galones',
  'libras'
]

const PACKAGE_UNITS = ['cajas', 'paquetes', 'docenas']

export default function RequisitionsPage() {
  const { user, license } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [requisitions, setRequisitions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
  const [rejectComments, setRejectComments] = useState('')
  const [inventory, setInventory] = useState<any[]>([])

  // NEW: Multi-item cart state
  const [itemCart, setItemCart] = useState<RequisitionItem[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [selectedItemStock, setSelectedItemStock] = useState<number>(0)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1)
  const [newItemUnit, setNewItemUnit] = useState('unidades')
  const [newItemUnitsPerPackage, setNewItemUnitsPerPackage] = useState<number>(1)
  const [costCenters, setCostCenters] = useState<any[]>([])
  const [budgets, setBudgets] = useState<any[]>([]) // Load budgets
  const [showCostCenterModal, setShowCostCenterModal] = useState<any>(null)
  const [selectedCostCenter, setSelectedCostCenter] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState<any>(null)
  const [requisitionItems, setRequisitionItems] = useState<any[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [requisitionDispatches, setRequisitionDispatches] = useState<any[]>([])

  // Dispatch modal state
  const [showDispatchModal, setShowDispatchModal] = useState<string | null>(null)
  const [dispatchItems, setDispatchItems] = useState<any[]>([])
  const [loadingDispatch, setLoadingDispatch] = useState(false)
  const [receivedByName, setReceivedByName] = useState('')
  const [dispatchNotes, setDispatchNotes] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const [formData, setFormData] = useState({
    priority: 'media',
    justification: '',
  })

  const canCreate = user ? canUserCreateRequisition(user.role) : false
  const canApprove = user && (user.role === 'jefe_compras' || user.role === 'admin')
  const canAssignCostCenter = user && user.role === 'finanzas'

  useEffect(() => {
    async function loadData() {
      if (!license?.id) return
      try {
        setLoading(true)
        const [reqData, invData, ccData, budgetData] = await Promise.all([
          getRequisitions(license.id, canApprove ? undefined : user?.id),
          getInventory(license.id),
          getCostCenters(license.id),
          getBudgets(license.id)
        ])
        setRequisitions(reqData || [])
        setInventory(invData || [])
        setCostCenters(ccData || [])
        setBudgets(budgetData || [])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user, license])

  // ... (rest of code)
  // Skipping to the Modal part via separate chunk or finding line numbers...
  // Actually, I can't skip too much if I use contiguous edits.
  // But the modal is at line 760+.
  // I will apply the useEffect change first, then the Modal change in a separate call or same if nearby.
  // Wait, the ReplacementContent above replaces lines 71 to 112 approx.
  // Let's refine the StartLine/EndLine for the useEffect block.

  const handleRequisitionUpdate = useCallback((requisitionId: string, updatedFields: any) => {
    setRequisitions(prev =>
      prev.map(req =>
        req.id === requisitionId
          ? { ...req, ...updatedFields }
          : req
      )
    )
  }, [])

  useRequisitionRealtime(user?.license_id || '', user?.id, handleRequisitionUpdate)

  const filtered = requisitions.filter(req => {
    const matchSearch = req.requisition_number?.includes(searchTerm) || req.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = !filterStatus || req.status === filterStatus
    const matchPriority = !filterPriority || req.priority === filterPriority
    return matchSearch && matchStatus && matchPriority
  })

  const stats = {
    total: requisitions.length,
    pendientes: requisitions.filter(r => r.status === 'pendiente').length,
    aprobadas: requisitions.filter(r => r.status === 'aprobada').length,
    rechazadas: requisitions.filter(r => r.status === 'rechazada').length,
  }

  // NEW: Add item to cart
  const isPackageUnit = PACKAGE_UNITS.includes(newItemUnit)

  const addItemToCart = () => {
    if (isPackageUnit && newItemUnitsPerPackage < 1) {
      toast.error('Indica cuántas unidades contiene cada ' + newItemUnit.slice(0, -1))
      return
    }
    if (selectedItemId) {
      const item = inventory.find(i => i.id === selectedItemId)
      if (!item) return

      // Validate stock limit for profesor role
      if (newItemQuantity > item.current_stock) {
        toast.error(`❌ No puedes pedir más de ${item.current_stock} ${item.unit_of_measure || 'unidades'} disponibles en stock`)
        return
      }
      if (item.current_stock === 0) {
        toast.error('⚠️ Este producto no tiene stock disponible')
        return
      }

      const itemUnit = item.unit_of_measure || newItemUnit
      const itemUpp = item.units_per_package || newItemUnitsPerPackage
      const isPkg = PACKAGE_UNITS.includes(itemUnit)
      setItemCart(prev => [...prev, {
        inventory_item_id: item.id,
        item_name: item.name,
        quantity: newItemQuantity,
        unit_of_measure: itemUnit,
        units_per_package: isPkg ? itemUpp : 1,
        estimated_unit_cost: item.unit_cost || 0
      }])
      setSelectedItemId('')
      setSelectedItemStock(0)
      setNewItemQuantity(1)
      setNewItemUnitsPerPackage(1)
      setNewItemUnit('unidades')
    } else if (newItemName.trim()) {
      setItemCart(prev => [...prev, {
        item_name: newItemName,
        quantity: newItemQuantity,
        unit_of_measure: newItemUnit,
        units_per_package: isPackageUnit ? newItemUnitsPerPackage : 1,
        estimated_unit_cost: 0
      }])
      setNewItemName('')
      setNewItemQuantity(1)
      setNewItemUnit('unidades')
      setNewItemUnitsPerPackage(1)
    } else {
      toast.error('Selecciona un item o escribe un nombre')
    }
  }

  const removeItemFromCart = (index: number) => {
    setItemCart(prev => prev.filter((_, i) => i !== index))
  }

  const calculateTotalEstimate = () => {
    return itemCart.reduce((sum, item) => sum + (item.quantity * (item.estimated_unit_cost || 0)), 0)
  }

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.justification.trim()) {
      toast.error('Ingresa la justificación')
      return
    }

    if (itemCart.length === 0) {
      toast.error('Agrega al menos un ítem')
      return
    }

    if (!user || !license) {
      toast.error('Error: Usuario o licencia no válidos')
      return
    }

    try {
      setSubmitting(true)
      const totalEstimate = calculateTotalEstimate()

      await createRequisitionWithItems(
        license.id,
        user.id,
        {
          priority: formData.priority,
          justification: formData.justification,
          estimated_amount: totalEstimate
        },
        itemCart
      )

      toast.success('Requisición creada exitosamente')
      setShowForm(false)
      setFormData({ priority: 'media', justification: '' })
      setItemCart([])

      // Reload
      const data = await getRequisitions(license.id, canApprove ? undefined : user.id)
      setRequisitions(data || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al crear requisición')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssignCostCenter = async () => {
    if (!showCostCenterModal || !selectedCostCenter) {
      toast.error('Selecciona un centro de costo')
      return
    }

    try {
      await assignCostCenter(showCostCenterModal, selectedCostCenter)
      toast.success('Centro de costo asignado')
      setShowCostCenterModal(null)
      setSelectedCostCenter('')

      // Reload
      const data = await getRequisitions(license!.id, canApprove ? undefined : user!.id)
      setRequisitions(data || [])
    } catch (error) {
      console.error(error)
      toast.error('Error asignando centro de costo')
    }
  }

  const handleApprovalChange = async (requisitionId: string, newStatus: string) => {
    try {
      setUpdatingId(requisitionId)
      const req = requisitions.find(r => r.id === requisitionId)
      await updateRequisitionStatus(requisitionId, newStatus)

      if (req?.users?.email) {
        await sendRequisitionStatusNotification(
          requisitionId,
          req.requisition_number,
          newStatus,
          req.users.email,
          req.users.full_name,
          req.license_id
        )
      }

      toast.success(`Requisición: ${newStatus.replace(/_/g, ' ')}`)
      setRequisitions(prev =>
        prev.map(r =>
          r.id === requisitionId ? { ...r, status: newStatus } : r
        )
      )
      setShowRejectModal(null)
      setRejectComments('')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleOpenDispatchModal = async (requisitionId: string) => {
    try {
      setLoadingDispatch(true)
      setShowDispatchModal(requisitionId)

      // Cargar ítems de la requisición
      const items = await getRequisitionItems(requisitionId)

      // Cargar stock y nombres del inventario
      const itemsWithStock = await Promise.all(
        items.map(async (item: any) => {
          const pending = item.quantity_requested - (item.quantity_delivered || 0)
          if (item.inventory_item_id) {
            const { data: invItem } = await supabase
              .from('inventory_items')
              .select('id, name, current_stock, unit_of_measure, units_per_package')
              .eq('id', item.inventory_item_id)
              .single()

            return {
              ...item,
              item_name: item.item_name || invItem?.name || 'Item desconocido',
              available_stock: invItem?.current_stock || 0,
              unit_of_measure: invItem?.unit_of_measure || item.unit_of_measure || 'unidades',
              units_per_package: invItem?.units_per_package || 1,
              dispense_unit: invItem?.unit_of_measure || item.unit_of_measure || 'unidades',
              to_dispatch: Math.min(pending, invItem?.current_stock || 0)
            }
          }
          return {
            ...item,
            item_name: item.item_name || 'Item sin inventario',
            available_stock: 0,
            unit_of_measure: item.unit_of_measure || 'unidades',
            units_per_package: 1,
            dispense_unit: item.unit_of_measure || 'unidades',
            to_dispatch: 0
          }
        })
      )

      setDispatchItems(itemsWithStock)
      const req = requisitions.find(r => r.id === requisitionId)
      setReceivedByName(req?.users?.full_name || '')
      setDispatchNotes('')
      setHasSignature(false)
    } catch (error) {
      console.error('Error loading dispatch items:', error)
      toast.error('Error cargando ítems para despacho')
    } finally {
      setLoadingDispatch(false)
    }
  }

  // Signature Pad Logic
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
    setHasSignature(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  // Print requisition items
  const handlePrintRequisition = async (req: any) => {
    try {
      const items = await getRequisitionItems(req.id)
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (!printWindow) return

      const itemRows = items.map((item: any) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.item_name || 'Sin nombre'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity_requested}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.unit_of_measure || 'unidades'}</td>
        </tr>
      `).join('')

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Requisición ${req.requisition_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; padding: 16px; background: #f8f9fa; border-radius: 8px; }
            .info-item label { font-size: 11px; text-transform: uppercase; color: #888; display: block; }
            .info-item span { font-weight: bold; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; }
            thead { background: #1d4ed8; color: white; }
            thead th { padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
            tbody tr:nth-child(even) { background: #f8f9fa; }
            .footer { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .sign-box { border-top: 2px solid #222; padding-top: 8px; text-align: center; font-size: 12px; color: #555; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>📋 Requisición de Materiales</h1>
          <p class="subtitle">Colegio Manos a la Obra — Sistema MAO 2026</p>
          <div class="info-grid">
            <div class="info-item"><label>Número</label><span>${req.requisition_number}</span></div>
            <div class="info-item"><label>Estado</label><span>${req.status.replace(/_/g, ' ').toUpperCase()}</span></div>
            <div class="info-item"><label>Solicitado por</label><span>${req.users?.full_name || 'Desconocido'}</span></div>
            <div class="info-item"><label>Prioridad</label><span>${req.priority?.toUpperCase()}</span></div>
            <div class="info-item"><label>Justificación</label><span>${req.justification || '—'}</span></div>
            <div class="info-item"><label>Fecha de aprobación</label><span>${new Date().toLocaleDateString('es-GT')}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Descripción del Artículo</th>
                <th style="text-align:center;">Cantidad</th>
                <th>Unidad</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div class="footer">
            <div class="sign-box">Firma del Solicitante</div>
            <div class="sign-box">Firma del Autorizador (Jefe de Compras)</div>
          </div>
        </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 500)
    } catch (error) {
      console.error('Error imprimiendo:', error)
      toast.error('Error al generar la impresión')
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasSignature(false)
    }
  }

  const handleConfirmDispatch = async () => {
    try {
      if (!showDispatchModal || !license?.id || !user?.id) return

      if (!receivedByName.trim()) {
        toast.error('Indique quién recibe los materiales')
        return
      }

      if (!hasSignature) {
        toast.error('La firma es obligatoria para la entrega')
        return
      }

      const itemsToDispatch = dispatchItems
        .filter(i => i.to_dispatch > 0)
        .map(i => {
          const consumed = getStockUnitsConsumed(
            i.to_dispatch,
            i.dispense_unit,
            i.unit_of_measure,
            i.units_per_package || 1
          )
          return {
            requisition_item_id: i.id,
            inventory_item_id: i.inventory_item_id || null,
            quantity: consumed, // Consumo proporcional en unidad base
            dispense_quantity: i.to_dispatch,
            dispense_unit: i.dispense_unit
          }
        })

      if (itemsToDispatch.length === 0) {
        toast.error('Indique cantidades a despachar')
        return
      }

      setUpdatingId(showDispatchModal)

      // 1. Get Signature Data URL
      const canvas = canvasRef.current
      let signatureUrl = ''
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png')
        signatureUrl = await uploadDeliverySignature(license.id, `req-${showDispatchModal}`, dataUrl)
      }

      // 2. Atomic Dispatch via RPC
      await confirmRequisitionDelivery({
        license_id: license.id,
        requisition_id: showDispatchModal,
        dispatched_by: user.id,
        received_by_name: receivedByName,
        signature_url: signatureUrl,
        notes: dispatchNotes,
        items: itemsToDispatch
      })

      toast.success('Entrega procesada correctamente')
      setShowDispatchModal(null)
      setRequisitions(prev => prev.map(r =>
        r.id === showDispatchModal
          ? { ...r, status: itemsToDispatch.length === dispatchItems.length ? 'entregado' : 'entregado_parcial' }
          : r
      ))
    } catch (error) {
      console.error('Error dispatching:', error)
      toast.error('Error al procesar la entrega')
    } finally {
      setUpdatingId(null)
    }
  }

  // Handle view requisition details
  const handleViewDetails = async (req: any) => {
    try {
      setShowDetailsModal(req)
      setLoadingItems(true)
      const items = await getRequisitionItems(req.id)
      setRequisitionItems(items || [])

      // Load dispatches
      const dispatches = await getRequisitionDispatches(req.id)
      setRequisitionDispatches(dispatches || [])
    } catch (error) {
      console.error('Error loading requisition details:', error)
      toast.error('Error al cargar los detalles')
    } finally {
      setLoadingItems(false)
    }
  }

  const filteredInventory = inventory.filter(i => {
    // Si es profesor, ocultar ítems con stock 0 o menor
    if (user?.role === 'profesor' && i.current_stock <= 0) {
      return false
    }
    return i.name.toLowerCase().includes(itemSearch.toLowerCase())
  })

  if (loading) {
    return <div className="text-center py-10">Cargando requisiciones...</div>
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1800px] mx-auto animate-in fade-in duration-500">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="p-2 md:p-3 bg-blue-600 text-white rounded-[1rem] md:rounded-[1.5rem] shadow-xl shadow-blue-200">
              <Package size={24} className="md:w-8 md:h-8" />
            </div>
            Mis Requisiciones
          </h1>
          <p className="text-gray-500 font-medium mt-1 md:mt-2 text-sm md:text-base">Gestión y seguimiento de solicitudes de materiales</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button 
            type="button"
            onClick={() => exportRequisitionsToCSV(requisitions)} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            title="Exportar a CSV"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {canCreate && (
            <button 
              onClick={() => setShowForm(!showForm)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl ${showForm ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-blue-600 text-white shadow-blue-200 hover:scale-[1.02] active:scale-95'}`}
            >
              {showForm ? <X size={18} /> : <Plus size={18} />}
              {showForm ? 'Cancelar' : 'Nueva Requisición'}
            </button>
          )}
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
        <div className="bg-gradient-to-br from-white to-rose-50/50 p-6 rounded-[2rem] border border-rose-100/50 shadow-xl shadow-rose-100/20 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02]">
          <span className="text-[10px] md:text-xs font-black text-rose-500 uppercase tracking-widest mb-1 md:mb-2">Rechazadas</span>
          <span className="text-3xl md:text-4xl font-black text-rose-500">{stats.rechazadas}</span>
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
            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all text-gray-700"
          />
        </div>

        <div className="w-full md:w-auto flex gap-3">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            className="flex-1 md:flex-none bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-100 text-gray-600 outline-none"
          >
            <option value="">Estado: Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_revision">En Revisión</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
          </select>

          <select 
            value={filterPriority} 
            onChange={(e) => setFilterPriority(e.target.value)} 
            className="flex-1 md:flex-none bg-gray-50 border-none rounded-2xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-100 text-gray-600 outline-none"
          >
            <option value="">Prioridad: Todas</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
      </div>

      {/* Premium FORM with Item Cart */}
      {showForm && (
        <form onSubmit={handleCreateRequisition} className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl shadow-blue-900/5 overflow-hidden animate-in slide-in-from-top-4 duration-500">
          <div className="p-6 md:p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-xl font-black text-gray-800 tracking-tight">Nueva Requisición de Materiales</h3>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* LEFT: Item Selection */}
            <div className="space-y-6">
              {/* ── SECCIÓN 1: Buscar en Inventario ── */}
              <div className="bg-blue-50 border-2 border-blue-200 p-5 rounded-2xl relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">📦 Inventario</span>
                  <span className="text-xs text-blue-600 font-semibold">Busca y selecciona del stock disponible</span>
                </div>

                {/* Search input */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                  <input
                    type="text"
                    placeholder="🔍 Escribe el nombre del producto..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="w-full bg-white border-2 border-blue-200 text-gray-900 py-2.5 pl-9 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm font-medium transition-all"
                  />
                </div>

                {/* Dropdown */}
                <div className="relative">
                  <select
                    value={selectedItemId}
                    onChange={(e) => {
                      const id = e.target.value
                      setSelectedItemId(id)
                      setNewItemName('')
                      if (id) {
                        const inv = inventory.find(i => i.id === id)
                        if (inv) {
                          setNewItemUnit(inv.unit_of_measure || 'unidades')
                          setNewItemUnitsPerPackage(inv.units_per_package || 1)
                          setSelectedItemStock(inv.current_stock || 0)
                          setNewItemQuantity(1)
                        }
                      } else {
                        setSelectedItemStock(0)
                      }
                    }}
                    className="w-full appearance-none bg-white border-2 border-blue-200 text-gray-700 py-2.5 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-semibold cursor-pointer"
                    aria-label="Seleccionar artículo del inventario"
                  >
                    <option value="">-- Selecciona un producto del inventario --</option>
                    {filteredInventory.map(item => {
                      const noStock = item.current_stock === 0
                      return (
                        <option key={item.id} value={item.id} disabled={noStock}>
                          {noStock ? '⛔ ' : '✅ '}{item.name} — Stock: {item.current_stock} {item.unit_of_measure || 'u'}
                        </option>
                      )
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-blue-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>

                {/* Stock badge after selection */}
                {selectedItemId && (
                  <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold ${
                    selectedItemStock === 0
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : selectedItemStock <= 5
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-green-100 text-green-700 border border-green-200'
                  }`}>
                    <span>{selectedItemStock === 0 ? '🔴' : selectedItemStock <= 5 ? '🟡' : '🟢'}</span>
                    <span>Stock disponible: <strong>{selectedItemStock}</strong> {inventory.find(i=>i.id===selectedItemId)?.unit_of_measure || 'unidades'}</span>
                    {selectedItemStock === 0 && <span className="ml-auto text-xs">Sin stock</span>}
                    {selectedItemStock > 0 && selectedItemStock <= 5 && <span className="ml-auto text-xs">Stock bajo</span>}
                  </div>
                )}

                {/* Quantity input with validation */}
                {selectedItemId && (
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-blue-700 mb-1 uppercase tracking-wider">Cantidad a solicitar</label>
                    <input
                      type="number"
                      min="1"
                      max={selectedItemStock}
                      value={newItemQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1
                        setNewItemQuantity(val)
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl border-2 text-sm font-bold focus:outline-none transition-all ${
                        newItemQuantity > selectedItemStock
                          ? 'border-red-400 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-300'
                          : 'border-blue-200 bg-white text-gray-800 focus:ring-2 focus:ring-blue-400'
                      }`}
                    />
                    {newItemQuantity > selectedItemStock && (
                      <p className="mt-1.5 text-xs font-bold text-red-600 flex items-center gap-1">
                        ⚠️ La cantidad supera el stock disponible ({selectedItemStock}). Reduce la cantidad.
                      </p>
                    )}
                    {newItemQuantity <= selectedItemStock && selectedItemStock > 0 && (
                      <p className="mt-1 text-xs text-green-600 font-medium">✓ Cantidad válida</p>
                    )}
                  </div>
                )}
              </div>


              <button
                type="button"
                onClick={addItemToCart}
                disabled={!selectedItemId || newItemQuantity > selectedItemStock || selectedItemStock === 0}
                className="w-full mt-2 flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShoppingCart size={18} />
                Añadir al Carrito de Requisición
              </button>
            </div>

            {/* RIGHT: Cart & Details */}
            <div className="space-y-6 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">2</div>
                <h4 className="font-bold text-gray-700 uppercase tracking-widest text-sm">Carrito & Justificación</h4>
              </div>

              <div className="flex-1 bg-gray-50/50 rounded-3xl border border-gray-100 p-6 flex flex-col space-y-6">
                
                {/* Cart Items */}
                <div className="flex-1 min-h-[150px] max-h-[300px] overflow-y-auto pr-2 space-y-3 [&::-webkit-scrollbar-track]:!bg-transparent [&::-webkit-scrollbar-thumb]:!bg-gray-300">
                  {itemCart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                      <ShoppingCart size={32} className="opacity-50" />
                      <p className="text-sm font-medium">El carrito está vacío</p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {itemCart.map((item, idx) => {
                        const isPkg = PACKAGE_UNITS.includes(item.unit_of_measure)
                        const totalUnits = isPkg && (item.units_per_package || 1) > 1
                          ? item.quantity * (item.units_per_package || 1)
                          : null
                        return (
                          <li key={idx} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm group">
                            <div className="flex-1">
                              <p className="font-bold text-gray-800 text-sm">{item.item_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-black text-[10px] uppercase tracking-wider">
                                  {item.quantity} {item.unit_of_measure}
                                </span>
                                {totalUnits && (
                                  <span className="text-[10px] text-gray-400 font-medium">
                                    ({item.units_per_package} uds/{item.unit_of_measure.slice(0, -1)} = {totalUnits} totales)
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItemFromCart(idx)}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            >
                              <X size={14} />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Ítems</span>
                  <span className="text-3xl font-black text-gray-900">{itemCart.length}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Prioridad</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="input-base"
                >
                  <option value="baja">🟢 Baja - Sin urgencia</option>
                  <option value="media">🟡 Media - Rutinaria</option>
                  <option value="alta">🟠 Alta - Necesaria pronto</option>
                  <option value="urgente">🔴 Urgente - Crítica para hoy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Justificación</label>
                <textarea
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  placeholder="Describe detalladamente por qué necesitas estos items..."
                  rows={3}
                  className="input-base resize-none"
                />
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row gap-4 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-gray-500 hover:bg-gray-100 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={submitting || itemCart.length === 0} className="px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white bg-blue-600 shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2">
              <CheckCircle size={18} />
              {submitting ? 'Procesando...' : 'Enviar Requisición Oficial'}
            </button>
          </div>
        </form>
      )}

      {/* Premium Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Número</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Centro de Costo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Ítems</th>
                {user?.role !== 'profesor' && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Monto</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Prioridad</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length > 0 ? filtered.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-primary">{req.requisition_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{req.users?.full_name}</td>
                  <td className="px-6 py-4 text-sm">
                    {req.cost_center_code ? (
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                        {req.cost_center_code}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <button
                      onClick={() => handleViewDetails(req)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
                    >
                      Ver detalles
                    </button>
                  </td>
                  {user?.role !== 'profesor' && (
                    <td className="px-6 py-4 text-sm font-semibold">Q {req.estimated_amount || 0}</td>
                  )}
                  <td className="px-6 py-4 text-sm">
                    <span
                      className="px-2 py-1 rounded text-white text-xs font-medium"
                      style={{ backgroundColor: priorityColors[req.priority as keyof typeof priorityColors] || '#F59E0B' }}
                    >
                      {req.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`badge ${statusColors[req.status as keyof typeof statusColors]}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-2">
                    {canAssignCostCenter && req.status === 'pendiente' && !req.cost_center_id && (
                      <button
                        onClick={() => setShowCostCenterModal(req.id)}
                        className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                      >
                        Asignar CC
                      </button>
                    )}
                    {canApprove && (req.status === 'en_revision' || req.status === 'pendiente') && (
                      <>
                        <button
                          onClick={() => handleApprovalChange(req.id, 'aprobada')}
                          disabled={updatingId === req.id}
                          className="text-green-600 hover:text-green-800 text-xs font-medium"
                        >
                          <CheckCircle size={16} className="inline mr-1" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => setShowRejectModal(req.id)}
                          disabled={updatingId === req.id}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          <XCircle size={16} className="inline mr-1" />
                          Rechazar
                        </button>
                      </>
                    )}
                    {req.status === 'aprobada' && (
                      <button
                        onClick={() => handlePrintRequisition(req)}
                        className="text-purple-600 hover:text-purple-800 text-xs font-medium flex items-center gap-1"
                        title="Imprimir listado aprobado"
                      >
                        <Printer size={16} />
                        Imprimir
                      </button>
                    )}
                    {canApprove && req.status === 'aprobada' && (
                      <button
                        onClick={() => handleApprovalChange(req.id, 'listo_para_recoger')}
                        disabled={updatingId === req.id}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                      >
                        <CheckCircle size={16} />
                        Listo para recoger
                      </button>
                    )}
                    {canApprove && (req.status === 'listo_para_recoger' || req.status === 'entregado_parcial') && (
                      <button
                        onClick={() => handleOpenDispatchModal(req.id)}
                        disabled={updatingId === req.id}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                      >
                        <Package size={16} />
                        Despachar
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No hay requisiciones
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Center Assignment Modal */}
      {showCostCenterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Asignar Centro de Costo</h3>
            <select
              value={selectedCostCenter}
              onChange={(e) => setSelectedCostCenter(e.target.value)}
              className="input-base w-full mb-4"
              title="Seleccione un centro de costo"
              aria-label="Centro de costo"
            >
              <option value="">-- Selecciona Centro de Costo --</option>
              {costCenters
                .filter(cc => {
                  if (!cc.is_active) return false;
                  // Find linked budget
                  const budget = budgets.find(b => b.id === cc.budget_id);
                  // Allow if linked to active budget OR warning if no budget (legacy)
                  // Strict mode: Only active budgets
                  return budget && budget.status === 'activo';
                })
                .map(cc => {
                  const budget = budgets.find(b => b.id === cc.budget_id);
                  return (
                    <option key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name} (Presupuesto: {budget?.name})
                    </option>
                  )
                })}
            </select>
            <div className="flex gap-2">
              <Button onClick={handleAssignCostCenter} variant="primary">Asignar</Button>
              <Button onClick={() => setShowCostCenterModal(null)} variant="secondary">Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Rechazar Requisición</h3>
            <textarea
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              placeholder="Comentarios (opcional)"
              rows={3}
              className="input-base w-full mb-4"
            />
            <div className="flex gap-2">
              <Button onClick={() => handleApprovalChange(showRejectModal, 'rechazada')} variant="primary">
                Rechazar
              </Button>
              <Button onClick={() => setShowRejectModal(null)} variant="secondary">Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Requisición {showDetailsModal.requisition_number}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Solicitante: {showDetailsModal.users?.full_name}
                </p>
                <p className="text-sm text-gray-600">
                  Fecha: {new Date(showDetailsModal.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(null)
                  setRequisitionItems([])
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded">
              <div>
                <span className="text-xs font-semibold text-gray-600">Prioridad:</span>
                <span
                  className="ml-2 px-2 py-1 rounded text-white text-xs font-medium"
                  style={{ backgroundColor: priorityColors[showDetailsModal.priority as keyof typeof priorityColors] || '#F59E0B' }}
                >
                  {showDetailsModal.priority}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Estado:</span>
                <span
                  className="ml-2 px-2 py-1 rounded text-white text-xs font-medium"
                  style={{ backgroundColor: statusColors[showDetailsModal.status as keyof typeof statusColors] || '#6B7280' }}
                >
                  {showDetailsModal.status}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Centro de Costo:</span>
                <span className="ml-2 text-sm">
                  {showDetailsModal.cost_center_code || 'Sin asignar'}
                </span>
              </div>
              {user?.role !== 'profesor' && (
                <div>
                  <span className="text-xs font-semibold text-gray-600">Monto Estimado:</span>
                  <span className="ml-2 text-sm font-semibold">Q {showDetailsModal.estimated_amount || 0}</span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Justificación:</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {showDetailsModal.justification}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Ítems Solicitados:</h4>
              {loadingItems ? (
                <div className="text-center py-4 text-gray-500">Cargando ítems...</div>
              ) : requisitionItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Artículo</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Solicitado</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Entregado</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Unidad</th>
                        {user?.role !== 'profesor' && (
                          <>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Costo Unit.</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Subtotal</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {requisitionItems.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{item.item_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity_requested}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-blue-600 text-right">
                            {item.quantity_delivered || 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.unit_of_measure}</td>
                          {user?.role !== 'profesor' && (
                            <>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                Q {item.estimated_unit_cost || 0}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                                Q {((item.estimated_unit_cost || 0) * item.quantity_requested).toFixed(2)}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">No hay ítems registrados</div>
              )}
            </div>

            {loadingItems ? (
              <div className="mt-8 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-xs text-gray-500">Cargando historial de entregas...</p>
              </div>
            ) : requisitionDispatches.length > 0 ? (
              <div className="mt-8">
                <hr className="my-6 border-gray-100" />
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Package size={16} className="text-blue-500" />
                  Historial de Entregas y Comprobantes:
                </h4>
                <div className="space-y-3">
                  {requisitionDispatches.map((dispatch) => (
                    <div key={dispatch.id} className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center shadow-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-blue-900">
                            Recibido por: {dispatch.received_by_name}
                          </p>
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">PDF LISTO</span>
                        </div>
                        <p className="text-xs text-blue-700 mt-0.5">
                          Fecha: {new Date(dispatch.created_at).toLocaleString()}
                        </p>
                        {dispatch.notes && <p className="text-xs text-blue-600 italic mt-1 bg-white/50 p-1.5 rounded">"{dispatch.notes}"</p>}
                      </div>
                      <button
                        onClick={async () => {
                          const items = await getRequisitionDispatchItems(dispatch.id)
                          await generateRequisitionDeliveryPDF(showDetailsModal, dispatch, items || [])
                        }}
                        className="text-xs bg-white border border-blue-300 px-4 py-2 rounded-md hover:bg-blue-100 flex items-center gap-2 text-blue-700 font-bold transition-colors shadow-sm"
                      >
                        <Download size={14} />
                        DESCARGAR PDF
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (['entregado', 'entregado_parcial'].includes(showDetailsModal.status)) && (
              <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <p className="text-sm text-yellow-800 font-medium">Historial de despacho no encontrado</p>
                <p className="text-xs text-yellow-600 mt-1">Este registro podría ser anterior a la implementación del nuevo sistema de firmas.</p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => {
                  setShowDetailsModal(null)
                  setRequisitionItems([])
                }}
                variant="secondary"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Package className="text-blue-600" size={24} />
                Despachar Requisición
              </h2>
              <button
                onClick={() => setShowDispatchModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {loadingDispatch ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-gray-600">Cargando ítems...</p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    ℹ️ Verifica el stock disponible y ajusta las cantidades a despachar. El inventario se descontará automáticamente.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold text-gray-700">Ítem</th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Solicitado</th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Entregado</th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">Stock</th>
                        <th className="text-center p-3 text-sm font-semibold text-gray-700">A Despachar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dispatchItems.map((item, idx) => {
                        const consumed = getStockUnitsConsumed(item.to_dispatch, item.dispense_unit, item.unit_of_measure, item.units_per_package || 1)
                        const isDecimal = consumed !== item.to_dispatch

                        return (
                          <tr key={idx} className="hover:bg-gray-50 border-b">
                            <td className="p-3 text-sm">
                              <div className="font-medium text-gray-900">{item.item_name}</div>
                              <div className="text-xs text-gray-500">Unidad Base: {item.unit_of_measure}</div>
                              {item.units_per_package > 1 && (
                                <div className="text-[10px] text-purple-600 font-medium">Empaque: {item.units_per_package} uds/{item.unit_of_measure.slice(0, -1)}</div>
                              )}
                            </td>
                            <td className="text-center p-3 text-sm">{item.quantity_requested}</td>
                            <td className="text-center p-3 text-sm text-blue-600 font-medium">
                              {item.quantity_delivered || 0}
                            </td>
                            <td className="text-center p-3 text-sm">
                              <span className={item.available_stock < consumed ? 'text-red-600 font-bold' : 'text-green-600'}>
                                {item.available_stock} {item.unit_of_measure}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex gap-1 items-center">
                                  <input
                                    type="number"
                                    value={item.to_dispatch}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0
                                      const newItems = [...dispatchItems]
                                      newItems[idx].to_dispatch = val
                                      setDispatchItems(newItems)
                                    }}
                                    min={0}
                                    className="w-16 px-1 py-1 border rounded text-center text-sm"
                                  />
                                  <select
                                    className="text-xs border rounded p-1"
                                    value={item.dispense_unit}
                                    onChange={(e) => {
                                      const newItems = [...dispatchItems]
                                      newItems[idx].dispense_unit = e.target.value
                                      setDispatchItems(newItems)
                                    }}
                                  >
                                    <option value={item.unit_of_measure}>{item.unit_of_measure}</option>
                                    <option value="unidades">unidades</option>
                                    {PACKAGE_UNITS.map(u => u !== item.unit_of_measure && <option key={u} value={u}>{u}</option>)}
                                  </select>
                                </div>
                                {isDecimal && (
                                  <p className="text-[10px] text-purple-600 leading-none">
                                    = {consumed.toFixed(3)} {item.unit_of_measure} (stock)
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de quién recibe:</label>
                      <input
                        type="text"
                        value={receivedByName}
                        onChange={(e) => setReceivedByName(e.target.value)}
                        placeholder="Nombre completo"
                        className="input-base w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Notas de entrega:</label>
                      <textarea
                        value={dispatchNotes}
                        onChange={(e) => setDispatchNotes(e.target.value)}
                        placeholder="Ej: Entrega parcial por falta de stock..."
                        rows={2}
                        className="input-base w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-semibold text-gray-700">Firma Digital:</label>
                      <button onClick={clearSignature} className="text-xs text-blue-600 hover:underline">Limpiar</button>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={150}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full cursor-crosshair touch-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-3 justify-end">
                  <Button onClick={() => setShowDispatchModal(null)} variant="secondary">Cancelar</Button>
                  <Button
                    onClick={handleConfirmDispatch}
                    variant="primary"
                    disabled={updatingId === showDispatchModal || !hasSignature || !receivedByName.trim()}
                  >
                    {updatingId === showDispatchModal ? 'Procesando...' : 'Confirmar Entrega'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
