import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
    getExpressOrderById,
    sendExpressOrderToReview,
    confirmExpressOrderAmounts,
    approveOrder,
    rejectOrder,
    uploadExpressOrderInvoice,
    deleteExpressOrderInvoice,
    updateExpressOrderFiles,
    uploadExpressOrderQuotation,
    updateExpressOrderQuotations,
    uploadExpressOrderSignature,
    confirmExpressOrderDelivery
} from '@/services/supabaseClient'
import { generateExpressOrderPDF, generateExpressOrderDeliveryPDF } from '@/utils/pdfGenerator'
import { toast } from 'react-hot-toast'
import {
    ArrowLeft, CheckCircle, XCircle, Clock,
    Printer, Send, Upload, Trash2, FileText, Paperclip, AlertTriangle
} from 'lucide-react'

export default function ExpressOrderDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuthStore()

    const [order, setOrder] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('info')

    // Confirmation State
    const [confirmingAmounts, setConfirmingAmounts] = useState(false)
    const [realItems, setRealItems] = useState<any[]>([])
    const [realTotal, setRealTotal] = useState(0)

    // Actions State
    const [processing, setProcessing] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [showRejectModal, setShowRejectModal] = useState(false)

    // Files State
    const [uploadingFile, setUploadingFile] = useState(false)
    const [invoiceFiles, setInvoiceFiles] = useState<string[]>([])
    const [quotationFiles, setQuotationFiles] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Delivery Signature State
    const [showSignatureModal, setShowSignatureModal] = useState(false)
    const [deliveryReceivedBy, setDeliveryReceivedBy] = useState('')
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)

    const isJefeCompras = user?.role === 'jefe_compras'
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
    const canManage = isJefeCompras || isAdmin

    // Roles for approval
    const canApprove = (role: string) => user?.role === role

    useEffect(() => {
        if (id) loadOrder()
    }, [id])

    const loadOrder = async () => {
        try {
            setLoading(true)
            const data = await getExpressOrderById(id!)
            setOrder(data)

            // Init files from order
            setInvoiceFiles(data?.receipt_files || [])
            setQuotationFiles(data?.quotation_files || [])

            // Init real items state
            if (data && data.items) {
                setRealItems(data.items.map((i: any) => ({
                    ...i,
                    real_unit_price: i.real_unit_price || i.estimated_unit_price,
                    real_subtotal: i.real_subtotal || i.estimated_subtotal
                })))
            }

            // Init delivery name if available
            if (data?.creator && !deliveryReceivedBy) {
                setDeliveryReceivedBy(data.creator.full_name)
            }
        } catch (error) {
            console.error('Error loading order:', error)
            toast.error('Error al cargar la orden')
        } finally {
            setLoading(false)
        }
    }

    // Real amounts calculation
    useEffect(() => {
        const total = realItems.reduce((sum, i) => sum + (Number(i.real_subtotal) || 0), 0)
        setRealTotal(total)
    }, [realItems])

    const handleRealItemChange = (itemId: string, field: 'qty' | 'price', value: number) => {
        setRealItems(prev => prev.map(item => {
            if (item.id !== itemId) return item

            const updates: any = {}
            if (field === 'price') {
                updates.real_unit_price = value
                updates.real_subtotal = item.quantity * value
            }
            return { ...item, ...updates }
        }))
    }

    // --- FILE UPLOAD ---

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        const isQuotation = activeTab === 'quotations'
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        const maxSize = 10 * 1024 * 1024 // 10MB

        try {
            setUploadingFile(true)

            for (const file of Array.from(files)) {
                if (!allowedTypes.includes(file.type)) {
                    toast.error(`${file.name}: Solo se aceptan JPG, PNG, WebP o PDF`)
                    continue
                }
                if (file.size > maxSize) {
                    toast.error(`${file.name}: Máximo 10MB por archivo`)
                    continue
                }

                const url = isQuotation
                    ? await uploadExpressOrderQuotation(order.id, file)
                    : await uploadExpressOrderInvoice(order.id, file)

                if (isQuotation) {
                    setQuotationFiles(prev => {
                        const updated = [...prev, url]
                        updateExpressOrderQuotations(order.id, updated)
                        return updated
                    })
                } else {
                    setInvoiceFiles(prev => {
                        const updated = [...prev, url]
                        updateExpressOrderFiles(order.id, updated)
                        return updated
                    })
                }
                toast.success(`${file.name} subido correctamente`)
            }
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('Error al subir archivo')
        } finally {
            setUploadingFile(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleDeleteFile = async (url: string) => {
        if (!window.confirm('¿Eliminar este archivo?')) return
        try {
            await deleteExpressOrderInvoice(url)
            const isQuotation = quotationFiles.includes(url)

            if (isQuotation) {
                const updated = quotationFiles.filter(f => f !== url)
                setQuotationFiles(updated)
                await updateExpressOrderQuotations(order.id, updated)
            } else {
                const updated = invoiceFiles.filter(f => f !== url)
                setInvoiceFiles(updated)
                await updateExpressOrderFiles(order.id, updated)
            }
            toast.success('Archivo eliminado')
        } catch (error) {
            toast.error('Error al eliminar archivo')
        }
    }

    // --- SIGNATURE DRAWING ---
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true)
        draw(e)
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d')
            ctx?.beginPath()
        }
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !canvasRef.current) return
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const rect = canvas.getBoundingClientRect()
        let x, y
        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left
            y = e.touches[0].clientY - rect.top
        } else {
            x = (e as React.MouseEvent).clientX - rect.left
            y = (e as React.MouseEvent).clientY - rect.top
        }

        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.strokeStyle = '#000'

        ctx.lineTo(x, y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x, y)
    }

    const clearCanvas = () => {
        if (!canvasRef.current) return
        const ctx = canvasRef.current.getContext('2d')
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }

    const handleSaveSignature = async () => {
        if (!canvasRef.current || !deliveryReceivedBy) {
            toast.error('Debe ingresar su nombre y firmar')
            return
        }

        try {
            setProcessing(true)
            const signatureUrl = await uploadExpressOrderSignature(order.id, canvasRef.current.toDataURL())
            await confirmExpressOrderDelivery({
                orderId: order.id,
                receivedByName: deliveryReceivedBy,
                signatureUrl
            })
            toast.success('Entrega confirmada exitosamente')
            setShowSignatureModal(false)
            await loadOrder()
        } catch (error) {
            toast.error('Error al guardar firma')
        } finally {
            setProcessing(false)
        }
    }

    const getFileName = (url: string) => {
        try {
            const parts = url.split('/')
            const last = parts[parts.length - 1]
            const withoutTimestamp = last.replace(/^\d+_/, '')
            return decodeURIComponent(withoutTimestamp)
        } catch {
            return 'archivo'
        }
    }

    const handleDownloadDeliveryPDF = () => {
        if (!order || !order.delivered_signature_url) {
            toast.error('No hay constancia de entrega disponible')
            return
        }
        toast('Generando Constancia...', { icon: '📄' })
        generateExpressOrderDeliveryPDF(order)
    }

    // --- ACTIONS ---

    const handleSendToReview = async () => {
        if (quotationFiles.length === 0) {
            toast.error('Debe adjuntar al menos una cotización antes de enviar a revisión')
            setActiveTab('quotations')
            return
        }
        if (!window.confirm('¿Enviar esta orden a revisión de las 3 jefaturas?')) return
        try {
            setProcessing(true)
            await sendExpressOrderToReview(order.id)
            toast.success('Orden enviada a revisión')
            await loadOrder()
        } catch (error) {
            toast.error('Error al enviar a revisión')
        } finally {
            setProcessing(false)
        }
    }

    const handleApprove = async (approvalId: string) => {
        try {
            setProcessing(true)
            await approveOrder(approvalId, user!.id)
            toast.success('Aprobación registrada')
            await loadOrder()
        } catch (error) {
            toast.error('Error al aprobar')
        } finally {
            setProcessing(false)
        }
    }

    const handleReject = async () => {
        if (!rejectReason) return toast.error('Ingrese motivo')
        const myApproval = order.approvals.find((a: any) => a.approver_role === user?.role && a.status === 'pending')
        if (!myApproval) return

        try {
            setProcessing(true)
            await rejectOrder(myApproval.id, user!.id, rejectReason)
            toast.success('Orden rechazada')
            setShowRejectModal(false)
            await loadOrder()
        } catch (error) {
            toast.error('Error al rechazar')
        } finally {
            setProcessing(false)
        }
    }

    const handleConfirmAmounts = async () => {
        if (!order) return
        const diff = realTotal - order.estimated_total
        const diffPerc = (diff / order.estimated_total) * 100

        try {
            setProcessing(true)
            await confirmExpressOrderAmounts(order.id, {
                real_total: realTotal,
                difference_amount: diff,
                difference_percentage: diffPerc,
                difference_justification: Math.abs(diff) > 0 ? 'Ajuste final de compra' : undefined,
                items: realItems.map(i => ({
                    id: i.id,
                    real_unit_price: i.real_unit_price,
                    real_subtotal: i.real_subtotal
                }))
            })
            toast.success('Montos confirmados y orden completada')
            setConfirmingAmounts(false)
            await loadOrder()
        } catch (error) {
            toast.error('Error al confirmar montos')
        } finally {
            setProcessing(false)
        }
    }

    const handlePrint = () => {
        toast('Generando PDF...', { icon: '🖨️' })
        generateExpressOrderPDF(order)
    }

    if (loading || !order) return <div className="p-10 text-center text-gray-500 font-medium">Cargando detalles de la orden...</div>

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800 border-green-200'
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
            case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'completed': return 'bg-purple-100 text-purple-800 border-purple-200'
            case 'delivered': return 'bg-teal-100 text-teal-800 border-teal-200'
            default: return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const tabs = ['info', 'items', 'quotations', 'invoices', 'approvals']
    const tabLabels: Record<string, string> = {
        info: 'Información General',
        items: `Artículos (${order.items?.length || 0})`,
        quotations: `Cotizaciones (${quotationFiles.length})`,
        invoices: `Facturas (${invoiceFiles.length})`,
        approvals: 'Aprobaciones'
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard/express-orders')} className="btn-icon">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            Orden {order.order_number}
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                                {order.status.replace('_', ' ')}
                            </span>
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Creada por {order.creator?.full_name || 'Usuario'} • {new Date(order.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
                        <Printer size={18} /> Imprimir PO
                    </button>

                    {order.status === 'draft' && canManage && (
                        <button
                            onClick={handleSendToReview}
                            disabled={processing}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Send size={18} /> Enviar a Revisión
                        </button>
                    )}

                    {order.status === 'approved' && canManage && !confirmingAmounts && (
                        <button
                            onClick={() => setConfirmingAmounts(true)}
                            className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                            <CheckCircle size={18} /> Registrar Compra
                        </button>
                    )}

                    {order.status === 'completed' && (
                        <>
                            {!order.delivered_signature_url ? (
                                <button
                                    onClick={() => setShowSignatureModal(true)}
                                    className="btn-primary flex items-center gap-2 bg-purple-600 hover:bg-purple-700 font-bold"
                                >
                                    <CheckCircle size={18} /> Registrar Entrega
                                </button>
                            ) : (
                                <button
                                    onClick={handleDownloadDeliveryPDF}
                                    className="btn-secondary flex items-center gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 font-bold"
                                >
                                    <Printer size={18} /> Constancia de Entrega
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-6">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === tab
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {(tab === 'invoices' || tab === 'quotations') && <Paperclip size={14} />}
                            {tabLabels[tab]}
                            {tab === 'quotations' && quotationFiles.length === 0 && order.status === 'draft' && (
                                <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content area */}
            <div className="mt-6">
                {/* INFO TAB */}
                {activeTab === 'info' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card p-6 bg-white shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Resumen Económico</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Presupuesto Estimado</span>
                                    <span className="font-bold text-lg text-gray-700">Q {order.estimated_total?.toLocaleString()}</span>
                                </div>
                                {order.real_total && (
                                    <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <span className="text-blue-700 font-bold">Inversión Real Final</span>
                                        <span className="font-black text-xl text-blue-800">Q {order.real_total?.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <p className="text-xs text-gray-400 font-bold uppercase mb-1 tracking-wider">Método de Pago</p>
                                        <p className="capitalize font-bold text-gray-700">{order.payment_method}</p>
                                    </div>
                                    {order.cheque_number && (
                                        <div>
                                            <p className="text-xs text-gray-400 font-bold uppercase mb-1 tracking-wider">Cheque No.</p>
                                            <p className="font-bold text-gray-700">{order.cheque_number}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="card p-6 bg-white shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Justificación y Destino</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1 tracking-wider">Motivo de Compra</p>
                                    <p className="text-gray-700 italic leading-relaxed">"{order.justification}"</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1 tracking-wider">Departamento / Centro de Costos</p>
                                    <p className="font-bold text-gray-800">{order.department || 'No especificado'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ITEMS TAB */}
                {activeTab === 'items' && (
                    <div className="card bg-white shadow-sm overflow-hidden border border-gray-100 rounded-xl">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">#</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Descripción</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Proveedor</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Est. Unit</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Est. Total</th>
                                        {(confirmingAmounts || order.real_total) && (
                                            <>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50/50">Real Unit</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50/50">Real Total</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {(confirmingAmounts ? realItems : (order.items || [])).map((item: any, idx: number) => (
                                        <tr key={item.id || idx} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-400 font-bold">{idx + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-gray-800">{item.description}</div>
                                                <div className="text-xs text-gray-500 font-medium">{item.quantity} {item.unit}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 font-medium">{item.supplier_name || 'N/A'}</td>
                                            <td className="px-6 py-4 text-right text-sm text-gray-500 tabular-nums">Q {item.estimated_unit_price?.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-sm font-black text-gray-700 tabular-nums">
                                                Q {(item.quantity * item.estimated_unit_price)?.toLocaleString()}
                                            </td>

                                            {confirmingAmounts && (
                                                <td className="px-6 py-4 text-right bg-blue-50/20">
                                                    <input
                                                        type="number"
                                                        className="input-sm w-28 text-right border-blue-200 focus:ring-blue-500 font-bold text-blue-700"
                                                        value={item.real_unit_price}
                                                        onChange={(e) => handleRealItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                                                        step="0.01"
                                                    />
                                                </td>
                                            )}

                                            {(confirmingAmounts || order.real_total) && (
                                                <td className="px-6 py-4 text-right text-sm font-black text-blue-700 tabular-nums bg-blue-50/20">
                                                    Q {(item.real_subtotal || (item.quantity * (item.real_unit_price || 0)))?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50/80">
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Total Estimado PO:</td>
                                        <td className="px-6 py-4 text-right font-black text-gray-800 text-lg tabular-nums">Q {order.estimated_total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        {(confirmingAmounts || order.real_total) && <td colSpan={2} className="bg-blue-100/30"></td>}
                                    </tr>
                                    {(confirmingAmounts || order.real_total) && (
                                        <tr className="bg-blue-600 text-white">
                                            <td colSpan={confirmingAmounts ? 6 : 5} className="px-6 py-4 text-right font-black uppercase text-[10px] tracking-widest">Total Real Ejecutado:</td>
                                            <td className="px-6 py-4 text-right font-black text-xl tabular-nums shadow-inner">
                                                Q {(confirmingAmounts ? realTotal : order.real_total)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )}
                                </tfoot>
                            </table>
                        </div>

                        {confirmingAmounts && (
                            <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
                                <p className="text-sm text-gray-500 font-medium italic">
                                    * Ingrese los precios unitarios que aparecen en la factura final.
                                </p>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setConfirmingAmounts(false)}
                                        className="btn-secondary px-8"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirmAmounts}
                                        disabled={processing || invoiceFiles.length === 0}
                                        className="btn-primary bg-blue-600 px-8 flex items-center gap-2 shadow-lg shadow-blue-100"
                                    >
                                        {processing ? 'Guardando...' : <><CheckCircle size={18} /> Finalizar Registro de Compra</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* QUOTATIONS TAB */}
                {activeTab === 'quotations' && (
                    <div className="space-y-6">
                        {order.status === 'draft' && canManage && (
                            <div className="card bg-white p-6 shadow-sm border-l-4 border-blue-500 rounded-2xl">
                                <h3 className="font-black text-gray-800 mb-2 flex items-center gap-2 uppercase text-xs tracking-widest">
                                    <Paperclip size={18} className="text-blue-500" /> Adjuntar Cotización Referencial
                                </h3>
                                <p className="text-sm text-gray-500 mb-6 font-medium">
                                    Es indispensable subir el documento de cotización para que las jefaturas puedan validar y aprobar el gasto.
                                </p>
                                <div
                                    className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {uploadingFile ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-sm text-gray-500 font-black">SUBIENDO ARCHIVO...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload size={40} className="text-gray-300 group-hover:text-blue-500 transition-colors mb-2" />
                                            <span className="text-sm font-black text-gray-600 uppercase tracking-widest">Seleccionar Cotización</span>
                                            <span className="text-[10px] text-gray-400 font-bold">FORMATOS: PDF, JPG, PNG (MAX. 10MB)</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="card bg-white p-6 shadow-sm rounded-2xl border border-gray-100">
                            <h3 className="font-black text-gray-800 mb-6 flex items-center justify-between border-b pb-4">
                                <span className="flex items-center gap-2 uppercase text-xs tracking-widest px-1"><FileText size={18} className="text-blue-500" /> Documentos de Respaldo</span>
                                <span className="text-[10px] bg-gray-100 px-3 py-1 rounded-full text-gray-500 font-black">{quotationFiles.length} ARCHIVOS</span>
                            </h3>
                            {quotationFiles.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                                    <Paperclip size={60} className="mx-auto mb-4 text-gray-200" />
                                    <p className="font-bold text-gray-400 uppercase text-xs tracking-widest">No se han adjuntado documentos</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {quotationFiles.map((url, idx) => (
                                        <div key={idx} className="flex flex-col p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-xl transition-all group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-1">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            </div>
                                            <div className="flex items-center gap-4 mb-5 overflow-hidden">
                                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-black text-gray-700 truncate block uppercase tracking-tight">{getFileName(url)}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Documento de Cotización</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-[10px] font-black hover:text-blue-800 transition-colors uppercase tracking-widest">Visualizar</a>
                                                {order.status === 'draft' && canManage && (
                                                    <button onClick={() => handleDeleteFile(url)} className="text-gray-300 hover:text-red-500 transition-colors" title="Eliminar">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* INVOICES TAB */}
                {activeTab === 'invoices' && (
                    <div className="space-y-6">
                        {order.status === 'approved' && canManage && (
                            <div className="card bg-amber-50 p-6 border border-amber-200 rounded-2xl shadow-sm">
                                <div className="flex gap-4">
                                    <div className="p-3 bg-amber-100 text-amber-600 rounded-xl h-fit">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-amber-900 mb-1 uppercase text-xs tracking-widest">Paso Final: Registro de Factura Original</h3>
                                        <p className="text-sm text-amber-800 mb-4 font-medium leading-relaxed">
                                            Una vez realizada la compra en el establecimiento, debe cargar el comprobante legal (Factura o Recibo) y actualizar los precios reales para cerrar la orden.
                                        </p>
                                        {!confirmingAmounts && (
                                            <button
                                                onClick={() => setConfirmingAmounts(true)}
                                                className="btn-primary bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200 border-none font-black text-[10px] tracking-widest px-6"
                                            >
                                                INICIAR CIERRE DE COMPRA
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {((order.status === 'approved' && confirmingAmounts) || order.status === 'draft') && canManage && (
                            <div className="card bg-white p-6 shadow-sm border-l-4 border-teal-500 rounded-2xl border border-gray-100">
                                <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
                                    <Upload size={18} className="text-teal-500" /> Cargar Factura Final de Compra
                                </h3>
                                <div
                                    className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center hover:border-teal-400 hover:bg-teal-50/30 transition-all cursor-pointer group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {uploadingFile ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest mt-2">Cargando Factura...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-4 bg-teal-50 rounded-full text-teal-400 group-hover:bg-teal-100 transition-all mb-2">
                                                <Upload size={40} />
                                            </div>
                                            <span className="text-sm font-black text-gray-600 uppercase tracking-widest">Elegir Archivo Digital</span>
                                            <span className="text-[10px] text-gray-400 font-bold">Suba una imagen clara o PDF de la factura</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="card bg-white p-6 shadow-sm rounded-2xl border border-gray-100">
                            <h3 className="font-black text-gray-800 mb-6 flex items-center justify-between border-b pb-4">
                                <span className="flex items-center gap-2 uppercase text-xs tracking-widest px-1"><Paperclip size={18} className="text-teal-500" /> Archivos de Facturación</span>
                                <span className="text-[10px] bg-teal-50 px-3 py-1 rounded-full text-teal-600 font-black">{invoiceFiles.length} REGISTROS</span>
                            </h3>

                            {invoiceFiles.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                                    <FileText size={60} className="mx-auto mb-4 text-gray-200" />
                                    <p className="font-bold text-gray-400 uppercase text-xs tracking-widest">Sin facturas registradas</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {invoiceFiles.map((url, idx) => (
                                        <div key={idx} className="flex flex-col p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-xl transition-all border-l-4 border-l-teal-500 shadow-sm group">
                                            <div className="flex items-center gap-4 mb-5 overflow-hidden">
                                                <div className="p-3 bg-teal-50 text-teal-600 rounded-xl group-hover:bg-teal-500 group-hover:text-white transition-colors">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-black text-gray-700 truncate block uppercase tracking-tight">{getFileName(url)}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Firma de Registro: {new Date().toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-teal-600 text-[10px] font-black hover:text-teal-800 transition-colors uppercase tracking-widest">DESCARGAR</a>
                                                {(order.status === 'draft' || confirmingAmounts) && canManage && (
                                                    <button onClick={() => handleDeleteFile(url)} className="text-gray-300 hover:text-red-500 transition-colors" title="Eliminar">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* APPROVALS TAB */}
                {activeTab === 'approvals' && (
                    <div className="space-y-6">
                        {/* Delivery Detail Panel */}
                        {order.status === 'completed' && order.delivered_at && (
                            <div className="card bg-gradient-to-br from-purple-50 to-white p-8 border border-purple-100 rounded-3xl shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                                    <CheckCircle size={150} className="text-purple-600" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-200">
                                            <Printer size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-purple-950 text-xl tracking-tight">Constancia de Entrega Final</h3>
                                            <p className="text-purple-600 text-xs font-bold uppercase tracking-widest">Documento de Recepción Conforme</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entregado a:</label>
                                                <p className="text-lg font-black text-gray-800 capitalize leading-none">{order.delivered_to_name}</p>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha de Recepción:</label>
                                                <p className="text-md font-bold text-gray-700">{new Date(order.delivered_at).toLocaleString('es-GT', { dateStyle: 'long', timeStyle: 'short' })}</p>
                                            </div>
                                            <div className="pt-4">
                                                <button
                                                    onClick={handleDownloadDeliveryPDF}
                                                    className="btn-primary bg-purple-600 hover:bg-purple-700 w-full py-4 shadow-xl shadow-purple-100 flex items-center justify-center gap-4 font-black text-xs tracking-widest"
                                                >
                                                    <Printer size={20} /> DESCARGAR PDF DE ENTREGA
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center bg-white/50 p-6 rounded-3xl border border-purple-50">
                                            <p className="text-[10px] font-black text-purple-700 mb-4 uppercase tracking-[0.2em]">Firma de Conformidad</p>
                                            <div className="bg-white p-4 rounded-2xl border-2 border-purple-100 shadow-inner w-full flex items-center justify-center min-h-[140px]">
                                                <img
                                                    src={order.delivered_signature_url}
                                                    alt="Firma del Receptor"
                                                    className="max-h-32 w-auto grayscale hover:grayscale-0 transition-all cursor-zoom-in"
                                                    onClick={() => window.open(order.delivered_signature_url, '_blank')}
                                                />
                                            </div>
                                            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                                                <CheckCircle size={12} className="text-green-500" /> Identidad Verificada Digitalmente
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="card bg-white p-8 shadow-sm rounded-3xl border border-gray-100">
                            <h3 className="font-black text-gray-800 mb-8 flex items-center justify-between border-b pb-4">
                                <span className="uppercase text-xs tracking-widest flex items-center gap-2"><Clock size={18} className="text-blue-500" /> Trazabilidad de Aprobaciones</span>
                                <span className="text-[10px] font-bold text-gray-400 italic">Validación obligatoria por triplicado</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {['jefe_presupuesto', 'jefe_operaciones', 'jefe_calidad'].map((role) => {
                                    const approval = order.approvals?.find((a: any) => a.approver_role === role)
                                    const status = approval?.status || 'pending'
                                    const isPending = status === 'pending'
                                    const canAction = canApprove(role) && isPending && order.status === 'pending_approval'

                                    return (
                                        <div key={role} className={`flex flex-col p-6 rounded-3xl border transition-all ${status === 'approved' ? 'bg-green-50/50 border-green-100' :
                                                status === 'rejected' ? 'bg-red-50/50 border-red-100' :
                                                    'bg-gray-50/50 border-gray-100'
                                            }`}>
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md mb-6 ${status === 'approved' ? 'bg-green-600 text-white' :
                                                    status === 'rejected' ? 'bg-red-600 text-white' :
                                                        'bg-white text-gray-300 border border-gray-50'
                                                }`}>
                                                {status === 'approved' ? <CheckCircle size={30} /> :
                                                    status === 'rejected' ? <XCircle size={30} /> :
                                                        <Clock size={30} />}
                                            </div>

                                            <p className="font-black text-gray-900 capitalize text-sm mb-1 tracking-tight">{role.replace(/_/g, ' ')}</p>
                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-4">
                                                {status === 'approved' ? <span className="text-green-600">APROBADO</span> :
                                                    status === 'rejected' ? <span className="text-red-600">RECHAZADO</span> :
                                                        <span className="text-gray-400">PENDIENTE</span>}
                                            </p>

                                            {status === 'approved' && (
                                                <p className="text-[10px] text-gray-500 font-bold mb-4">FECHA: {new Date(approval.approved_at).toLocaleDateString()}</p>
                                            )}

                                            {status === 'rejected' && (
                                                <div className="mt-2 bg-white/80 p-3 rounded-xl border border-red-50 shadow-sm shrink-0">
                                                    <p className="text-[10px] text-red-800 leading-tight leading-relaxed font-medium"><span className="font-black">OBSERVACIÓN:</span> {approval.comments}</p>
                                                </div>
                                            )}

                                            {canAction && (
                                                <div className="flex flex-col gap-3 mt-auto pt-6">
                                                    <button
                                                        onClick={() => handleApprove(approval.id)}
                                                        className="w-full py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-100 transition-all font-black text-[10px] tracking-widest"
                                                    >
                                                        APROBAR GASTO
                                                    </button>
                                                    <button
                                                        onClick={() => setShowRejectModal(true)}
                                                        className="w-full py-3 rounded-xl bg-white text-red-600 hover:bg-red-50 border border-red-200 transition-all font-black text-[10px] tracking-widest"
                                                    >
                                                        RECHAZAR PO
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden generic file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                className="hidden"
                onChange={handleFileUpload}
            />

            {/* Modal: REJECT */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white p-10 rounded-[2.5rem] max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300 border border-red-50">
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                                <AlertTriangle size={40} />
                            </div>
                            <h3 className="font-black text-3xl text-gray-900 tracking-tight">Rechazar Orden</h3>
                            <p className="text-sm text-gray-500 mt-2 font-medium">Debe explicar detalladamente el motivo por el cual no procede esta compra express.</p>
                        </div>

                        <div className="space-y-6">
                            <textarea
                                className="input-base w-full border-gray-100 focus:ring-red-500 bg-gray-50/50 p-6 rounded-3xl min-h-[160px] text-gray-800 font-medium placeholder:text-gray-300 shadow-inner"
                                placeholder="Escriba aquí sus comentarios..."
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowRejectModal(false)}
                                    className="btn-secondary py-4 rounded-3xl font-black text-[10px] tracking-[0.2em] border-2 hover:bg-gray-100"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={processing || !rejectReason}
                                    className="btn-primary bg-red-600 hover:bg-red-700 py-4 rounded-3xl shadow-2xl shadow-red-100 font-black text-[10px] tracking-[0.2em] transition-transform active:scale-95 disabled:opacity-50"
                                >
                                    {processing ? 'ENVIANDO...' : 'CONFIRMAR'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: SIGNATURE / DELIVERY */}
            {showSignatureModal && (
                <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 backdrop-blur-xl">
                    <div className="bg-white p-10 rounded-[3rem] max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-500 border border-purple-100 relative">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <p className="text-purple-600 font-black text-[10px] tracking-[0.3em] uppercase mb-1">Cierre de Proceso</p>
                                <h3 className="text-3xl font-black text-gray-950 tracking-tight">Confirmar Entrega</h3>
                            </div>
                            <button
                                onClick={() => setShowSignatureModal(false)}
                                className="text-gray-300 hover:text-gray-900 transition-all p-3 hover:bg-gray-100 rounded-3xl"
                            >
                                <XCircle size={32} />
                            </button>
                        </div>

                        <div className="space-y-10">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">
                                    Nombre del Responsable que Recibe
                                </label>
                                <input
                                    type="text"
                                    className="input-base w-full border-gray-100 focus:ring-purple-500 bg-gray-50/50 p-5 rounded-[1.5rem] text-gray-900 font-black text-lg placeholder:font-medium placeholder:text-gray-300 shadow-inner"
                                    placeholder="Nombre completo"
                                    value={deliveryReceivedBy}
                                    onChange={e => setDeliveryReceivedBy(e.target.value)}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-4 px-1">
                                    <label className="block text-[10px] font-black text-purple-700 uppercase tracking-[0.2em]">
                                        Firma del Profesor / Encargado
                                    </label>
                                    <button
                                        type="button"
                                        onClick={clearCanvas}
                                        className="text-[9px] font-black text-red-600 bg-red-50 px-4 py-2 rounded-2xl border border-red-100 hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest shadow-sm"
                                    >
                                        Limpiar Firma
                                    </button>
                                </div>
                                <div className="border-4 border-gray-50 rounded-[2.5rem] overflow-hidden bg-white shadow-2xl relative group ring-1 ring-gray-100">
                                    <canvas
                                        ref={canvasRef}
                                        width={450}
                                        height={220}
                                        className="w-full h-auto cursor-crosshair touch-none relative z-10"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                                        <div className="text-6xl font-black rotate-[-12deg] select-none uppercase tracking-tighter">CONSTANCIA</div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-6 text-center font-black tracking-widest uppercase flex items-center justify-center gap-2">
                                    <div className="w-8 h-[1px] bg-gray-100"></div>
                                    Use su dispositivo para firmar
                                    <div className="w-8 h-[1px] bg-gray-100"></div>
                                </p>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setShowSignatureModal(false)}
                                    className="btn-secondary flex-1 py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] border-2 border-gray-100 hover:bg-gray-100"
                                >
                                    VOLVER
                                </button>
                                <button
                                    onClick={handleSaveSignature}
                                    disabled={processing || !deliveryReceivedBy}
                                    className="btn-primary flex-1 py-5 bg-purple-700 hover:bg-purple-900 shadow-2xl shadow-purple-200 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] transition-all transform active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
                                >
                                    {processing ? 'PROCESANDO...' : <><CheckCircle size={18} /> CONFIRMAR Y FINALIZAR</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
